from flask import Blueprint, request, jsonify, send_from_directory
from functools import wraps
from extensions import mongo
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import uuid

student_bp = Blueprint('student_bp', __name__)

# --- Helper for Role-Based Access Control ---
def role_required(role_name):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_identity = get_jwt_identity()
            # Assuming current_user_identity is a dict like {'username': 'teststudent', 'role': 'student'}
            if not isinstance(current_user_identity, dict) or current_user_identity.get('role') != role_name:
                return jsonify({"message": "Unauthorized: Action requires {} role".format(role_name)}), 403
            
            # Fetch the full user document to get the ObjectId
            user = mongo.db.users.find_one({"username": current_user_identity.get('username')})
            if not user:
                return jsonify({"message": "Authenticated user not found in database."}), 404
            
            # Pass the user's ObjectId (or full user object) to the decorated function
            return fn(user_id=user['_id'], *args, **kwargs)
        return wrapper
    return decorator

# Placeholder for student routes
@student_bp.route('/ping', methods=['GET'])
@role_required('student')
def ping_student(user_id):
    return jsonify({"message": "Student endpoint reached!", "user_id": str(user_id)}), 200

# Dashboard stats endpoint
@student_bp.route('/dashboard/stats', methods=['GET'])
@role_required('student')
def get_student_dashboard_stats(user_id):
    """Get dashboard statistics for the student."""
    try:
        # Get enrolled courses
        enrolled_enrollments = list(mongo.db.enrollments.find({"student_id": user_id, "status": "enrolled"}))
        enrolled_course_ids = [enrollment['course_id'] for enrollment in enrolled_enrollments]
        
        total_courses = len(enrolled_course_ids)
        
        # Get total credits
        if enrolled_course_ids:
            courses = list(mongo.db.courses.find({"_id": {"$in": enrolled_course_ids}}, {"credits": 1}))
            total_credits = sum(course.get('credits', 0) for course in courses)
        else:
            total_credits = 0
        
        # Get upcoming assignments (due in the future)
        upcoming_assignments = mongo.db.assignments.count_documents({
            "course_id": {"$in": enrolled_course_ids} if enrolled_course_ids else [],
            "due_date": {"$gte": datetime.utcnow()},
            "is_published": True
        })
        
        # Get upcoming quizzes (due in the future)
        upcoming_quizzes = mongo.db.quizzes.count_documents({
            "course_id": {"$in": enrolled_course_ids} if enrolled_course_ids else [],
            "due_date": {"$gte": datetime.utcnow()},
            "is_published": True
        })
        
        # Get completed assignments count
        completed_assignments = mongo.db.assignment_submissions.count_documents({
            "student_id": user_id,
            "status": {"$in": ["submitted", "graded"]}
        })
        
        # Get completed quizzes count
        completed_quizzes = mongo.db.quiz_submissions.count_documents({
            "student_id": user_id
        })
        
        # Calculate average grade if grades exist
        grades = list(mongo.db.grades.find({"student_id": user_id, "final_percentage": {"$exists": True}}))
        average_grade = 0
        if grades:
            total_percentage = sum(grade.get('final_percentage', 0) for grade in grades)
            average_grade = total_percentage / len(grades)

        stats = {
            "total_courses": total_courses,
            "total_credits": total_credits,
            "upcoming_assignments": upcoming_assignments,
            "upcoming_quizzes": upcoming_quizzes,
            "completed_assignments": completed_assignments,
            "completed_quizzes": completed_quizzes,
            "average_grade": average_grade
        }

        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve dashboard stats", "error": str(e)}), 500

# We will add course enrollment and other student-specific routes here.

