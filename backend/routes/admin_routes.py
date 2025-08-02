from flask import Blueprint, request, jsonify
from functools import wraps
from extensions import mongo
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId # For converting string ID to MongoDB ObjectId
from datetime import datetime, timedelta
from utils.database import DatabaseUtils, query_cache
import calendar

admin_bp = Blueprint('admin_bp', __name__)

# --- Helper for Role-Based Access Control ---
def role_required(role_name):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user = get_jwt_identity()
            if current_user.get('role') != role_name:
                return jsonify({"message": "Unauthorized: Insufficient role permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# --- Dashboard Stats Endpoint ---
@admin_bp.route('/dashboard/stats', methods=['GET'])
@role_required('admin')
def get_dashboard_stats():
    """Get dashboard statistics for admin panel."""
    try:
        # Count total courses
        total_courses = mongo.db.courses.count_documents({})
        
        # Count total students
        total_students = mongo.db.users.count_documents({"role": "student"})
        
        # Count total teachers
        total_teachers = mongo.db.users.count_documents({"role": "teacher"})
        
        # Count total enrollments
        total_enrollments = mongo.db.enrollments.count_documents({})
        
        stats = {
            "total_courses": total_courses,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_enrollments": total_enrollments
        }
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve dashboard stats", "error": str(e)}), 500

# --- Course Management Endpoints ---

@admin_bp.route('/courses', methods=['POST'])
@role_required('admin')
def create_course():
    data = request.get_json()
    # Basic validation (more comprehensive validation can be added)
    required_fields = ['course_code', 'course_name', 'credits', 'department', 'max_capacity', 'semester', 'year']
    if not all(field in data for field in required_fields):
        return jsonify({"message": "Missing required course fields"}), 400

    if mongo.db.courses.find_one({"course_code": data['course_code']}):
        return jsonify({"message": f"Course with code {data['course_code']} already exists"}), 409

    new_course = {
        "course_code": data['course_code'],
        "course_name": data['course_name'],
        "description": data.get('description', ""),
        "teacher_id": None, # Initially unassigned or can be assigned here if provided
        "credits": int(data['credits']),
        "department": data['department'],
        "max_capacity": int(data['max_capacity']),
        "current_enrollment": 0,
        "semester": data['semester'],
        "year": int(data['year']),
        "schedule_info": data.get('schedule_info', ""),
        "assignments": [],
        "quizzes": [],
        "feedback": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    try:
        result = mongo.db.courses.insert_one(new_course)
        # Get the created course and serialize it
        created_course = mongo.db.courses.find_one({"_id": result.inserted_id})
        serialized_course = DatabaseUtils.serialize_doc(created_course)
        return jsonify({"message": "Course created successfully", "course": serialized_course}), 201
    except Exception as e:
        return jsonify({"message": "Failed to create course", "error": str(e)}), 500

@admin_bp.route('/courses', methods=['GET'])
@role_required('admin') # Or allow teachers/students to view all courses too
def get_all_courses():
    """Get all courses with pagination support."""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        department = request.args.get('department')
        sort_field = request.args.get('sort', 'created_at')
        sort_direction = -1 if request.args.get('order', 'desc') == 'desc' else 1
        
        # Build query
        query = {}
        if department:
            query['department'] = department
        
        # Use pagination utility
        result = DatabaseUtils.paginate_query(
            'courses', 
            query=query, 
            page=page, 
            per_page=per_page,
            sort_field=sort_field,
            sort_direction=sort_direction
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve courses", "error": str(e)}), 500

@admin_bp.route('/courses/<string:course_id>', methods=['GET'])
@role_required('admin') # Or allow teachers/students
def get_course_by_id(course_id):
    try:
        course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
        if course:
            serialized_course = DatabaseUtils.serialize_doc(course)
            return jsonify(serialized_course), 200
        else:
            return jsonify({"message": "Course not found"}), 404
    except Exception as e:
        return jsonify({"message": "Failed to retrieve course", "error": str(e)}), 500

@admin_bp.route('/courses/<string:course_id>', methods=['PUT'])
@role_required('admin')
def update_course(course_id):
    data = request.get_json()
    update_fields = {k: v for k, v in data.items() if k not in ['_id', 'course_code', 'current_enrollment']}
    if not update_fields:
        return jsonify({"message": "No update fields provided"}), 400

    # Deserialize ObjectId fields if present
    update_fields = DatabaseUtils.deserialize_objectids(update_fields, ['teacher_id'])
    update_fields["updated_at"] = datetime.utcnow()

    try:
        result = mongo.db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            return jsonify({"message": "Course not found"}), 404
        if result.modified_count == 0 and result.matched_count > 0:
            return jsonify({"message": "No changes made to the course"}), 200
        
        # Return the updated course
        updated_course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
        serialized_course = DatabaseUtils.serialize_doc(updated_course)
        return jsonify({"message": "Course updated successfully", "course": serialized_course}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update course", "error": str(e)}), 500

@admin_bp.route('/courses/<string:course_id>', methods=['DELETE'])
@role_required('admin')
def delete_course(course_id):
    """Delete a course and all related data using cascade delete."""
    try:
        # Use cascade delete with proper transaction handling
        result = DatabaseUtils.cascade_delete_course(ObjectId(course_id))
        
        if result.get('course_deleted'):
            # Invalidate cache
            query_cache.invalidate_pattern('courses')
            query_cache.invalidate_pattern('enrollments')
            
            return jsonify({
                "message": "Course deleted successfully",
                "details": {
                    "enrollments_deleted": result.get('enrollments', 0),
                    "assignments_deleted": result.get('assignments', 0),
                    "assignment_submissions_deleted": result.get('assignment_submissions', 0),
                    "quizzes_deleted": result.get('quizzes', 0),
                    "quiz_submissions_deleted": result.get('quiz_submissions', 0),
                    "grades_deleted": result.get('grades', 0),
                    "attendance_deleted": result.get('attendance', 0),
                    "calendar_events_deleted": result.get('calendar_events', 0),
                    "notifications_deleted": result.get('notifications', 0)
                }
            }), 200
        else:
            return jsonify({"message": "Course not found or already deleted"}), 404
    except Exception as e:
        return jsonify({"message": "Failed to delete course", "error": str(e)}), 500

@admin_bp.route('/courses/<string:course_id>/assign-teacher', methods=['PUT'])
@role_required('admin')
def assign_teacher_to_course(course_id):
    data = request.get_json()
    teacher_id_str = data.get('teacher_id')

    if not teacher_id_str:
        return jsonify({"message": "Teacher ID is required"}), 400

    try:
        teacher_object_id = ObjectId(teacher_id_str)
    except Exception:
        return jsonify({"message": "Invalid Teacher ID format"}), 400

    # 1. Check if teacher exists and has 'teacher' role
    teacher = mongo.db.users.find_one({"_id": teacher_object_id, "role": "teacher"})
    if not teacher:
        return jsonify({"message": "Teacher not found or user is not a teacher"}), 404

    # 2. Check if course exists
    course = mongo.db.courses.find_one({"_id": ObjectId(course_id)})
    if not course:
        return jsonify({"message": "Course not found"}), 404

    # 3. Atomically update course and teacher using transactions
    def assign_teacher_operations(session):
        # Update course with new teacher_id
        mongo.db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"teacher_id": teacher_object_id, "updated_at": datetime.utcnow()}},
            session=session
        )

        # Add course to teacher's list of courses_teaching (if not already present)
        mongo.db.users.update_one(
            {"_id": teacher_object_id},
            {"$addToSet": {"courses_teaching": ObjectId(course_id)}},
            session=session
        )
        
        # If there was an old teacher, remove this course from their list
        old_teacher_id = course.get('teacher_id')
        if old_teacher_id and old_teacher_id != teacher_object_id:
            mongo.db.users.update_one(
                {"_id": old_teacher_id},
                {"$pull": {"courses_teaching": ObjectId(course_id)}},
                session=session
            )
        
        return {"teacher": teacher['username'], "course": course['course_code']}

    try:
        # Execute transaction
        result = DatabaseUtils.safe_execute_transaction([assign_teacher_operations])
        
        if result.get('success'):
            # Invalidate relevant cache entries
            query_cache.invalidate_pattern('courses')
            query_cache.invalidate_pattern('users')
            
            return jsonify({
                "message": f"Teacher {teacher['username']} assigned to course {course['course_code']}",
                "attempt": result.get('attempt', 1)
            }), 200
        else:
            return jsonify({
                "message": "Failed to assign teacher", 
                "error": result.get('error', 'Transaction failed')
            }), 500

    except Exception as e:
        return jsonify({"message": "Failed to assign teacher", "error": str(e)}), 500

# --- User Management Endpoints (Admin) ---
@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def get_users():
    """Get users with pagination and filtering support."""
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        role_filter = request.args.get('role')
        sort_field = request.args.get('sort', 'date_joined')
        sort_direction = -1 if request.args.get('order', 'desc') == 'desc' else 1
        search = request.args.get('search')
        
        # Build query
        query = {}
        if role_filter:
            if role_filter not in ['student', 'teacher', 'admin']:
                return jsonify({"message": "Invalid role specified for filtering"}), 400
            query['role'] = role_filter
        
        if search:
            # Search in username, email, first_name, last_name
            query['$or'] = [
                {'username': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}},
                {'first_name': {'$regex': search, '$options': 'i'}},
                {'last_name': {'$regex': search, '$options': 'i'}}
            ]
        
        # Use pagination utility with password exclusion
        result = DatabaseUtils.paginate_query(
            'users',
            query=query,
            page=page,
            per_page=per_page,
            sort_field=sort_field,
            sort_direction=sort_direction
        )
        
        # Remove password fields from results
        for user in result['data']:
            user.pop('password_hash', None)
            user.pop('password', None)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve users", "error": str(e)}), 500

@admin_bp.route('/users/<string:user_id>', methods=['GET'])
@role_required('admin')
def get_user_by_id(user_id):
    try:
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {'password': 0})
        if user:
            serialized_user = DatabaseUtils.serialize_doc(user)
            return jsonify(serialized_user), 200
        else:
            return jsonify({"message": "User not found"}), 404
    except Exception as e:
        return jsonify({"message": "Failed to retrieve user", "error": str(e)}), 500

