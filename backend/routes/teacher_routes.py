from flask import Blueprint, request, jsonify
from functools import wraps
from extensions import mongo
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
try:
    from dateutil.parser import parse as parse_date
except ImportError:
    # Fallback if dateutil is not available
    def parse_date(date_str):
        # Try common date formats
        for fmt in ('%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        raise ValueError(f"Unable to parse date: {date_str}")

teacher_bp = Blueprint('teacher_bp', __name__)

# Utility function to serialize ObjectIds in documents
def serialize_document(doc):
    """Convert all ObjectIds and datetime objects in a document to strings"""
    import copy
    from bson import ObjectId as BSONObjectId
    doc = copy.deepcopy(doc)  # Avoid modifying the original document
    
    def convert_value(value):
        """Recursively convert ObjectIds and datetime objects to strings"""
        if value is None:  # Handle None values
            return None
        elif isinstance(value, BSONObjectId):  # More explicit ObjectId check
            return str(value)
        elif hasattr(value, 'hex'):  # Fallback ObjectId check
            return str(value)
        elif isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, dict):
            return {k: convert_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [convert_value(item) for item in value]
        else:
            return value
    
    return {k: convert_value(v) for k, v in doc.items()}

# --- Helper for Role-Based Access Control ---
def role_required(role_name):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_identity = get_jwt_identity()
            if not isinstance(current_user_identity, dict) or current_user_identity.get('role') != role_name:
                return jsonify({"message": f"Unauthorized: Action requires {role_name} role"}), 403
            
            user = mongo.db.users.find_one({"username": current_user_identity.get('username')})
            if not user:
                return jsonify({"message": "Authenticated user not found in database."}), 404
            
            # Pass the user's ObjectId (as teacher_id) to the decorated function
            return fn(teacher_id=user['_id'], *args, **kwargs)
        return wrapper
    return decorator

# Placeholder for teacher routes
@teacher_bp.route('/ping', methods=['GET'])
@role_required('teacher')
def ping_teacher(teacher_id):
    return jsonify({"message": "Teacher endpoint reached!", "teacher_id": str(teacher_id)}), 200

# Dashboard stats endpoint specifically for the dashboard
@teacher_bp.route('/dashboard/stats', methods=['GET'])
@role_required('teacher')
def get_teacher_dashboard_stats(teacher_id):
    """Get dashboard statistics for the teacher."""
    try:
        # Get basic statistics
        total_courses = mongo.db.courses.count_documents({"teacher_id": teacher_id})
        
        # Get total students across all teacher's courses
        course_ids = [course['_id'] for course in mongo.db.courses.find({"teacher_id": teacher_id}, {"_id": 1})]
        total_students = mongo.db.enrollments.count_documents({
            "course_id": {"$in": course_ids},
            "status": "enrolled"
        }) if course_ids else 0
        
        total_assignments = mongo.db.assignments.count_documents({"teacher_id": teacher_id})
        total_quizzes = mongo.db.quizzes.count_documents({"teacher_id": teacher_id})

        stats = {
            "total_courses": total_courses,
            "total_students": total_students,
            "total_assignments": total_assignments,
            "total_quizzes": total_quizzes
        }

        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve dashboard stats", "error": str(e)}), 500

# Endpoints for viewing taught courses and students in those courses will be added here.

@teacher_bp.route('/courses/my', methods=['GET'])
@role_required('teacher')
def get_my_taught_courses(teacher_id):
    """Lists all courses the authenticated teacher is assigned to teach."""
    try:
        # Get limit parameter if provided
        limit = request.args.get('limit', type=int)
        
        courses_cursor = mongo.db.courses.find({"teacher_id": teacher_id}).sort("course_code", 1)
        
        # Apply limit if specified
        if limit:
            courses_cursor = courses_cursor.limit(limit)
        
        courses_list = []
        for course in courses_cursor:
            # Manually construct course data to avoid ObjectId issues
            course_data = {
                "_id": str(course['_id']),
                "course_code": course.get('course_code', ''),
                "course_name": course.get('course_name', ''),
                "credits": course.get('credits', 0),
                "semester": course.get('semester', ''),
                "year": course.get('year', ''),
                "department": course.get('department', ''),
                "description": course.get('description', ''),
                "schedule_info": course.get('schedule_info', ''),
                "max_capacity": course.get('max_capacity', 0),
                "teacher_id": str(course.get('teacher_id', '')),
                "assignments": [str(aid) for aid in course.get('assignments', [])],
                "quizzes": [str(qid) for qid in course.get('quizzes', [])]
            }
            
            # Add student count for each course
            course_data['current_enrollment'] = mongo.db.enrollments.count_documents({
                "course_id": course['_id'],
                "status": "enrolled"
            })
            
            courses_list.append(course_data)
        return jsonify(courses_list), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve taught courses", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/students', methods=['GET'])
@role_required('teacher')
def get_students_in_course(teacher_id, course_id_str):
    """Lists all students enrolled in a specific course taught by the authenticated teacher."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # 1. Verify the teacher is actually teaching this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        # Find all 'enrolled' records for the course
        enrollment_records = list(mongo.db.enrollments.find({"course_id": course_id, "status": "enrolled"}))
        
        student_ids = [record['student_id'] for record in enrollment_records]
        if not student_ids:
            return jsonify([]), 200 # No students enrolled

        # Fetch details of these students (e.g., name, email, student_id_str, major)
        # Adjust projection as needed
        students_cursor = mongo.db.users.find(
            {"_id": {"$in": student_ids}, "role": "student"},
            {"_id": 1, "username": 1, "email": 1, "first_name": 1, "last_name": 1, "student_id_str": 1, "major": 1}
        )
        
        students_list = []
        # Create a mapping from enrollment record for easy lookup if more enrollment-specific data is needed
        # For now, just associating student details.
        for student in students_cursor:
            student_doc = {
                "_id": str(student['_id']),  # Add _id field for frontend consistency
                "user_id": str(student['_id']),
                "username": student.get("username"),
                "email": student.get("email"),
                "first_name": student.get("first_name", ""),
                "last_name": student.get("last_name", ""),
                "student_id_str": student.get("student_id_str", "N/A"),
                "major": student.get("major", "Not specified")  # Add major field
            }
            # Could add enrollment_date here if needed from enrollment_records
            students_list.append(student_doc)
            
        return jsonify(students_list), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve students for the course", "error": str(e)}), 500

# === ASSIGNMENT MANAGEMENT ===

@teacher_bp.route('/courses/<string:course_id_str>/assignments', methods=['GET'])
@role_required('teacher')
def get_course_assignments(teacher_id, course_id_str):
    """Get all assignments for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        assignments = list(mongo.db.assignments.find({
            "course_id": course_id,
            "teacher_id": teacher_id
        }).sort("due_date", 1))

        serialized_assignments = []
        for assignment in assignments:
            # Properly serialize the assignment document
            assignment_data = serialize_document(assignment)
            
            # Add submission statistics
            total_submissions = mongo.db.assignment_submissions.count_documents({
                "assignment_id": assignment['_id']  # Use original ObjectId for queries
            })
            graded_submissions = mongo.db.assignment_submissions.count_documents({
                "assignment_id": assignment['_id'],  # Use original ObjectId for queries
                "score": {"$exists": True, "$ne": None}
            })
            
            assignment_data['submission_stats'] = {
                "total_submissions": total_submissions,
                "graded_submissions": graded_submissions,
                "pending_grading": total_submissions - graded_submissions
            }

            serialized_assignments.append(assignment_data)

        return jsonify(serialized_assignments), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve assignments", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/assignments', methods=['POST'])
@role_required('teacher')
def create_assignment(teacher_id, course_id_str):
    """Create a new assignment for a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'assignment_type', 'total_points', 'due_date']
    for field in required_fields:
        if field not in data:
            return jsonify({"message": f"Missing required field: {field}"}), 400

    # Validate assignment type
    allowed_types = ['Project', 'Homework']
    if data['assignment_type'] not in allowed_types:
        return jsonify({"message": f"Assignment type must be one of: {', '.join(allowed_types)}"}), 400

    try:
        # Parse due date
        due_date = parse_date(data['due_date'])
        
        assignment_data = {
            "title": data['title'],
            "description": data.get('description', ''),
            "assignment_type": data['assignment_type'],
            "total_points": int(data['total_points']),
            "due_date": due_date,
            "instructions": data.get('instructions', ''),
            "attachments": data.get('attachments', []),
            "course_id": course_id,
            "teacher_id": teacher_id,
            "is_published": data.get('is_published', True),
            "created_date": datetime.utcnow(),
            "submissions": []
        }

        result = mongo.db.assignments.insert_one(assignment_data)
        
        # Add assignment to course's assignments list
        mongo.db.courses.update_one(
            {"_id": course_id},
            {"$push": {"assignments": result.inserted_id}}
        )

        return jsonify({
            "message": "Assignment created successfully",
            "assignment_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"message": "Failed to create assignment", "error": str(e)}), 500

@teacher_bp.route('/assignments/<string:assignment_id_str>', methods=['PUT'])
@role_required('teacher')
def update_assignment(teacher_id, assignment_id_str):
    """Update an existing assignment."""
    try:
        assignment_id = ObjectId(assignment_id_str)
    except Exception:
        return jsonify({"message": "Invalid assignment ID format"}), 400

    # Verify teacher owns this assignment
    assignment = mongo.db.assignments.find_one({
        "_id": assignment_id,
        "teacher_id": teacher_id
    })
    if not assignment:
        return jsonify({"message": "Assignment not found or you don't have permission"}), 404

    data = request.get_json()
    
    # Validate assignment type if provided
    if 'assignment_type' in data:
        allowed_types = ['Project', 'Homework']
        if data['assignment_type'] not in allowed_types:
            return jsonify({"message": f"Assignment type must be one of: {', '.join(allowed_types)}"}), 400

    try:
        update_data = {}
        
        # Update fields if provided
        if 'title' in data and data['title'].strip():
            update_data['title'] = data['title'].strip()
        if 'description' in data:
            update_data['description'] = data['description'].strip()
        if 'assignment_type' in data:
            update_data['assignment_type'] = data['assignment_type']
        if 'total_points' in data:
            update_data['total_points'] = int(data['total_points'])
        if 'due_date' in data:
            update_data['due_date'] = parse_date(data['due_date'])
        if 'instructions' in data:
            update_data['instructions'] = data['instructions'].strip()
        if 'is_published' in data:
            update_data['is_published'] = bool(data['is_published'])

        update_data['updated_date'] = datetime.utcnow()

        if update_data:
            mongo.db.assignments.update_one(
                {"_id": assignment_id},
                {"$set": update_data}
            )

        return jsonify({"message": "Assignment updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update assignment", "error": str(e)}), 500

@teacher_bp.route('/assignments/<string:assignment_id_str>', methods=['DELETE'])
@role_required('teacher')
def delete_assignment(teacher_id, assignment_id_str):
    """Delete an assignment."""
    try:
        assignment_id = ObjectId(assignment_id_str)
    except Exception:
        return jsonify({"message": "Invalid assignment ID format"}), 400

    # Verify teacher owns this assignment
    assignment = mongo.db.assignments.find_one({
        "_id": assignment_id,
        "teacher_id": teacher_id
    })
    if not assignment:
        return jsonify({"message": "Assignment not found or you don't have permission"}), 404

    try:
        # Remove assignment from course's assignments list
        mongo.db.courses.update_one(
            {"_id": assignment['course_id']},
            {"$pull": {"assignments": assignment_id}}
        )

        # Delete all submissions for this assignment
        mongo.db.assignment_submissions.delete_many({"assignment_id": assignment_id})

        # Delete the assignment
        mongo.db.assignments.delete_one({"_id": assignment_id})

        return jsonify({"message": "Assignment deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to delete assignment", "error": str(e)}), 500

@teacher_bp.route('/assignments/<string:assignment_id_str>/submissions', methods=['GET'])
@role_required('teacher')
def get_assignment_submissions(teacher_id, assignment_id_str):
    """Get all submissions for a specific assignment."""
    try:
        assignment_id = ObjectId(assignment_id_str)
    except Exception:
        return jsonify({"message": "Invalid assignment ID format"}), 400

    # Verify teacher owns this assignment
    assignment = mongo.db.assignments.find_one({
        "_id": assignment_id,
        "teacher_id": teacher_id
    })
    if not assignment:
        return jsonify({"message": "Assignment not found or you don't have permission"}), 404

    try:
        # Get all submissions with student info
        submissions = list(mongo.db.assignment_submissions.aggregate([
            {"$match": {"assignment_id": assignment_id}},
            {"$lookup": {
                "from": "users",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student_info"
            }},
            {"$unwind": "$student_info"},
            {"$project": {
                "_id": 1,
                "content": 1,
                "attachments": 1,
                "submission_date": 1,
                "score": 1,
                "feedback": 1,
                "status": 1,
                "graded_date": 1,
                "student": {
                    "id": "$student_info._id",
                    "name": {
                        "$concat": [
                            "$student_info.first_name",
                            " ",
                            "$student_info.last_name"
                        ]
                    },
                    "email": "$student_info.email",
                    "student_id_str": "$student_info.student_id_str"
                }
            }},
            {"$sort": {"submission_date": 1}}
        ]))

        # Convert ObjectIds to strings
        for submission in submissions:
            submission['_id'] = str(submission['_id'])
            submission['student']['id'] = str(submission['student']['id'])

        return jsonify(submissions), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve submissions", "error": str(e)}), 500

@teacher_bp.route('/submissions/<string:submission_id_str>/grade', methods=['POST'])
@role_required('teacher')
def grade_assignment_submission(teacher_id, submission_id_str):
    """Grade an assignment submission."""
    try:
        submission_id = ObjectId(submission_id_str)
    except Exception:
        return jsonify({"message": "Invalid submission ID format"}), 400

    data = request.get_json()
    score = data.get('score')
    feedback = data.get('feedback', '')

    if score is None:
        return jsonify({"message": "Score is required"}), 400

    try:
        # Get submission and verify teacher owns the assignment
        submission = mongo.db.assignment_submissions.find_one({"_id": submission_id})
        if not submission:
            return jsonify({"message": "Submission not found"}), 404

        assignment = mongo.db.assignments.find_one({
            "_id": submission['assignment_id'],
            "teacher_id": teacher_id
        })
        if not assignment:
            return jsonify({"message": "You don't have permission to grade this submission"}), 403

        # Validate score
        if not isinstance(score, (int, float)) or score < 0 or score > assignment['total_points']:
            return jsonify({
                "message": f"Score must be between 0 and {assignment['total_points']}"
            }), 400

        # Update submission with grade
        mongo.db.assignment_submissions.update_one(
            {"_id": submission_id},
            {
                "$set": {
                    "score": float(score),
                    "feedback": feedback,
                    "graded_date": datetime.utcnow(),
                    "graded_by": teacher_id,
                    "status": "graded"
                }
            }
        )

        return jsonify({"message": "Submission graded successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to grade submission", "error": str(e)}), 500

# === QUIZ MANAGEMENT ===

@teacher_bp.route('/courses/<string:course_id_str>/quizzes', methods=['GET'])
@role_required('teacher')
def get_course_quizzes(teacher_id, course_id_str):
    """Get all quizzes for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        quizzes = list(mongo.db.quizzes.find({
            "course_id": course_id,
            "teacher_id": teacher_id
        }).sort("due_date", 1))

        serialized_quizzes = []
        for quiz in quizzes:
            # Properly serialize the quiz document
            quiz_data = serialize_document(quiz)
            
            # Add submission statistics
            total_submissions = mongo.db.quiz_submissions.count_documents({
                "quiz_id": quiz['_id']  # Use original ObjectId for queries
            })
            
            quiz_data['submission_stats'] = {
                "total_submissions": total_submissions
            }

            serialized_quizzes.append(quiz_data)

        return jsonify(serialized_quizzes), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve quizzes", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/quizzes', methods=['POST'])
@role_required('teacher')
def create_quiz(teacher_id, course_id_str):
    """Create a new quiz for a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'total_points', 'due_date', 'start_date']
    for field in required_fields:
        if field not in data:
            return jsonify({"message": f"Missing required field: {field}"}), 400

    try:
        due_date = parse_date(data['due_date'])
        start_date = parse_date(data['start_date'])
        
        quiz_data = {
            "title": data['title'],
            "description": data.get('description', ''),
            "quiz_type": data.get('quiz_type', 'Practice'),
            "total_points": int(data['total_points']),
            "time_limit": data.get('time_limit', 60),
            "due_date": due_date,
            "start_date": start_date,
            "end_date": due_date,  # Always set end_date to due_date
            "questions": data.get('questions', []),
            "course_id": course_id,
            "teacher_id": teacher_id,
            "is_published": data.get('is_published', True),
            "created_date": datetime.utcnow(),
            "attempts_allowed": data.get('attempts_allowed', 1),
            "submissions": []
        }

        result = mongo.db.quizzes.insert_one(quiz_data)
        
        # Add quiz to course's quizzes list
        mongo.db.courses.update_one(
            {"_id": course_id},
            {"$push": {"quizzes": result.inserted_id}}
        )

        return jsonify({
            "message": "Quiz created successfully",
            "quiz_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"message": "Failed to create quiz", "error": str(e)}), 500

@teacher_bp.route('/quizzes/<string:quiz_id_str>', methods=['PUT'])
@role_required('teacher')
def update_quiz(teacher_id, quiz_id_str):
    """Update an existing quiz."""
    try:
        quiz_id = ObjectId(quiz_id_str)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    # Verify teacher owns this quiz
    quiz = mongo.db.quizzes.find_one({
        "_id": quiz_id,
        "teacher_id": teacher_id
    })
    if not quiz:
        return jsonify({"message": "Quiz not found or you don't have permission"}), 404

    data = request.get_json()
    
    try:
        update_data = {}
        
        # Update fields if provided
        if 'title' in data and data['title'].strip():
            update_data['title'] = data['title'].strip()
        if 'description' in data:
            update_data['description'] = data['description'].strip()
        if 'quiz_type' in data:
            update_data['quiz_type'] = data['quiz_type']
        if 'total_points' in data:
            update_data['total_points'] = int(data['total_points'])
        if 'time_limit' in data:
            update_data['time_limit'] = int(data['time_limit'])
        if 'due_date' in data:
            due_date = parse_date(data['due_date'])
            update_data['due_date'] = due_date
            update_data['end_date'] = due_date  # Keep end_date in sync
        if 'start_date' in data:
            update_data['start_date'] = parse_date(data['start_date'])
        if 'is_published' in data:
            update_data['is_published'] = bool(data['is_published'])
        if 'questions' in data:
            update_data['questions'] = data['questions']

        update_data['updated_date'] = datetime.utcnow()

        if update_data:
            mongo.db.quizzes.update_one(
                {"_id": quiz_id},
                {"$set": update_data}
            )

        return jsonify({"message": "Quiz updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update quiz", "error": str(e)}), 500

@teacher_bp.route('/quizzes/<string:quiz_id_str>', methods=['DELETE'])
@role_required('teacher')
def delete_quiz(teacher_id, quiz_id_str):
    """Delete a quiz."""
    try:
        quiz_id = ObjectId(quiz_id_str)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    # Verify teacher owns this quiz
    quiz = mongo.db.quizzes.find_one({
        "_id": quiz_id,
        "teacher_id": teacher_id
    })
    if not quiz:
        return jsonify({"message": "Quiz not found or you don't have permission"}), 404

    try:
        # Remove quiz from course's quizzes list
        mongo.db.courses.update_one(
            {"_id": quiz['course_id']},
            {"$pull": {"quizzes": quiz_id}}
        )

        # Delete all submissions for this quiz
        mongo.db.quiz_submissions.delete_many({"quiz_id": quiz_id})

        # Delete the quiz
        mongo.db.quizzes.delete_one({"_id": quiz_id})

        return jsonify({"message": "Quiz deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to delete quiz", "error": str(e)}), 500

@teacher_bp.route('/quizzes/<string:quiz_id_str>/submissions', methods=['GET'])
@role_required('teacher')
def get_quiz_submissions(teacher_id, quiz_id_str):
    """Get all submissions for a specific quiz."""
    try:
        quiz_id = ObjectId(quiz_id_str)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    # Verify teacher owns this quiz
    quiz = mongo.db.quizzes.find_one({
        "_id": quiz_id,
        "teacher_id": teacher_id
    })
    if not quiz:
        return jsonify({"message": "Quiz not found or you don't have permission"}), 404

    try:
        # Get all submissions with student info
        submissions = list(mongo.db.quiz_submissions.aggregate([
            {"$match": {"quiz_id": quiz_id}},
            {"$lookup": {
                "from": "users",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student_info"
            }},
            {"$unwind": "$student_info"},
            {"$project": {
                "_id": 1,
                "answers": 1,
                "submission_date": 1,
                "score": 1,
                "time_taken": 1,
                "attempt_number": 1,
                "status": 1,
                "student": {
                    "id": "$student_info._id",
                    "name": {
                        "$concat": [
                            "$student_info.first_name",
                            " ",
                            "$student_info.last_name"
                        ]
                    },
                    "email": "$student_info.email",
                    "student_id_str": "$student_info.student_id_str"
                }
            }},
            {"$sort": {"submission_date": 1}}
        ]))

        # Convert ObjectIds to strings
        for submission in submissions:
            submission['_id'] = str(submission['_id'])
            submission['student']['id'] = str(submission['student']['id'])

        return jsonify(submissions), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve quiz submissions", "error": str(e)}), 500

# === ATTENDANCE MANAGEMENT ===

@teacher_bp.route('/courses/<string:course_id_str>/attendance', methods=['GET'])
@role_required('teacher')
def get_course_attendance_records(teacher_id, course_id_str):
    """Get attendance records for a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        # Get all attendance records for the course
        attendance_records = list(mongo.db.attendance.find({
            "course_id": course_id
        }).sort("date", -1))

        # Get enrolled students for reference
        enrolled_students = list(mongo.db.users.find({
            "_id": {"$in": [
                enrollment['student_id'] for enrollment in 
                mongo.db.enrollments.find({"course_id": course_id, "status": "enrolled"})
            ]}
        }, {"first_name": 1, "last_name": 1, "email": 1, "student_id_str": 1}))

        # Format response
        formatted_records = []
        for record in attendance_records:
            record = serialize_document(record)
            
            # Convert student_attendances ObjectIds to strings
            formatted_attendances = {}
            for student_id_str, present in record.get('student_attendances', {}).items():
                formatted_attendances[student_id_str] = present
            record['student_attendances'] = formatted_attendances
            
            formatted_records.append(record)

        return jsonify({
            "attendance_records": formatted_records,
            "enrolled_students": [
                {
                    "id": str(student['_id']),
                    "name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
                    "email": student.get('email'),
                    "student_id_str": student.get('student_id_str')
                }
                for student in enrolled_students
            ]
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve attendance records", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/attendance', methods=['POST'])
@role_required('teacher')
def record_attendance(teacher_id, course_id_str):
    """Record attendance for a class session."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    data = request.get_json()
    attendance_date = data.get('date')
    student_attendances = data.get('student_attendances', {})

    if not attendance_date:
        return jsonify({"message": "Date is required"}), 400

    try:
        parsed_date = parse_date(attendance_date).date()
        
        # Check if attendance already recorded for this date
        existing_record = mongo.db.attendance.find_one({
            "course_id": course_id,
            "date": parsed_date
        })

        attendance_data = {
            "course_id": course_id,
            "date": parsed_date,
            "student_attendances": student_attendances,
            "recorded_by": teacher_id,
            "recorded_at": datetime.utcnow()
        }

        if existing_record:
            # Update existing record
            mongo.db.attendance.update_one(
                {"_id": existing_record['_id']},
                {"$set": attendance_data}
            )
            message = "Attendance updated successfully"
        else:
            # Create new record
            mongo.db.attendance.insert_one(attendance_data)
            message = "Attendance recorded successfully"

        return jsonify({"message": message}), 201
    except Exception as e:
        return jsonify({"message": "Failed to record attendance", "error": str(e)}), 500

# === GRADING AND ANALYTICS ===

@teacher_bp.route('/courses/<string:course_id_str>/grades', methods=['GET'])
@role_required('teacher')
def get_course_grades(teacher_id, course_id_str):
    """Get grade overview for all students in a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        # Get all grades for the course
        grades = list(mongo.db.grades.aggregate([
            {"$match": {"course_id": course_id}},
            {"$lookup": {
                "from": "users",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student_info"
            }},
            {"$unwind": "$student_info"},
            {"$project": {
                "_id": 1,
                "student_id": 1,
                "course_id": 1,
                "student": {
                    "id": "$student_info._id",
                    "name": {
                        "$concat": [
                            "$student_info.first_name",
                            " ",
                            "$student_info.last_name"
                        ]
                    },
                    "email": "$student_info.email",
                    "student_id_str": "$student_info.student_id_str",
                    "first_name": "$student_info.first_name",
                    "last_name": "$student_info.last_name"
                },
                "components": 1,
                "final_grade": 1,
                "final_percentage": 1,
                "calculated_at": 1
            }},
            {"$sort": {"student.name": 1}}
        ]))

        # Use the serialize_document function to properly handle ObjectIds
        serialized_grades = []
        for grade in grades:
            serialized_grade = serialize_document(grade)
            serialized_grades.append(serialized_grade)

        return jsonify(serialized_grades), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve grades", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/grades/bulk', methods=['POST'])
@role_required('teacher')
def bulk_upload_grades(teacher_id, course_id_str):
    """Bulk upload grades via CSV data."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    data = request.get_json()
    grades_data = data.get('grades', [])

    if not grades_data:
        return jsonify({"message": "No grades data provided"}), 400

    try:
        updated_count = 0
        error_count = 0
        errors = []

        for grade_entry in grades_data:
            try:
                student_id_str = grade_entry.get('student_id')
                component_name = grade_entry.get('component_name')
                points_earned = float(grade_entry.get('points_earned', 0))
                total_points = float(grade_entry.get('total_points', 0))

                # Find student
                student = mongo.db.users.find_one({
                    "$or": [
                        {"student_id_str": student_id_str},
                        {"email": student_id_str},
                        {"username": student_id_str}
                    ],
                    "role": "student"
                })

                if not student:
                    errors.append(f"Student not found: {student_id_str}")
                    error_count += 1
                    continue

                # Update or create grade record
                grade_component = {
                    "component_type": "manual",
                    "name": component_name,
                    "points_earned": points_earned,
                    "total_points": total_points,
                    "weight": 1.0
                }

                result = mongo.db.grades.update_one(
                    {"student_id": student['_id'], "course_id": course_id},
                    {
                        "$push": {"components": grade_component},
                        "$set": {"calculated_at": datetime.utcnow()}
                    },
                    upsert=True
                )

                if result.modified_count > 0 or result.upserted_id:
                    updated_count += 1

            except Exception as e:
                errors.append(f"Error processing {grade_entry}: {str(e)}")
                error_count += 1

        return jsonify({
            "message": f"Bulk upload completed. {updated_count} grades updated, {error_count} errors.",
            "updated_count": updated_count,
            "error_count": error_count,
            "errors": errors
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to process bulk upload", "error": str(e)}), 500

# Individual grade component management
@teacher_bp.route('/courses/<string:course_id_str>/students/<string:student_id_str>/grades/components', methods=['POST'])
@role_required('teacher')
def add_grade_component(teacher_id, course_id_str, student_id_str):
    """Add a grade component to a student's record."""
    try:
        course_id = ObjectId(course_id_str)
        student_id = ObjectId(student_id_str)
    except Exception:
        return jsonify({"message": "Invalid ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    # Verify student is enrolled in course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": student_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Student not found in this course"}), 404

    data = request.get_json()
    try:
        grade_component = {
            "component_type": data.get('component_type', 'manual'),
            "name": data.get('name', ''),
            "points_earned": float(data.get('points_earned', 0)),
            "total_points": float(data.get('total_points', 100)),
            "weight": float(data.get('weight', 1.0)),
            "component_id": str(ObjectId())  # Generate unique component ID
        }

        result = mongo.db.grades.update_one(
            {"student_id": student_id, "course_id": course_id},
            {
                "$push": {"components": grade_component},
                "$set": {"calculated_at": datetime.utcnow()}
            },
            upsert=True
        )

        return jsonify({"message": "Grade component added successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to add grade component", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/students/<string:student_id_str>/grades/components/<string:component_id_str>', methods=['PUT'])
@role_required('teacher')
def update_grade_component(teacher_id, course_id_str, student_id_str, component_id_str):
    """Update a specific grade component."""
    try:
        course_id = ObjectId(course_id_str)
        student_id = ObjectId(student_id_str)
    except Exception:
        return jsonify({"message": "Invalid ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    data = request.get_json()
    try:
        update_fields = {}
        if 'component_type' in data:
            update_fields["components.$.component_type"] = data['component_type']
        if 'name' in data:
            update_fields["components.$.name"] = data['name']
        if 'points_earned' in data:
            update_fields["components.$.points_earned"] = float(data['points_earned'])
        if 'total_points' in data:
            update_fields["components.$.total_points"] = float(data['total_points'])
        if 'weight' in data:
            update_fields["components.$.weight"] = float(data['weight'])
        
        update_fields["calculated_at"] = datetime.utcnow()

        result = mongo.db.grades.update_one(
            {
                "student_id": student_id,
                "course_id": course_id,
                "components.component_id": component_id_str
            },
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return jsonify({"message": "Grade component not found"}), 404

        return jsonify({"message": "Grade component updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to update grade component", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/students/<string:student_id_str>/grades/components/<string:component_id_str>', methods=['DELETE'])
@role_required('teacher')
def delete_grade_component(teacher_id, course_id_str, student_id_str, component_id_str):
    """Delete a specific grade component."""
    try:
        course_id = ObjectId(course_id_str)
        student_id = ObjectId(student_id_str)
    except Exception:
        return jsonify({"message": "Invalid ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        result = mongo.db.grades.update_one(
            {"student_id": student_id, "course_id": course_id},
            {
                "$pull": {"components": {"component_id": component_id_str}},
                "$set": {"calculated_at": datetime.utcnow()}
            }
        )

        if result.matched_count == 0:
            return jsonify({"message": "Grade record not found"}), 404

        return jsonify({"message": "Grade component deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Failed to delete grade component", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/students/<string:student_id_str>/grades', methods=['GET'])
@role_required('teacher')
def get_student_grade(teacher_id, course_id_str, student_id_str):
    """Get individual student's grade record."""
    try:
        course_id = ObjectId(course_id_str)
        student_id = ObjectId(student_id_str)
    except Exception:
        return jsonify({"message": "Invalid ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        grade_cursor = mongo.db.grades.aggregate([
            {"$match": {"student_id": student_id, "course_id": course_id}},
            {"$lookup": {
                "from": "users",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student_info"
            }},
            {"$unwind": "$student_info"},
            {"$project": {
                "_id": 1,
                "student_id": 1,
                "course_id": 1,
                "student": {
                    "id": "$student_info._id",
                    "name": {
                        "$concat": [
                            "$student_info.first_name",
                            " ",
                            "$student_info.last_name"
                        ]
                    },
                    "email": "$student_info.email",
                    "student_id_str": "$student_info.student_id_str",
                    "first_name": "$student_info.first_name",
                    "last_name": "$student_info.last_name"
                },
                "components": 1,
                "final_grade": 1,
                "final_percentage": 1,
                "calculated_at": 1
            }}
        ])

        try:
            grade = next(grade_cursor)
            if grade:
                serialized_grade = serialize_document(grade)
                return jsonify(serialized_grade), 200
            else:
                return jsonify({"message": "Grade record not found"}), 404
        except StopIteration:
            return jsonify({"message": "Grade record not found"}), 404
    except Exception as e:
        return jsonify({"message": "Failed to retrieve student grade", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/grades/calculate', methods=['POST'])
@role_required('teacher')
def calculate_final_grades(teacher_id, course_id_str):
    """Calculate final grades for all students in the course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        grades = mongo.db.grades.find({"course_id": course_id})
        updated_count = 0

        for grade in grades:
            if grade.get('components'):
                # Calculate weighted average
                total_weighted_points = sum(
                    (comp['points_earned'] / comp['total_points']) * comp['weight']
                    for comp in grade['components']
                )
                total_weight = sum(comp['weight'] for comp in grade['components'])
                
                if total_weight > 0:
                    final_percentage = (total_weighted_points / total_weight) * 100
                    
                    # Convert to letter grade
                    if final_percentage >= 90:
                        final_grade = 'A'
                    elif final_percentage >= 80:
                        final_grade = 'B'
                    elif final_percentage >= 70:
                        final_grade = 'C'
                    elif final_percentage >= 60:
                        final_grade = 'D'
                    else:
                        final_grade = 'F'
                    
                    mongo.db.grades.update_one(
                        {"_id": grade['_id']},
                        {
                            "$set": {
                                "final_percentage": final_percentage,
                                "final_grade": final_grade,
                                "calculated_at": datetime.utcnow()
                            }
                        }
                    )
                    updated_count += 1

        return jsonify({
            "message": f"Final grades calculated for {updated_count} students",
            "updated_count": updated_count
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to calculate final grades", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/grades/stats', methods=['GET'])
@role_required('teacher')
def get_course_grade_stats(teacher_id, course_id_str):
    """Get grade statistics for the course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        grades = list(mongo.db.grades.find({"course_id": course_id}))
        
        if not grades:
            return jsonify({
                "total_students": 0,
                "average_grade": 0,
                "highest_grade": 0,
                "lowest_grade": 0,
                "passing_rate": 0
            }), 200

        # Calculate current percentages for each student
        percentages = []
        for grade in grades:
            if grade.get('components'):
                total_weighted_points = sum(
                    (comp['points_earned'] / comp['total_points']) * comp['weight']
                    for comp in grade['components']
                )
                total_weight = sum(comp['weight'] for comp in grade['components'])
                
                if total_weight > 0:
                    percentage = (total_weighted_points / total_weight) * 100
                    percentages.append(percentage)

        if percentages:
            average_grade = sum(percentages) / len(percentages)
            highest_grade = max(percentages)
            lowest_grade = min(percentages)
            passing_count = sum(1 for p in percentages if p >= 60)
            passing_rate = (passing_count / len(percentages)) * 100
        else:
            average_grade = highest_grade = lowest_grade = passing_rate = 0

        return jsonify({
            "total_students": len(grades),
            "average_grade": average_grade,
            "highest_grade": highest_grade,
            "lowest_grade": lowest_grade,
            "passing_rate": passing_rate
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve grade statistics", "error": str(e)}), 500

@teacher_bp.route('/courses/<string:course_id_str>/grades/export', methods=['GET'])
@role_required('teacher')
def export_grades_to_csv(teacher_id, course_id_str):
    """Export grades to CSV format."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    # Verify teacher teaches this course
    course = mongo.db.courses.find_one({"_id": course_id, "teacher_id": teacher_id})
    if not course:
        return jsonify({"message": "Course not found or you are not assigned to teach this course."}), 404

    try:
        import csv
        import io
        
        # Get all grades with student info
        grades = list(mongo.db.grades.aggregate([
            {"$match": {"course_id": course_id}},
            {"$lookup": {
                "from": "users",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student_info"
            }},
            {"$unwind": "$student_info"},
            {"$sort": {"student_info.last_name": 1, "student_info.first_name": 1}}
        ]))

        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        header = ['Student ID', 'First Name', 'Last Name', 'Email']
        
        # Get all unique component names
        all_components = set()
        for grade in grades:
            for comp in grade.get('components', []):
                all_components.add(comp['name'])
        
        header.extend(sorted(all_components))
        header.extend(['Final Percentage', 'Final Grade'])
        writer.writerow(header)
        
        # Write data rows
        for grade in grades:
            student = grade['student_info']
            row = [
                student.get('student_id_str', ''),
                student.get('first_name', ''),
                student.get('last_name', ''),
                student.get('email', '')
            ]
            
            # Add component scores
            component_scores = {}
            for comp in grade.get('components', []):
                percentage = (comp['points_earned'] / comp['total_points']) * 100
                component_scores[comp['name']] = f"{percentage:.1f}%"
            
            for comp_name in sorted(all_components):
                row.append(component_scores.get(comp_name, ''))
            
            # Add final grades
            row.append(f"{grade.get('final_percentage', 0):.1f}%" if grade.get('final_percentage') else '')
            row.append(grade.get('final_grade', ''))
            
            writer.writerow(row)
        
        # Create response
        output.seek(0)
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={course["course_code"]}_grades.csv'
            }
        )
    except Exception as e:
        return jsonify({"message": "Failed to export grades", "error": str(e)}), 500

# === ANALYTICS AND REPORTS ===

@teacher_bp.route('/analytics', methods=['GET'])
@role_required('teacher')
def get_teacher_analytics(teacher_id):
    """Get analytics overview for the teacher."""
    try:
        # Get basic statistics
        total_courses = mongo.db.courses.count_documents({"teacher_id": teacher_id})
        total_students = mongo.db.enrollments.count_documents({
            "course_id": {"$in": [
                course['_id'] for course in 
                mongo.db.courses.find({"teacher_id": teacher_id}, {"_id": 1})
            ]},
            "status": "enrolled"
        })
        total_assignments = mongo.db.assignments.count_documents({"teacher_id": teacher_id})
        total_quizzes = mongo.db.quizzes.count_documents({"teacher_id": teacher_id})

        # Get pending grading count
        pending_grading = mongo.db.assignment_submissions.count_documents({
            "assignment_id": {"$in": [
                assignment['_id'] for assignment in 
                mongo.db.assignments.find({"teacher_id": teacher_id}, {"_id": 1})
            ]},
            "score": {"$exists": False}
        })

        analytics = {
            "overview": {
                "total_courses": total_courses,
                "total_students": total_students,
                "total_assignments": total_assignments,
                "total_quizzes": total_quizzes,
                "pending_grading": pending_grading
            }
        }

        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve analytics", "error": str(e)}), 500

@teacher_bp.route('/reports/analytics', methods=['GET'])
@role_required('teacher')
def generate_teacher_analytics_report(teacher_id):
    """Generate comprehensive analytics report for teacher."""
    try:
        from backend.utils.pdf_generator import PDFGenerator
        
        pdf_gen = PDFGenerator()
        analytics_pdf = pdf_gen.generate_teacher_analytics(teacher_id)
        
        from flask import send_file
        return send_file(
            analytics_pdf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'teacher_analytics_{teacher_id}.pdf'
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate analytics report", "error": str(e)}), 500 