@student_bp.route('/courses/available', methods=['GET'])
@role_required('student')
def get_available_courses(user_id):
    """Lists all courses available for enrollment (not necessarily checking if student already enrolled)."""
    try:
        # Use aggregation pipeline to compare current_enrollment with max_capacity
        pipeline = [
            {
                "$match": {
                    "$expr": {"$lt": ["$current_enrollment", "$max_capacity"]}
                }
            },
            {
                "$sort": {"course_code": 1}
            },
            {
                "$project": { # Specify fields to return
                    "_id": 1,
                    "course_code": 1,
                    "course_name": 1,
                    "description": 1,
                    "credits": 1,
                    "department": 1,
                    "semester": 1,
                    "year": 1,
                    "max_capacity": 1,
                    "current_enrollment": 1,
                    "teacher_id": 1 # Keep teacher_id for potential display
                }
            }
        ]
        courses_cursor = mongo.db.courses.aggregate(pipeline)
        courses_list = []
        for course in courses_cursor:
            # Convert all ObjectId fields to strings
            course['_id'] = str(course['_id'])
            if course.get('teacher_id'):
                course['teacher_id'] = str(course['teacher_id'])
            
            # Convert any other ObjectId fields that might exist
            for field in ['assignments', 'quizzes']:
                if course.get(field) and isinstance(course[field], list):
                    course[field] = [str(item) if hasattr(item, '__str__') else item for item in course[field]]
            
            # Populate teacher info if needed
            if course.get('teacher_id'):
                try:
                    # Use the original teacher_id ObjectId for the query
                    teacher_id = course['teacher_id']
                    if isinstance(teacher_id, str):
                        teacher_id = ObjectId(teacher_id)
                    
                    teacher = mongo.db.users.find_one(
                        {"_id": teacher_id}, 
                        {"first_name": 1, "last_name": 1, "email": 1}
                    )
                    
                    if teacher:
                        course['teacher_info'] = {
                            "name": f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip(),
                            "email": teacher.get('email')
                        }
                    else:
                        course['teacher_info'] = None
                        
                except Exception as e:
                    # If teacher lookup fails, just set teacher_info to None
                    course['teacher_info'] = None
            
            courses_list.append(course)
        
        return jsonify(courses_list), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve available courses", "error": str(e)}), 500

@student_bp.route('/courses/enroll/<string:course_id_str>', methods=['POST'])
@role_required('student')
def enroll_in_course(user_id, course_id_str):
    """Enroll a student in a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    try:
        # 1. Check if course exists and has capacity
        course = mongo.db.courses.find_one({"_id": course_id})
        if not course:
            return jsonify({"message": "Course not found"}), 404
        
        # Check capacity
        if course.get('current_enrollment', 0) >= course.get('max_capacity', 0):
            return jsonify({"message": "Course is full"}), 400
        
        # 2. Check if student is already enrolled
        existing_enrollment = mongo.db.enrollments.find_one({
            "student_id": user_id,
            "course_id": course_id
        })
        if existing_enrollment:
            if existing_enrollment['status'] == 'enrolled':
                return jsonify({"message": "Already enrolled in this course"}), 400
            elif existing_enrollment['status'] == 'dropped':
                # Re-enroll the student
                mongo.db.enrollments.update_one(
                    {"_id": existing_enrollment['_id']},
                    {"$set": {"status": "enrolled", "enrollment_date": datetime.utcnow()}}
                )
            else:
                return jsonify({"message": f"Current enrollment status: {existing_enrollment['status']}"}), 400
        else:
            # 3. Create new enrollment record
            enrollment_data = {
                "student_id": user_id,
                "course_id": course_id,
                "status": "enrolled",
                "enrollment_date": datetime.utcnow()
            }
            mongo.db.enrollments.insert_one(enrollment_data)
        
        # 4. Update course enrollment count
        mongo.db.courses.update_one(
            {"_id": course_id},
            {"$inc": {"current_enrollment": 1}}
        )
        
        return jsonify({"message": "Successfully enrolled in course"}), 201
        
    except Exception as e:
        return jsonify({"message": "Failed to enroll in course", "error": str(e)}), 500

@student_bp.route('/courses/drop/<string:course_id_str>', methods=['POST'])
@role_required('student')
def drop_course(user_id, course_id_str):
    """Drop a student from a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400

    try:
        # 1. Check if student is enrolled in this course
        enrollment = mongo.db.enrollments.find_one({
            "student_id": user_id,
            "course_id": course_id,
            "status": "enrolled"
        })
        if not enrollment:
            return jsonify({"message": "Not enrolled in this course"}), 404
        
        # 2. Update enrollment status to 'dropped'
        mongo.db.enrollments.update_one(
            {"_id": enrollment['_id']},
            {"$set": {"status": "dropped", "drop_date": datetime.utcnow()}}
        )
        
        # 3. Decrease course enrollment count
        mongo.db.courses.update_one(
            {"_id": course_id},
            {"$inc": {"current_enrollment": -1}}
        )
        
        return jsonify({"message": "Successfully dropped from course"}), 200
        
    except Exception as e:
        return jsonify({"message": "Failed to drop course", "error": str(e)}), 500