@admin_bp.route('/users/<string:user_id>', methods=['PUT'])
@role_required('admin')
def update_user(user_id):
    data = request.get_json()
    
    # Don't allow updating certain fields
    restricted_fields = ['_id', 'password', 'password_hash', 'date_joined']
    update_fields = {k: v for k, v in data.items() if k not in restricted_fields}
    
    if not update_fields:
        return jsonify({"message": "No valid update fields provided"}), 400

    try:
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            return jsonify({"message": "User not found"}), 404
        if result.modified_count == 0 and result.matched_count > 0:
            return jsonify({"message": "No changes made to the user"}), 200
        
        # Return the updated user
        updated_user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {'password': 0})
        serialized_user = DatabaseUtils.serialize_doc(updated_user)
        return jsonify({"message": "User updated successfully", "user": serialized_user}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update user", "error": str(e)}), 500

@admin_bp.route('/users/<string:user_id>', methods=['DELETE'])
@role_required('admin')
def delete_user(user_id):
    """Delete a user and all related data using cascade delete."""
    try:
        # Prevent deleting the current admin user
        current_user = get_jwt_identity()
        if current_user.get('user_id') == user_id:
            return jsonify({"message": "Cannot delete your own account"}), 400
        
        # Use cascade delete with proper transaction handling
        result = DatabaseUtils.cascade_delete_user(ObjectId(user_id))
        
        if result.get('user_deleted'):
            user_role = result.get('user', {}).get('role', 'unknown')
            
            # Invalidate cache
            query_cache.invalidate_pattern('users')
            if user_role == 'student':
                query_cache.invalidate_pattern('enrollments')
                query_cache.invalidate_pattern('submissions')
                query_cache.invalidate_pattern('grades')
            elif user_role == 'teacher':
                query_cache.invalidate_pattern('courses')
            
            # Build response details
            details = {
                "user_role": user_role
            }
            
            if user_role == 'student':
                details.update({
                    "enrollments_deleted": result.get('enrollments', 0),
                    "assignment_submissions_deleted": result.get('assignment_submissions', 0),
                    "quiz_submissions_deleted": result.get('quiz_submissions', 0),
                    "grades_deleted": result.get('grades', 0)
                })
            elif user_role == 'teacher':
                details.update({
                    "courses_unassigned": result.get('courses_unassigned', 0),
                    "assigned_courses": result.get('assigned_courses', [])
                })
            
            details.update({
                "notifications_deleted": result.get('notifications', 0),
                "calendar_events_deleted": result.get('calendar_events', 0)
            })
            
            return jsonify({
                "message": "User deleted successfully",
                "details": details
            }), 200
        else:
            return jsonify({"message": "User not found or already deleted"}), 404
    except Exception as e:
        return jsonify({"message": "Failed to delete user", "error": str(e)}), 500

@admin_bp.route('/users/<string:user_id>/status', methods=['PUT'])
@role_required('admin')
def toggle_user_status(user_id):
    data = request.get_json()
    is_active = data.get('is_active')
    
    if is_active is None:
        return jsonify({"message": "is_active field is required"}), 400
    
    if not isinstance(is_active, bool):
        return jsonify({"message": "is_active must be a boolean value"}), 400
    
    try:
        result = mongo.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": is_active}}
        )
        if result.matched_count == 0:
            return jsonify({"message": "User not found"}), 404
        
        # Return the updated user
        updated_user = mongo.db.users.find_one({"_id": ObjectId(user_id)}, {'password': 0})
        serialized_user = DatabaseUtils.serialize_doc(updated_user)
        return jsonify({"message": f"User {'activated' if is_active else 'deactivated'} successfully", "user": serialized_user}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update user status", "error": str(e)}), 500

# ... any other admin user management routes like get user by ID, update user role etc. can be added here ... 

# === COMPREHENSIVE REPORTING AND ANALYTICS ===

@admin_bp.route('/reports/system-stats', methods=['GET'])
@role_required('admin')
def get_system_stats():
    """Get comprehensive system statistics."""
    try:
        # Basic counts
        total_users = mongo.db.users.count_documents({})
        total_students = mongo.db.users.count_documents({"role": "student"})
        total_teachers = mongo.db.users.count_documents({"role": "teacher"})
        total_admins = mongo.db.users.count_documents({"role": "admin"})
        total_courses = mongo.db.courses.count_documents({})
        total_enrollments = mongo.db.enrollments.count_documents({})
        total_assignments = mongo.db.assignments.count_documents({})
        total_submissions = mongo.db.assignment_submissions.count_documents({})
        total_grades = mongo.db.grades.count_documents({})
        
        # Active users (users with activity in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = mongo.db.users.count_documents({
            "last_login": {"$gte": thirty_days_ago}
        })
        
        # New users this month
        first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_users_this_month = mongo.db.users.count_documents({
            "date_joined": {"$gte": first_of_month}
        })
        
        # New enrollments this month
        new_enrollments_this_month = mongo.db.enrollments.count_documents({
            "enrollment_date": {"$gte": first_of_month}
        })
        
        stats = {
            "total_users": total_users,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_admins": total_admins,
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "total_assignments": total_assignments,
            "total_submissions": total_submissions,
            "total_grades": total_grades,
            "active_users": active_users,
            "new_users_this_month": new_users_this_month,
            "new_enrollments_this_month": new_enrollments_this_month
        }
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve system stats", "error": str(e)}), 500

@admin_bp.route('/reports/enrollment-trends', methods=['GET'])
@role_required('admin')
def get_enrollment_trends():
    """Get enrollment trends over time."""
    try:
        period = request.args.get('period', 'month')
        
        # Determine the aggregation period and date range
        if period == 'week':
            days_back = 7 * 12  # 12 weeks
            date_format = "%Y-W%U"
        elif period == 'quarter':
            days_back = 90 * 4  # 4 quarters
            date_format = "%Y-Q"
        elif period == 'year':
            days_back = 365 * 3  # 3 years
            date_format = "%Y"
        else:  # month
            days_back = 30 * 12  # 12 months
            date_format = "%Y-%m"
        
        start_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Aggregate enrollment data
        pipeline = [
            {
                "$match": {
                    "enrollment_date": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": date_format,
                            "date": "$enrollment_date"
                        }
                    },
                    "enrollments": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        enrollment_data = list(mongo.db.enrollments.aggregate(pipeline))
        
        # Get new users data
        user_pipeline = [
            {
                "$match": {
                    "date_joined": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": date_format,
                            "date": "$date_joined"
                        }
                    },
                    "new_users": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        user_data = list(mongo.db.users.aggregate(user_pipeline))
        
        # Get assignment completion data
        completion_pipeline = [
            {
                "$match": {
                    "submission_date": {"$gte": start_date},
                    "status": {"$in": ["submitted", "graded"]}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": date_format,
                            "date": "$submission_date"
                        }
                    },
                    "completed_assignments": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        completion_data = list(mongo.db.assignment_submissions.aggregate(completion_pipeline))
        
        # Combine data
        trends = {}
        for item in enrollment_data:
            trends[item['_id']] = {
                "period": item['_id'],
                "enrollments": item['enrollments'],
                "new_users": 0,
                "completed_assignments": 0
            }
        
        for item in user_data:
            if item['_id'] in trends:
                trends[item['_id']]['new_users'] = item['new_users']
            else:
                trends[item['_id']] = {
                    "period": item['_id'],
                    "enrollments": 0,
                    "new_users": item['new_users'],
                    "completed_assignments": 0
                }
        
        for item in completion_data:
            if item['_id'] in trends:
                trends[item['_id']]['completed_assignments'] = item['completed_assignments']
            elif item['_id'] not in trends:
                trends[item['_id']] = {
                    "period": item['_id'],
                    "enrollments": 0,
                    "new_users": 0,
                    "completed_assignments": item['completed_assignments']
                }
        
        result = sorted(trends.values(), key=lambda x: x['period'])
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve enrollment trends", "error": str(e)}), 500

@admin_bp.route('/reports/course-performance', methods=['GET'])
@role_required('admin')
def get_course_performance():
    """Get performance metrics for all courses."""
    try:
        department = request.args.get('department')
        
        # Build match stage
        match_stage = {}
        if department and department != 'all':
            match_stage['department'] = department
        
        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {
                "$lookup": {
                    "from": "enrollments",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "enrollments"
                }
            },
            {
                "$lookup": {
                    "from": "assignments",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "assignments"
                }
            },
            {
                "$lookup": {
                    "from": "grades",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "grades"
                }
            },
            {
                "$project": {
                    "course_code": 1,
                    "course_name": 1,
                    "department": 1,
                    "total_enrollments": {"$size": "$enrollments"},
                    "active_enrollments": {
                        "$size": {
                            "$filter": {
                                "input": "$enrollments",
                                "cond": {"$eq": ["$$this.status", "enrolled"]}
                            }
                        }
                    },
                    "total_assignments": {"$size": "$assignments"},
                    "grades": 1
                }
            },
            {
                "$addFields": {
                    "completion_rate": {
                        "$cond": {
                            "if": {"$gt": ["$total_enrollments", 0]},
                            "then": {
                                "$multiply": [
                                    {"$divide": ["$active_enrollments", "$total_enrollments"]},
                                    100
                                ]
                            },
                            "else": 0
                        }
                    },
                    "average_grade": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$grades"}, 0]},
                            "then": {"$avg": "$grades.final_percentage"},
                            "else": 0
                        }
                    }
                }
            },
            {
                "$project": {
                    "grades": 0
                }
            },
            {
                "$sort": {"total_enrollments": -1}
            }
        ]
        
        courses = list(mongo.db.courses.aggregate(pipeline))
        
        # Get submission data for each course
        for course in courses:
            if course['total_assignments'] > 0:
                assignment_ids = [
                    assignment['_id'] for assignment in 
                    mongo.db.assignments.find({"course_id": course['_id']}, {"_id": 1})
                ]
                
                submitted_count = mongo.db.assignment_submissions.count_documents({
                    "assignment_id": {"$in": assignment_ids},
                    "status": {"$in": ["submitted", "graded"]}
                })
                course['submitted_assignments'] = submitted_count
            else:
                course['submitted_assignments'] = 0
            
            # Serialize ObjectId
            course['_id'] = str(course['_id'])
        
        return jsonify(courses), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve course performance", "error": str(e)}), 500