@student_bp.route('/courses/my', methods=['GET'])
@role_required('student')
def get_my_enrolled_courses(user_id):
    """Lists all courses the student is currently enrolled in."""
    try:
        # Get limit parameter if provided
        limit = request.args.get('limit', type=int)
        
        # Find all 'enrolled' records for the student
        enrollment_records = mongo.db.enrollments.find({"student_id": user_id, "status": "enrolled"})
        
        course_ids = [record['course_id'] for record in enrollment_records]
        if not course_ids:
            return jsonify([]), 200 # No courses enrolled

        # Fetch details of these courses
        enrolled_courses_cursor = mongo.db.courses.find({"_id": {"$in": course_ids}}).sort("course_code", 1)
        
        # Apply limit if specified
        if limit:
            enrolled_courses_cursor = enrolled_courses_cursor.limit(limit)
        
        enrolled_courses_list = []
        for course in enrolled_courses_cursor:
            # Convert all ObjectId fields to strings
            course['_id'] = str(course['_id'])
            if course.get('teacher_id'):
                course['teacher_id'] = str(course['teacher_id'])
            
            # Convert any other ObjectId fields that might exist
            for field in ['assignments', 'quizzes']:
                if course.get(field) and isinstance(course[field], list):
                    course[field] = [str(item) if hasattr(item, '__str__') else item for item in course[field]]
            
            # Populate teacher info if needed
            if course.get('teacher_id'):
                try:
                    # Use the original teacher_id ObjectId for the query
                    teacher_id = course['teacher_id']
                    if isinstance(teacher_id, str):
                        teacher_id = ObjectId(teacher_id)
                    
                    teacher = mongo.db.users.find_one(
                        {"_id": teacher_id}, 
                        {"first_name": 1, "last_name": 1, "email": 1}
                    )
                    
                    if teacher:
                        course['teacher_info'] = {
                            "name": f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip(),
                            "email": teacher.get('email')
                        }
                    else:
                        course['teacher_info'] = None
                        
                except Exception as e:
                    # If teacher lookup fails, just set teacher_info to None
                    course['teacher_info'] = None
            
            enrolled_courses_list.append(course)
            
        return jsonify(enrolled_courses_list), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve enrolled courses", "error": str(e)}), 500

# === ASSIGNMENT FUNCTIONALITY ===