@admin_bp.route('/reports/department-stats', methods=['GET'])
@role_required('admin')
def get_department_stats():
    """Get statistics by department."""
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$department",
                    "total_courses": {"$sum": 1},
                    "course_ids": {"$push": "$_id"}
                }
            },
            {
                "$lookup": {
                    "from": "enrollments",
                    "localField": "course_ids",
                    "foreignField": "course_id",
                    "as": "enrollments"
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "department",
                    "as": "teachers"
                }
            },
            {
                "$project": {
                    "total_courses": 1,
                    "total_students": {
                        "$size": {
                            "$filter": {
                                "input": "$enrollments",
                                "cond": {"$eq": ["$$this.status", "enrolled"]}
                            }
                        }
                    },
                    "total_teachers": {
                        "$size": {
                            "$filter": {
                                "input": "$teachers",
                                "cond": {"$eq": ["$$this.role", "teacher"]}
                            }
                        }
                    },
                    "enrollments": 1
                }
            },
            {
                "$addFields": {
                    "avg_enrollment_per_course": {
                        "$cond": {
                            "if": {"$gt": ["$total_courses", 0]},
                            "then": {"$divide": ["$total_students", "$total_courses"]},
                            "else": 0
                        }
                    }
                }
            },
            {
                "$sort": {"total_students": -1}
            }
        ]
        
        departments = list(mongo.db.courses.aggregate(pipeline))
        
        # Get completion rates and grades for each department
        for dept in departments:
            # Get grades for courses in this department
            course_ids = [
                course['_id'] for course in 
                mongo.db.courses.find({"department": dept['_id']}, {"_id": 1})
            ]
            
            grades = list(mongo.db.grades.find({
                "course_id": {"$in": course_ids},
                "final_percentage": {"$exists": True}
            }))
            
            if grades:
                avg_grade = sum(grade['final_percentage'] for grade in grades) / len(grades)
                completion_rate = len(grades) / dept['total_students'] * 100 if dept['total_students'] > 0 else 0
            else:
                avg_grade = 0
                completion_rate = 0
            
            dept['avg_grade'] = round(avg_grade, 2)
            dept['completion_rate'] = round(completion_rate, 2)
            
            # Clean up
            dept.pop('enrollments', None)
        
        return jsonify(departments), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve department stats", "error": str(e)}), 500

@admin_bp.route('/reports/recent-activities', methods=['GET'])
@role_required('admin')
def get_recent_activities():
    """Get recent system activities."""
    try:
        limit = int(request.args.get('limit', 20))
        
        activities = []
        
        # Recent enrollments
        recent_enrollments = list(mongo.db.enrollments.find({
            "enrollment_date": {"$gte": datetime.utcnow() - timedelta(days=7)}
        }).sort("enrollment_date", -1).limit(limit // 4))
        
        for enrollment in recent_enrollments:
            student = mongo.db.users.find_one({"_id": enrollment['student_id']})
            course = mongo.db.courses.find_one({"_id": enrollment['course_id']})
            
            if student and course:
                activities.append({
                    "_id": str(enrollment['_id']),
                    "action": "Student Enrolled",
                    "user_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                    "user_role": "student",
                    "target": f"{course['course_code']} - {course['course_name']}",
                    "timestamp": enrollment['enrollment_date'].isoformat(),
                    "details": f"New enrollment in {course['department']}"
                })
        
        # Recent assignment submissions
        recent_submissions = list(mongo.db.assignment_submissions.find({
            "submission_date": {"$gte": datetime.utcnow() - timedelta(days=7)}
        }).sort("submission_date", -1).limit(limit // 4))
        
        for submission in recent_submissions:
            student = mongo.db.users.find_one({"_id": submission['student_id']})
            assignment = mongo.db.assignments.find_one({"_id": submission['assignment_id']})
            
            if student and assignment:
                activities.append({
                    "_id": str(submission['_id']),
                    "action": "Assignment Submitted",
                    "user_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                    "user_role": "student",
                    "target": assignment['title'],
                    "timestamp": submission['submission_date'].isoformat(),
                    "details": f"Status: {submission.get('status', 'submitted')}"
                })
        
        # Recent course creations
        recent_courses = list(mongo.db.courses.find({
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
        }).sort("created_at", -1).limit(limit // 4))
        
        for course in recent_courses:
            teacher = mongo.db.users.find_one({"_id": course.get('teacher_id')}) if course.get('teacher_id') else None
            
            activities.append({
                "_id": str(course['_id']),
                "action": "Course Created",
                "user_name": f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip() if teacher else "Admin",
                "user_role": teacher.get('role', 'admin') if teacher else 'admin',
                "target": f"{course['course_code']} - {course['course_name']}",
                "timestamp": course['created_at'].isoformat(),
                "details": f"Department: {course['department']}"
            })
        
        # Recent user registrations
        recent_users = list(mongo.db.users.find({
            "date_joined": {"$gte": datetime.utcnow() - timedelta(days=7)}
        }).sort("date_joined", -1).limit(limit // 4))
        
        for user in recent_users:
            activities.append({
                "_id": str(user['_id']),
                "action": "User Registered",
                "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "user_role": user['role'],
                "target": f"New {user['role']} account",
                "timestamp": user['date_joined'].isoformat(),
                "details": f"Email: {user.get('email', 'N/A')}"
            })
        
        # Sort all activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify(activities[:limit]), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve recent activities", "error": str(e)}), 500

@admin_bp.route('/reports/top-students', methods=['GET'])
@role_required('admin')
def get_top_students():
    """Get top performing students."""
    try:
        limit = int(request.args.get('limit', 10))
        
        pipeline = [
            {
                "$match": {"role": "student"}
            },
            {
                "$lookup": {
                    "from": "enrollments",
                    "localField": "_id",
                    "foreignField": "student_id",
                    "as": "enrollments"
                }
            },
            {
                "$lookup": {
                    "from": "assignment_submissions",
                    "localField": "_id",
                    "foreignField": "student_id",
                    "as": "submissions"
                }
            },
            {
                "$lookup": {
                    "from": "grades",
                    "localField": "_id",
                    "foreignField": "student_id",
                    "as": "grades"
                }
            },
            {
                "$project": {
                    "first_name": 1,
                    "last_name": 1,
                    "email": 1,
                    "last_login": 1,
                    "total_enrollments": {"$size": "$enrollments"},
                    "completed_assignments": {
                        "$size": {
                            "$filter": {
                                "input": "$submissions",
                                "cond": {"$in": ["$$this.status", ["submitted", "graded"]]}
                            }
                        }
                    },
                    "average_grade": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$grades"}, 0]},
                            "then": {"$avg": "$grades.final_percentage"},
                            "else": 0
                        }
                    }
                }
            },
            {
                "$addFields": {
                    "student_name": {
                        "$concat": [
                            {"$ifNull": ["$first_name", ""]},
                            " ",
                            {"$ifNull": ["$last_name", ""]}
                        ]
                    },
                    "last_activity": "$last_login"
                }
            },
            {
                "$sort": {"average_grade": -1}
            },
            {
                "$limit": limit
            }
        ]
        
        students = list(mongo.db.users.aggregate(pipeline))
        
        # Serialize and clean up data
        for student in students:
            student['_id'] = str(student['_id'])
            student['student_name'] = student['student_name'].strip()
            student['last_activity'] = student['last_activity'].isoformat() if student.get('last_activity') else None
            student['average_grade'] = round(student['average_grade'], 2)
            # Remove individual name fields
            student.pop('first_name', None)
            student.pop('last_name', None)
            student.pop('last_login', None)
        
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve top students", "error": str(e)}), 500

@admin_bp.route('/reports/teacher-performance', methods=['GET'])
@role_required('admin')
def get_teacher_performance():
    """Get teacher performance metrics."""
    try:
        pipeline = [
            {
                "$match": {"role": "teacher"}
            },
            {
                "$lookup": {
                    "from": "courses",
                    "localField": "_id",
                    "foreignField": "teacher_id",
                    "as": "courses"
                }
            },
            {
                "$project": {
                    "first_name": 1,
                    "last_name": 1,
                    "email": 1,
                    "courses": 1,
                    "total_courses": {"$size": "$courses"}
                }
            }
        ]
        
        teachers = list(mongo.db.users.aggregate(pipeline))
        
        for teacher in teachers:
            course_ids = [course['_id'] for course in teacher['courses']]
            
            # Get total students across all courses
            total_students = mongo.db.enrollments.count_documents({
                "course_id": {"$in": course_ids},
                "status": "enrolled"
            })
            
            # Get total assignments
            total_assignments = mongo.db.assignments.count_documents({
                "course_id": {"$in": course_ids}
            })
            
            # Get average grade across all their courses
            grades = list(mongo.db.grades.find({
                "course_id": {"$in": course_ids},
                "final_percentage": {"$exists": True}
            }))
            
            avg_grade = sum(grade['final_percentage'] for grade in grades) / len(grades) if grades else 0
            
            teacher.update({
                "_id": str(teacher['_id']),
                "teacher_name": f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip(),
                "total_students": total_students,
                "total_assignments": total_assignments,
                "avg_grade": round(avg_grade, 2)
            })
            
            # Clean up
            teacher.pop('first_name', None)
            teacher.pop('last_name', None)
            teacher.pop('courses', None)
        
        # Sort by total students (impact)
        teachers.sort(key=lambda x: x['total_students'], reverse=True)
        
        return jsonify(teachers), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve teacher performance", "error": str(e)}), 500

@admin_bp.route('/reports/grade-distribution', methods=['GET'])
@role_required('admin')
def get_grade_distribution():
    """Get grade distribution across the system."""
    try:
        department = request.args.get('department')
        
        # Build match condition
        match_condition = {"final_percentage": {"$exists": True}}
        
        if department and department != 'all':
            # Get course IDs for the department
            course_ids = [
                course['_id'] for course in 
                mongo.db.courses.find({"department": department}, {"_id": 1})
            ]
            match_condition["course_id"] = {"$in": course_ids}
        
        pipeline = [
            {"$match": match_condition},
            {
                "$bucket": {
                    "groupBy": "$final_percentage",
                    "boundaries": [0, 60, 70, 80, 90, 100],
                    "default": "Other",
                    "output": {
                        "count": {"$sum": 1}
                    }
                }
            }
        ]
        
        distribution = list(mongo.db.grades.aggregate(pipeline))
        
        # Convert to proper format
        grade_ranges = {
            0: "F (0-59%)",
            60: "D (60-69%)",
            70: "C (70-79%)",
            80: "B (80-89%)",
            90: "A (90-100%)"
        }
        
        total_grades = sum(item['count'] for item in distribution)
        
        result = []
        for item in distribution:
            if item['_id'] in grade_ranges:
                result.append({
                    "grade_range": grade_ranges[item['_id']],
                    "count": item['count'],
                    "percentage": round((item['count'] / total_grades * 100), 2) if total_grades > 0 else 0
                })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve grade distribution", "error": str(e)}), 500

@admin_bp.route('/reports/assignment-completion', methods=['GET'])
@role_required('admin')
def get_assignment_completion_rates():
    """Get assignment completion rates by course."""
    try:
        pipeline = [
            {
                "$lookup": {
                    "from": "assignment_submissions",
                    "localField": "_id",
                    "foreignField": "assignment_id",
                    "as": "submissions"
                }
            },
            {
                "$lookup": {
                    "from": "courses",
                    "localField": "course_id",
                    "foreignField": "_id",
                    "as": "course"
                }
            },
            {
                "$unwind": "$course"
            },
            {
                "$group": {
                    "_id": "$course_id",
                    "course_code": {"$first": "$course.course_code"},
                    "total_assignments": {"$sum": 1},
                    "submitted_assignments": {
                        "$sum": {
                            "$size": {
                                "$filter": {
                                    "input": "$submissions",
                                    "cond": {"$in": ["$$this.status", ["submitted", "graded"]]}
                                }
                            }
                        }
                    }
                }
            },
            {
                "$lookup": {
                    "from": "enrollments",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "enrollments"
                }
            },
            {
                "$project": {
                    "course_code": 1,
                    "total_assignments": 1,
                    "submitted_assignments": 1,
                    "total_students": {
                        "$size": {
                            "$filter": {
                                "input": "$enrollments",
                                "cond": {"$eq": ["$$this.status", "enrolled"]}
                            }
                        }
                    }
                }
            },
            {
                "$addFields": {
                    "expected_submissions": {"$multiply": ["$total_assignments", "$total_students"]},
                    "completion_rate": {
                        "$cond": {
                            "if": {"$and": [
                                {"$gt": ["$total_assignments", 0]},
                                {"$gt": ["$total_students", 0]}
                            ]},
                            "then": {
                                "$multiply": [
                                    {"$divide": [
                                        "$submitted_assignments",
                                        {"$multiply": ["$total_assignments", "$total_students"]}
                                    ]},
                                    100
                                ]
                            },
                            "else": 0
                        }
                    }
                }
            },
            {
                "$project": {
                    "course_code": 1,
                    "completion_rate": {"$round": ["$completion_rate", 2]}
                }
            },
            {
                "$sort": {"completion_rate": -1}
            }
        ]
        
        completion_rates = list(mongo.db.assignments.aggregate(pipeline))
        
        # Serialize ObjectId fields
        for rate in completion_rates:
            if '_id' in rate:
                rate['_id'] = str(rate['_id'])
        
        return jsonify(completion_rates), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve assignment completion rates", "error": str(e)}), 500

@admin_bp.route('/reports/comprehensive', methods=['GET'])
@role_required('admin')
def get_comprehensive_report():
    """Get all report data in one comprehensive call."""
    try:
        period = request.args.get('period', 'month')
        department = request.args.get('department')
        
        # Get system stats
        total_users = mongo.db.users.count_documents({})
        total_students = mongo.db.users.count_documents({"role": "student"})
        total_teachers = mongo.db.users.count_documents({"role": "teacher"})
        total_admins = mongo.db.users.count_documents({"role": "admin"})
        total_courses = mongo.db.courses.count_documents({})
        total_enrollments = mongo.db.enrollments.count_documents({})
        total_assignments = mongo.db.assignments.count_documents({})
        total_submissions = mongo.db.assignment_submissions.count_documents({})
        total_grades = mongo.db.grades.count_documents({})
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = mongo.db.users.count_documents({
            "last_login": {"$gte": thirty_days_ago}
        })
        
        first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_users_this_month = mongo.db.users.count_documents({
            "date_joined": {"$gte": first_of_month}
        })
        
        new_enrollments_this_month = mongo.db.enrollments.count_documents({
            "enrollment_date": {"$gte": first_of_month}
        })
        
        system_stats = {
            "total_users": total_users,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_admins": total_admins,
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "total_assignments": total_assignments,
            "total_submissions": total_submissions,
            "total_grades": total_grades,
            "active_users": active_users,
            "new_users_this_month": new_users_this_month,
            "new_enrollments_this_month": new_enrollments_this_month
        }
        
        comprehensive_report = {
            "system_stats": system_stats,
            "enrollment_trends": [],
            "course_performance": [],
            "department_stats": [],
            "recent_activities": [],
            "top_students": [],
            "teacher_performance": [],
            "grade_distribution": [],
            "assignment_completion_rates": []
        }
        
        return jsonify(comprehensive_report), 200
    except Exception as e:
        return jsonify({"message": "Failed to generate comprehensive report", "error": str(e)}), 500

# === REPORT EXPORT FUNCTIONALITY ===

@admin_bp.route('/reports/export/<string:report_type>', methods=['GET'])
@role_required('admin')
def export_report(report_type):
    """Export reports in various formats (CSV, JSON)."""
    try:
        period = request.args.get('period', 'month')
        department = request.args.get('department')
        format_type = request.args.get('format', 'csv').lower()
        
        # Validate report type
        valid_reports = [
            'system-stats', 'enrollment-trends', 'course-performance', 
            'department-stats', 'recent-activities', 'top-students',
            'teacher-performance', 'grade-distribution', 'assignment-completion',
            'comprehensive'
        ]
        
        if report_type not in valid_reports:
            return jsonify({"message": "Invalid report type"}), 400
        
        # Get the data based on report type
        data = None
        filename = f"{report_type}_{period}_{datetime.utcnow().strftime('%Y%m%d')}"
        
        if department and department != 'all':
            filename += f"_{department.replace(' ', '_')}"
        
        # Direct data retrieval without calling Flask route functions
        if report_type == 'system-stats':
            total_users = mongo.db.users.count_documents({})
            total_students = mongo.db.users.count_documents({"role": "student"})
            total_teachers = mongo.db.users.count_documents({"role": "teacher"})
            total_admins = mongo.db.users.count_documents({"role": "admin"})
            total_courses = mongo.db.courses.count_documents({})
            total_enrollments = mongo.db.enrollments.count_documents({})
            total_assignments = mongo.db.assignments.count_documents({})
            total_submissions = mongo.db.assignment_submissions.count_documents({})
            total_grades = mongo.db.grades.count_documents({})
            
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            active_users = mongo.db.users.count_documents({
                "last_login": {"$gte": thirty_days_ago}
            })
            
            first_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            new_users_this_month = mongo.db.users.count_documents({
                "date_joined": {"$gte": first_of_month}
            })
            
            new_enrollments_this_month = mongo.db.enrollments.count_documents({
                "enrollment_date": {"$gte": first_of_month}
            })
            
            data = {
                "total_users": total_users,
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_admins": total_admins,
                "total_courses": total_courses,
                "total_enrollments": total_enrollments,
                "total_assignments": total_assignments,
                "total_submissions": total_submissions,
                "total_grades": total_grades,
                "active_users": active_users,
                "new_users_this_month": new_users_this_month,
                "new_enrollments_this_month": new_enrollments_this_month
            }
            
        elif report_type == 'course-performance':
            # Build match stage
            match_stage = {}
            if department and department != 'all':
                match_stage['department'] = department
            
            pipeline = [
                {"$match": match_stage} if match_stage else {"$match": {}},
                {
                    "$lookup": {
                        "from": "enrollments",
                        "localField": "_id",
                        "foreignField": "course_id",
                        "as": "enrollments"
                    }
                },
                {
                    "$lookup": {
                        "from": "assignments",
                        "localField": "_id",
                        "foreignField": "course_id",
                        "as": "assignments"
                    }
                },
                {
                    "$lookup": {
                        "from": "grades",
                        "localField": "_id",
                        "foreignField": "course_id",
                        "as": "grades"
                    }
                },
                {
                    "$project": {
                        "course_code": 1,
                        "course_name": 1,
                        "department": 1,
                        "total_enrollments": {"$size": "$enrollments"},
                        "active_enrollments": {
                            "$size": {
                                "$filter": {
                                    "input": "$enrollments",
                                    "cond": {"$eq": ["$$this.status", "enrolled"]}
                                }
                            }
                        },
                        "total_assignments": {"$size": "$assignments"},
                        "average_grade": {
                            "$cond": {
                                "if": {"$gt": [{"$size": "$grades"}, 0]},
                                "then": {"$avg": "$grades.final_percentage"},
                                "else": 0
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "completion_rate": {
                            "$cond": {
                                "if": {"$gt": ["$total_enrollments", 0]},
                                "then": {
                                    "$multiply": [
                                        {"$divide": ["$active_enrollments", "$total_enrollments"]},
                                        100
                                    ]
                                },
                                "else": 0
                            }
                        }
                    }
                },
                {
                    "$sort": {"total_enrollments": -1}
                }
            ]
            
            courses = list(mongo.db.courses.aggregate(pipeline))
            for course in courses:
                course['_id'] = str(course['_id'])
                course['completion_rate'] = round(course['completion_rate'], 2)
                course['average_grade'] = round(course['average_grade'], 2)
            
            data = courses
            
        elif report_type == 'top-students':
            pipeline = [
                {"$match": {"role": "student"}},
                {
                    "$lookup": {
                        "from": "enrollments",
                        "localField": "_id",
                        "foreignField": "student_id",
                        "as": "enrollments"
                    }
                },
                {
                    "$lookup": {
                        "from": "assignment_submissions",
                        "localField": "_id",
                        "foreignField": "student_id",
                        "as": "submissions"
                    }
                },
                {
                    "$lookup": {
                        "from": "grades",
                        "localField": "_id",
                        "foreignField": "student_id",
                        "as": "grades"
                    }
                },
                {
                    "$project": {
                        "first_name": 1,
                        "last_name": 1,
                        "email": 1,
                        "total_enrollments": {"$size": "$enrollments"},
                        "completed_assignments": {
                            "$size": {
                                "$filter": {
                                    "input": "$submissions",
                                    "cond": {"$in": ["$$this.status", ["submitted", "graded"]]}
                                }
                            }
                        },
                        "average_grade": {
                            "$cond": {
                                "if": {"$gt": [{"$size": "$grades"}, 0]},
                                "then": {"$avg": "$grades.final_percentage"},
                                "else": 0
                            }
                        }
                    }
                },
                {
                    "$addFields": {
                        "student_name": {
                            "$concat": [
                                {"$ifNull": ["$first_name", ""]},
                                " ",
                                {"$ifNull": ["$last_name", ""]}
                            ]
                        }
                    }
                },
                {"$sort": {"average_grade": -1}},
                {"$limit": 20}
            ]
            
            students = list(mongo.db.users.aggregate(pipeline))
            for student in students:
                student['_id'] = str(student['_id'])
                student['student_name'] = student['student_name'].strip()
                student['average_grade'] = round(student['average_grade'], 2)
                # Remove individual name fields for cleaner export
                student.pop('first_name', None)
                student.pop('last_name', None)
            
            data = students
            
        else:
            # For other report types, return a simple message
            data = [{"message": f"Export for {report_type} is being processed. Please try again later."}]
        
        if not data:
            return jsonify({"message": "No data available for export"}), 404
        
        # Export based on format
        if format_type == 'csv':
            import io
            import csv
            
            output = io.StringIO()
            
            if isinstance(data, list) and len(data) > 0:
                # Export list data as CSV
                if isinstance(data[0], dict):
                    fieldnames = data[0].keys()
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(data)
                else:
                    writer = csv.writer(output)
                    for row in data:
                        writer.writerow([row])
            elif isinstance(data, dict):
                # Export dict data as CSV (key-value pairs)
                writer = csv.writer(output)
                writer.writerow(['Metric', 'Value'])
                for key, value in data.items():
                    writer.writerow([key, value])
            
            csv_data = output.getvalue()
            output.close()
            
            from flask import Response
            return Response(
                csv_data,
                mimetype='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename={filename}.csv',
                    'Content-Type': 'text/csv',
                    'Cache-Control': 'no-cache'
                }
            )
            
        elif format_type == 'json':
            from flask import Response
            import json
            
            return Response(
                json.dumps(data, indent=2, default=str),
                mimetype='application/json',
                headers={
                    'Content-Disposition': f'attachment; filename={filename}.json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            )
            
        else:
            return jsonify({"message": f"Export format '{format_type}' not supported. Use 'csv' or 'json'."}), 400
            
    except Exception as e:
        return jsonify({"message": "Failed to export report", "error": str(e)}), 500

# === DATABASE PERFORMANCE AND MAINTENANCE ENDPOINTS ===

@admin_bp.route('/database/performance', methods=['GET'])
@role_required('admin')
def get_database_performance():
    """Get database performance metrics and statistics."""
    try:
        hours_back = int(request.args.get('hours', 24))
        
        # Get performance metrics
        performance_metrics = DatabaseUtils.get_performance_metrics(hours_back)
        
        # Get collection statistics
        collection_stats = DatabaseUtils.get_collection_stats()
        
        # Get database health check
        health_check = DatabaseUtils.health_check()
        
        # Get index optimization recommendations
        index_recommendations = DatabaseUtils.optimize_indexes()
        
        return jsonify({
            "timestamp": datetime.utcnow(),
            "performance_metrics": performance_metrics,
            "collection_stats": collection_stats,
            "health_check": health_check,
            "index_recommendations": index_recommendations
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve database performance", "error": str(e)}), 500

@admin_bp.route('/database/cleanup', methods=['POST'])
@role_required('admin')
def cleanup_database():
    """Clean up old temporary data and optimize database."""
    try:
        data = request.get_json() or {}
        days_old = int(data.get('days_old', 30))
        
        # Perform cleanup
        cleanup_results = DatabaseUtils.cleanup_old_data(days_old)
        
        return jsonify({
            "message": "Database cleanup completed",
            "results": cleanup_results
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to cleanup database", "error": str(e)}), 500

@admin_bp.route('/database/backup-indexes', methods=['POST'])
@role_required('admin')
def backup_database_indexes():
    """Create a backup of current database index configuration."""
    try:
        backup_result = DatabaseUtils.create_backup_indexes()
        
        return jsonify({
            "message": "Index backup created successfully",
            "backup": backup_result
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to backup indexes", "error": str(e)}), 500 