@student_bp.route('/courses/<string:course_id_str>/assignments', methods=['GET'])
@role_required('student')
def get_course_assignments(user_id, course_id_str):
    """Get all assignments for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    # Verify student is enrolled in the course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": user_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Not enrolled in this course"}), 403
    
    try:
        # Get assignments for the course
        assignments = list(mongo.db.assignments.find({
            "course_id": course_id,
            "is_published": True
        }).sort("due_date", 1))
        
        assignments_with_submissions = []
        for assignment in assignments:
            # Create a clean copy of the assignment
            clean_assignment = {}
            
            # Convert ObjectIds to strings
            clean_assignment['_id'] = str(assignment['_id'])
            clean_assignment['course_id'] = str(assignment['course_id'])
            clean_assignment['teacher_id'] = str(assignment['teacher_id'])
            
            # Copy fields with proper handling
            clean_assignment['title'] = assignment.get('title', 'Untitled Assignment')
            clean_assignment['description'] = assignment.get('description', '')
            clean_assignment['assignment_type'] = assignment.get('assignment_type', 'homework')
            clean_assignment['total_points'] = assignment.get('total_points', 100)
            clean_assignment['instructions'] = assignment.get('instructions', '')
            clean_assignment['attachments'] = assignment.get('attachments', [])
            clean_assignment['is_published'] = assignment.get('is_published', True)
            
            # Handle datetime fields properly
            due_date = assignment.get('due_date')
            if isinstance(due_date, datetime):
                clean_assignment['due_date'] = due_date.isoformat()
            else:
                clean_assignment['due_date'] = str(due_date) if due_date else datetime.utcnow().isoformat()
                
            created_date = assignment.get('created_date')
            if isinstance(created_date, datetime):
                clean_assignment['created_date'] = created_date.isoformat()
            elif created_date:
                clean_assignment['created_date'] = str(created_date)
            else:
                clean_assignment['created_date'] = clean_assignment['due_date']
            
            # Check if student has submitted this assignment
            submission = mongo.db.assignment_submissions.find_one({
                "student_id": user_id,
                "assignment_id": ObjectId(clean_assignment['_id'])
            })
            
            # Add submission information
            clean_assignment['submission_status'] = submission['status'] if submission else 'not_submitted'
            if submission and submission.get('submission_date'):
                if isinstance(submission['submission_date'], datetime):
                    clean_assignment['submission_date'] = submission['submission_date'].isoformat()
                else:
                    clean_assignment['submission_date'] = str(submission['submission_date'])
            else:
                clean_assignment['submission_date'] = None
                
            clean_assignment['score'] = submission.get('score') if submission else None
            clean_assignment['feedback'] = submission.get('feedback') if submission else None
            clean_assignment['submitted_attachments'] = submission.get('attachments', []) if submission else []
            
            assignments_with_submissions.append(clean_assignment)
        
        return jsonify(assignments_with_submissions), 200
    except Exception as e:
        import traceback
        print(f"Error in get_course_assignments: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"message": "Failed to retrieve assignments", "error": str(e)}), 500

@student_bp.route('/assignments/<string:assignment_id_str>/submit', methods=['POST'])
@role_required('student')
def submit_assignment(user_id, assignment_id_str):
    """Submit an assignment."""
    try:
        assignment_id = ObjectId(assignment_id_str)
    except Exception:
        return jsonify({"message": "Invalid assignment ID format"}), 400
    
    data = request.get_json()
    content = data.get('content', '')
    attachments = data.get('attachments', [])
    
    try:
        # Check if assignment exists and is published
        assignment = mongo.db.assignments.find_one({
            "_id": assignment_id,
            "is_published": True
        })
        if not assignment:
            return jsonify({"message": "Assignment not found or not published"}), 404
        
        # Check if student is enrolled in the course
        enrollment = mongo.db.enrollments.find_one({
            "student_id": user_id,
            "course_id": assignment['course_id'],
            "status": "enrolled"
        })
        if not enrollment:
            return jsonify({"message": "Not enrolled in this course"}), 403
        
        # Check if assignment is past due
        current_time = datetime.utcnow()
        due_date = assignment['due_date']
        is_late = current_time > due_date
        
        # Check if already submitted
        existing_submission = mongo.db.assignment_submissions.find_one({
            "student_id": user_id,
            "assignment_id": assignment_id
        })
        
        submission_data = {
            "student_id": user_id,
            "assignment_id": assignment_id,
            "content": content,
            "attachments": attachments,
            "submission_date": current_time,
            "status": "late" if is_late else "submitted"
        }
        
        if existing_submission:
            # Update existing submission
            mongo.db.assignment_submissions.update_one(
                {"_id": existing_submission['_id']},
                {"$set": submission_data}
            )
            message = "Assignment resubmitted successfully"
        else:
            # Create new submission
            mongo.db.assignment_submissions.insert_one(submission_data)
            message = "Assignment submitted successfully"
        
        if is_late:
            message += " (submitted late)"
        
        return jsonify({"message": message}), 201
    except Exception as e:
        return jsonify({"message": "Failed to submit assignment", "error": str(e)}), 500

# === QUIZ FUNCTIONALITY ===

@student_bp.route('/courses/<string:course_id_str>/quizzes', methods=['GET'])
@role_required('student')
def get_course_quizzes(user_id, course_id_str):
    """Get all quizzes for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    # Verify student is enrolled in the course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": user_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Not enrolled in this course"}), 403
    
    try:
        current_time = datetime.utcnow()
        
        # Get quizzes for the course that are available
        quizzes = list(mongo.db.quizzes.find({
            "course_id": course_id,
            "is_published": True,
            "start_date": {"$lte": current_time}
        }).sort("due_date", 1))
        
        quizzes_with_submissions = []
        for quiz in quizzes:
            quiz['_id'] = str(quiz['_id'])
            quiz['course_id'] = str(quiz['course_id'])
            quiz['teacher_id'] = str(quiz['teacher_id'])
            
            # Check if student has taken this quiz
            submission = mongo.db.quiz_submissions.find_one({
                "student_id": user_id,
                "quiz_id": ObjectId(quiz['_id'])
            })
            
            quiz['submission_status'] = submission['status'] if submission else 'not_taken'
            quiz['submission_date'] = submission['submission_date'] if submission else None
            quiz['score'] = submission.get('total_score') if submission else None
            quiz['is_available'] = current_time <= quiz['due_date']
            
            # Don't include answers in student view
            if 'questions' in quiz:
                for question in quiz['questions']:
                    question.pop('correct_answer', None)
            
            quizzes_with_submissions.append(quiz)
        
        return jsonify(quizzes_with_submissions), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve quizzes", "error": str(e)}), 500

@student_bp.route('/quizzes/<string:quiz_id_str>/take', methods=['POST'])
@role_required('student')
def submit_quiz(user_id, quiz_id_str):
    """Submit quiz answers."""
    try:
        quiz_id = ObjectId(quiz_id_str)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400
    
    data = request.get_json()
    answers = data.get('answers', [])
    
    try:
        # Check if quiz exists and is available
        quiz = mongo.db.quizzes.find_one({
            "_id": quiz_id,
            "is_published": True
        })
        if not quiz:
            return jsonify({"message": "Quiz not found or not available"}), 404
        
        current_time = datetime.utcnow()
        if current_time < quiz['start_date'] or current_time > quiz['due_date']:
            return jsonify({"message": "Quiz is not currently available"}), 400
        
        # Check if student is enrolled in the course
        enrollment = mongo.db.enrollments.find_one({
            "student_id": user_id,
            "course_id": quiz['course_id'],
            "status": "enrolled"
        })
        if not enrollment:
            return jsonify({"message": "Not enrolled in this course"}), 403
        
        # Check if already submitted
        existing_submission = mongo.db.quiz_submissions.find_one({
            "student_id": user_id,
            "quiz_id": quiz_id
        })
        if existing_submission:
            return jsonify({"message": "Quiz already submitted"}), 409
        
        # Grade the quiz
        total_score = 0
        graded_answers = []
        
        for i, answer in enumerate(answers):
            if i < len(quiz['questions']):
                question = quiz['questions'][i]
                is_correct = answer.get('answer', '').strip().lower() == question.get('correct_answer', '').strip().lower()
                points_earned = question['points'] if is_correct else 0
                total_score += points_earned
                
                graded_answers.append({
                    "question_index": i,
                    "answer": answer.get('answer', ''),
                    "is_correct": is_correct,
                    "points_earned": points_earned
                })
        
        # Create submission
        submission_data = {
            "student_id": user_id,
            "quiz_id": quiz_id,
            "answers": graded_answers,
            "total_score": total_score,
            "submission_date": current_time,
            "status": "submitted"
        }
        
        mongo.db.quiz_submissions.insert_one(submission_data)
        
        return jsonify({
            "message": "Quiz submitted successfully",
            "score": total_score,
            "total_possible": quiz['total_points']
        }), 201
    except Exception as e:
        return jsonify({"message": "Failed to submit quiz", "error": str(e)}), 500

# === GRADES FUNCTIONALITY ===

@student_bp.route('/courses/<string:course_id_str>/grades', methods=['GET'])
@role_required('student')
def get_course_grades(user_id, course_id_str):
    """Get detailed grades for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    # Verify student is enrolled in the course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": user_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Not enrolled in this course"}), 403
    
    try:
        # Get course info
        course = mongo.db.courses.find_one({"_id": course_id})
        
        # Get grades record
        grades = mongo.db.grades.find_one({
            "student_id": user_id,
            "course_id": course_id
        })
        
        # Get all assignment submissions
        assignment_submissions = list(mongo.db.assignment_submissions.find({
            "student_id": user_id
        }))
        
        # Get all quiz submissions
        quiz_submissions = list(mongo.db.quiz_submissions.find({
            "student_id": user_id
        }))
        
        # Build comprehensive grade report
        grade_report = {
            "course": {
                "course_code": course['course_code'],
                "course_name": course['course_name'],
                "credits": course.get('credits', 0)
            },
            "assignments": [],
            "quizzes": [],
            "final_grade": grades.get('final_grade') if grades else None,
            "final_percentage": grades.get('final_percentage') if grades else None,
            "components": grades.get('components', []) if grades else []
        }
        
        # Add assignment grades
        for submission in assignment_submissions:
            assignment = mongo.db.assignments.find_one({"_id": submission['assignment_id']})
            if assignment and assignment['course_id'] == course_id:
                grade_report["assignments"].append({
                    "title": assignment['title'],
                    "due_date": assignment['due_date'],
                    "total_points": assignment['total_points'],
                    "score": submission.get('score'),
                    "feedback": submission.get('feedback'),
                    "submission_date": submission['submission_date'],
                    "status": submission['status']
                })
        
        # Add quiz grades
        for submission in quiz_submissions:
            quiz = mongo.db.quizzes.find_one({"_id": submission['quiz_id']})
            if quiz and quiz['course_id'] == course_id:
                grade_report["quizzes"].append({
                    "title": quiz['title'],
                    "due_date": quiz['due_date'],
                    "total_points": quiz['total_points'],
                    "score": submission.get('total_score'),
                    "submission_date": submission['submission_date'],
                    "status": submission['status']
                })
        
        return jsonify(grade_report), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve grades", "error": str(e)}), 500

# === ATTENDANCE FUNCTIONALITY ===

@student_bp.route('/courses/<string:course_id_str>/attendance', methods=['GET'])
@role_required('student')
def get_course_attendance(user_id, course_id_str):
    """Get attendance record for a specific course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    # Verify student is enrolled in the course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": user_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Not enrolled in this course"}), 403
    
    try:
        # Get all attendance records for the course
        attendance_records = list(mongo.db.attendance.find({
            "course_id": course_id
        }).sort("date", 1))
        
        total_classes = len(attendance_records)
        attended_classes = 0
        attendance_details = []
        
        user_id_str = str(user_id)
        
        for record in attendance_records:
            was_present = record.get('student_attendances', {}).get(user_id_str, False)
            if was_present:
                attended_classes += 1
            
            attendance_details.append({
                "date": record['date'],
                "present": was_present
            })
        
        attendance_percentage = (attended_classes / total_classes * 100) if total_classes > 0 else 0
        
        return jsonify({
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "attendance_percentage": round(attendance_percentage, 2),
            "details": attendance_details
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve attendance", "error": str(e)}), 500

# === COURSE FEEDBACK FUNCTIONALITY ===

@student_bp.route('/courses/<string:course_id_str>/feedback', methods=['POST'])
@role_required('student')
def submit_course_feedback(user_id, course_id_str):
    """Submit feedback for a course."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    data = request.get_json()
    rating = data.get('rating')
    comment = data.get('comment', '')
    
    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"message": "Rating must be an integer between 1 and 5"}), 400
    
    # Verify student is enrolled in the course
    enrollment = mongo.db.enrollments.find_one({
        "student_id": user_id,
        "course_id": course_id,
        "status": "enrolled"
    })
    if not enrollment:
        return jsonify({"message": "Not enrolled in this course"}), 403
    
    try:
        # Check if feedback already exists
        course = mongo.db.courses.find_one({"_id": course_id})
        existing_feedback = None
        
        for feedback in course.get('feedback', []):
            if feedback['student_id'] == user_id:
                existing_feedback = feedback
                break
        
        feedback_data = {
            "student_id": user_id,
            "rating": rating,
            "comment": comment,
            "date_posted": datetime.utcnow()
        }
        
        if existing_feedback:
            # Update existing feedback
            mongo.db.courses.update_one(
                {"_id": course_id, "feedback.student_id": user_id},
                {"$set": {"feedback.$": feedback_data}}
            )
            message = "Feedback updated successfully"
        else:
            # Add new feedback
            mongo.db.courses.update_one(
                {"_id": course_id},
                {"$push": {"feedback": feedback_data}}
            )
            message = "Feedback submitted successfully"
        
        return jsonify({"message": message}), 201
    except Exception as e:
        return jsonify({"message": "Failed to submit feedback", "error": str(e)}), 500

@student_bp.route('/courses/<string:course_id_str>/feedback', methods=['GET'])
@role_required('student')
def get_course_feedback(user_id, course_id_str):
    """Get course feedback (aggregated view for students)."""
    try:
        course_id = ObjectId(course_id_str)
    except Exception:
        return jsonify({"message": "Invalid course ID format"}), 400
    
    try:
        # Get course with feedback
        course = mongo.db.courses.find_one({"_id": course_id})
        if not course:
            return jsonify({"message": "Course not found"}), 404
        
        feedback_list = course.get('feedback', [])
        
        if not feedback_list:
            return jsonify({
                "average_rating": 0,
                "total_reviews": 0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }), 200
        
        # Calculate statistics
        total_reviews = len(feedback_list)
        total_rating = sum(f['rating'] for f in feedback_list)
        average_rating = total_rating / total_reviews
        
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for feedback in feedback_list:
            rating_distribution[feedback['rating']] += 1
        
        return jsonify({
            "average_rating": round(average_rating, 2),
            "total_reviews": total_reviews,
            "rating_distribution": rating_distribution
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve feedback", "error": str(e)}), 500

# === TRANSCRIPT AND REPORTS ===

@student_bp.route('/transcript', methods=['GET'])
@role_required('student')
def generate_transcript(user_id):
    """Generate and download student transcript."""
    try:
        from backend.utils.pdf_generator import PDFGenerator
        
        pdf_gen = PDFGenerator()
        transcript_pdf = pdf_gen.generate_transcript(user_id)
        
        # Return PDF file
        from flask import send_file
        return send_file(
            transcript_pdf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'transcript_{user_id}.pdf'
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate transcript", "error": str(e)}), 500

@student_bp.route('/calendar', methods=['GET'])
@role_required('student')
def get_student_calendar(user_id):
    """Get calendar events for the student."""
    try:
        # Get student's enrolled courses
        enrollments = mongo.db.enrollments.find({
            "student_id": user_id,
            "status": "enrolled"
        })
        
        course_ids = [enrollment['course_id'] for enrollment in enrollments]
        
        # Get calendar events for these courses
        events = list(mongo.db.calendar_events.find({
            "$or": [
                {"course_id": {"$in": course_ids}},
                {"attendees": user_id}
            ]
        }).sort("start_datetime", 1))
        
        # Format events for frontend
        formatted_events = []
        for event in events:
            formatted_events.append({
                "id": str(event['_id']),
                "title": event['title'],
                "description": event.get('description'),
                "start": event['start_datetime'].isoformat(),
                "end": event['end_datetime'].isoformat() if event.get('end_datetime') else None,
                "type": event['event_type'],
                "course_id": str(event['course_id']) if event.get('course_id') else None
            })
        
        return jsonify(formatted_events), 200
    except Exception as e:
        return jsonify({"message": "Failed to retrieve calendar", "error": str(e)}), 500

@student_bp.route('/upload/assignment-attachment', methods=['POST'])
@role_required('student')
def upload_assignment_attachment(user_id):
    """Upload an attachment for assignment submission."""
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400
    
    # Check file size (limit to 10MB)
    if file.content_length and file.content_length > 10 * 1024 * 1024:
        return jsonify({"message": "File too large. Maximum size is 10MB"}), 400
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'assignments')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(secure_filename(file.filename))[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Return the file URL that can be used in submission
        file_url = f"/api/student/uploads/assignments/{unique_filename}"
        
        return jsonify({
            "message": "File uploaded successfully",
            "file_url": file_url,
            "filename": secure_filename(file.filename),
            "size": os.path.getsize(file_path)
        }), 200
        
    except Exception as e:
        return jsonify({"message": "Failed to upload file", "error": str(e)}), 500

@student_bp.route('/uploads/assignments/<filename>')
@role_required('student')
def get_assignment_attachment(user_id, filename):
    """Serve uploaded assignment attachments."""
    try:
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'assignments')
        return send_from_directory(upload_dir, filename)
    except Exception as e:
        return jsonify({"message": "File not found", "error": str(e)}), 404 