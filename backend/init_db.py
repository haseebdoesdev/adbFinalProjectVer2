#!/usr/bin/env python3
"""
Database Initialization Script
Populates the university management system database with sample data.
Each collection will have at least 20 documents with realistic data.
"""

import os
import sys
from datetime import datetime, timedelta, date
from bson import ObjectId
from pymongo import MongoClient
from flask_bcrypt import Bcrypt  # Changed from werkzeug.security
import random
from typing import List, Dict

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config

class DatabaseInitializer:
    def __init__(self):
        self.client = MongoClient(Config.MONGO_URI)
        self.db = self.client.get_default_database()
        self.bcrypt = Bcrypt()  # Initialize bcrypt for password hashing
        
        # Sample data lists for realistic generation
        self.first_names = [
            "John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "William", "Amanda",
            "James", "Jessica", "Charles", "Ashley", "Joseph", "Brittany", "Thomas", "Samantha", "Christopher", "Jennifer",
            "Daniel", "Elizabeth", "Matthew", "Megan", "Anthony", "Lauren", "Mark", "Stephanie", "Donald", "Rachel"
        ]
        
        self.last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
            "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
            "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
        ]
        
        self.departments = [
            "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology", "English Literature",
            "History", "Psychology", "Economics", "Business Administration", "Engineering", "Art",
            "Music", "Philosophy", "Political Science", "Sociology", "Geography", "Statistics"
        ]
        
        self.majors = [
            "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology", "English", 
            "History", "Psychology", "Economics", "Business", "Engineering", "Art", "Music",
            "Philosophy", "Political Science", "Sociology", "Pre-Med", "Pre-Law"
        ]
        
        self.course_prefixes = {
            "Computer Science": ["CS", "CSE", "IT"],
            "Mathematics": ["MATH", "STAT"],
            "Physics": ["PHYS", "PHY"],
            "Chemistry": ["CHEM", "CHM"],
            "Biology": ["BIO", "BIOL"],
            "English Literature": ["ENG", "ENGL"],
            "History": ["HIST", "HIS"],
            "Psychology": ["PSY", "PSYC"],
            "Economics": ["ECON", "ECO"],
            "Business Administration": ["BUS", "MGT", "FIN"],
            "Engineering": ["ENG", "ENGR"],
            "Art": ["ART"],
            "Music": ["MUS"],
            "Philosophy": ["PHIL"],
            "Political Science": ["POLS", "GOV"],
            "Sociology": ["SOC"],
            "Geography": ["GEOG"],
            "Statistics": ["STAT"]
        }
        
        self.semesters = ["Fall 2023", "Spring 2024", "Fall 2024", "Spring 2025"]
        self.years = [2023, 2024, 2025]
        
        # Storage for created IDs to maintain relationships
        self.user_ids = {"students": [], "teachers": [], "admins": []}
        self.course_ids = []
        self.assignment_ids = []
        self.quiz_ids = []

    def clear_database(self):
        """Clear all collections before populating with new data."""
        print("Clearing existing database...")
        collections = [
            'users', 'courses', 'enrollments', 'assignments', 'quizzes',
            'assignment_submissions', 'quiz_submissions', 'attendance',
            'grades', 'calendar_events', 'notifications'
        ]
        
        for collection in collections:
            self.db[collection].delete_many({})
            print(f"Cleared {collection} collection")

    def create_indexes(self):
        """Create necessary database indexes for performance."""
        print("Creating database indexes...")
        
        # User indexes
        self.db.users.create_index("username", unique=True)
        self.db.users.create_index("email", unique=True)
        self.db.users.create_index("role")
        
        # Course indexes
        self.db.courses.create_index("course_code", unique=True)
        self.db.courses.create_index("teacher_id")
        self.db.courses.create_index("department")
        
        # Enrollment indexes
        self.db.enrollments.create_index([("student_id", 1), ("course_id", 1)], unique=True)
        self.db.enrollments.create_index("course_id")
        self.db.enrollments.create_index("student_id")
        
        # Assignment and Quiz indexes
        self.db.assignments.create_index("course_id")
        self.db.quizzes.create_index("course_id")
        
        # Submission indexes
        self.db.assignment_submissions.create_index([("student_id", 1), ("assignment_id", 1)], unique=True)
        self.db.quiz_submissions.create_index([("student_id", 1), ("quiz_id", 1)], unique=True)
        
        print("Database indexes created successfully")

    def create_users(self):
        """Create sample users: students, teachers, and admins."""
        print("Creating users...")
        
        users = []
        
        # Create admin users (5)
        for i in range(5):
            admin_id = ObjectId()
            self.user_ids["admins"].append(admin_id)
            
            user = {
                "_id": admin_id,
                "username": f"admin{i+1}",
                "email": f"admin{i+1}@university.edu",
                "password_hash": self.bcrypt.generate_password_hash("password123").decode('utf-8'),
                "first_name": random.choice(self.first_names),
                "last_name": random.choice(self.last_names),
                "role": "admin",
                "is_active": True,
                "date_joined": datetime.utcnow() - timedelta(days=random.randint(100, 500)),
                "last_login": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "enrolled_courses": [],
                "courses_teaching": []
            }
            users.append(user)
        
        # Create teacher users (25)
        for i in range(25):
            teacher_id = ObjectId()
            self.user_ids["teachers"].append(teacher_id)
            
            department = random.choice(self.departments)
            user = {
                "_id": teacher_id,
                "username": f"teacher{i+1}",
                "email": f"teacher{i+1}@university.edu",
                "password_hash": self.bcrypt.generate_password_hash("password123").decode('utf-8'),
                "first_name": random.choice(self.first_names),
                "last_name": random.choice(self.last_names),
                "role": "teacher",
                "is_active": True,
                "date_joined": datetime.utcnow() - timedelta(days=random.randint(200, 800)),
                "last_login": datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                "teacher_id_str": f"T{1000 + i}",
                "department": department,
                "enrolled_courses": [],
                "courses_teaching": []
            }
            users.append(user)
        
        # Create student users (50)
        for i in range(50):
            student_id = ObjectId()
            self.user_ids["students"].append(student_id)
            
            major = random.choice(self.majors)
            user = {
                "_id": student_id,
                "username": f"student{i+1}",
                "email": f"student{i+1}@university.edu",
                "password_hash": self.bcrypt.generate_password_hash("password123").decode('utf-8'),
                "first_name": random.choice(self.first_names),
                "last_name": random.choice(self.last_names),
                "role": "student",
                "is_active": True,
                "date_joined": datetime.utcnow() - timedelta(days=random.randint(50, 1000)),
                "last_login": datetime.utcnow() - timedelta(days=random.randint(1, 10)),
                "student_id_str": f"S{2000 + i}",
                "major": major,
                "enrolled_courses": [],
                "courses_teaching": []
            }
            users.append(user)
        
        self.db.users.insert_many(users)
        print(f"Created {len(users)} users")

    def create_courses(self):
        """Create sample courses."""
        print("Creating courses...")
        
        courses = []
        course_names = {
            "Computer Science": [
                "Introduction to Programming", "Data Structures", "Algorithms", "Database Systems",
                "Computer Networks", "Software Engineering", "Machine Learning", "Web Development",
                "Operating Systems", "Computer Architecture", "Artificial Intelligence", "Cybersecurity"
            ],
            "Mathematics": [
                "Calculus I", "Calculus II", "Linear Algebra", "Discrete Mathematics",
                "Statistics", "Probability Theory", "Abstract Algebra", "Real Analysis",
                "Differential Equations", "Number Theory"
            ],
            "Physics": [
                "General Physics I", "General Physics II", "Classical Mechanics", "Quantum Physics",
                "Thermodynamics", "Electromagnetism", "Modern Physics", "Astrophysics"
            ],
            "Chemistry": [
                "General Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry",
                "Analytical Chemistry", "Biochemistry", "Environmental Chemistry"
            ],
            "Biology": [
                "General Biology", "Cell Biology", "Genetics", "Evolution", "Ecology",
                "Molecular Biology", "Microbiology", "Human Anatomy"
            ],
            "English Literature": [
                "English Composition", "American Literature", "British Literature", "Creative Writing",
                "Poetry Analysis", "Modern Literature"
            ],
            "History": [
                "World History", "American History", "European History", "Ancient Civilizations",
                "Modern History", "Military History"
            ],
            "Psychology": [
                "Introduction to Psychology", "Cognitive Psychology", "Social Psychology",
                "Developmental Psychology", "Abnormal Psychology", "Research Methods"
            ]
        }
        
        course_counter = 0
        for department in self.departments[:8]:  # Use first 8 departments
            prefixes = self.course_prefixes.get(department, [department[:3].upper()])
            names = course_names.get(department, [f"{department} Course {i}" for i in range(1, 11)])
            
            for i, course_name in enumerate(names):
                if course_counter >= 40:  # Create 40 courses total
                    break
                    
                course_id = ObjectId()
                self.course_ids.append(course_id)
                
                # Assign random teacher
                teacher_id = random.choice(self.user_ids["teachers"])
                
                # Generate course code
                prefix = random.choice(prefixes)
                course_number = 100 + (i * 10) + random.randint(1, 9)
                course_code = f"{prefix}{course_number}"
                
                # Random course details
                max_capacity = random.randint(20, 100)
                current_enrollment = random.randint(0, min(max_capacity, 50))
                
                course = {
                    "_id": course_id,
                    "course_code": course_code,
                    "course_name": course_name,
                    "description": f"A comprehensive course covering {course_name.lower()} concepts and applications.",
                    "teacher_id": teacher_id,
                    "credits": random.randint(1, 4),
                    "department": department,
                    "max_capacity": max_capacity,
                    "current_enrollment": current_enrollment,
                    "semester": random.choice(self.semesters),
                    "year": random.choice(self.years),
                    "schedule_info": self.generate_schedule(),
                    "assignments": [],
                    "quizzes": [],
                    "feedback": [],
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                    "updated_at": datetime.utcnow() - timedelta(days=random.randint(1, 30))
                }
                courses.append(course)
                course_counter += 1
        
        self.db.courses.insert_many(courses)
        
        # Update teacher's courses_teaching
        for course in courses:
            self.db.users.update_one(
                {"_id": course["teacher_id"]},
                {"$push": {"courses_teaching": course["_id"]}}
            )
        
        print(f"Created {len(courses)} courses")

    def generate_schedule(self):
        """Generate random course schedule."""
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        selected_days = random.sample(days, random.randint(2, 3))
        
        hour = random.randint(8, 16)  # 8 AM to 4 PM
        minute = random.choice([0, 30])
        start_time = f"{hour:02d}:{minute:02d}"
        end_time = f"{hour+1:02d}:{minute:02d}"
        
        room = f"Room {random.randint(100, 500)}"
        
        return f"{', '.join(selected_days)} {start_time}-{end_time}, {room}"

    def create_enrollments(self):
        """Create enrollment relationships between students and courses."""
        print("Creating enrollments...")
        
        enrollments = []
        
        # Ensure each course has some enrollments
        for course_id in self.course_ids:
            course = self.db.courses.find_one({"_id": course_id})
            num_enrollments = course["current_enrollment"]
            
            # Select random students for this course
            enrolled_students = random.sample(self.user_ids["students"], 
                                            min(num_enrollments, len(self.user_ids["students"])))
            
            for student_id in enrolled_students:
                enrollment_id = ObjectId()
                enrollment_date = datetime.utcnow() - timedelta(days=random.randint(10, 120))
                
                # Some enrollments might be completed or dropped
                status_weights = [("enrolled", 0.7), ("completed", 0.2), ("dropped", 0.1)]
                status = random.choices([s[0] for s in status_weights], 
                                      weights=[s[1] for s in status_weights])[0]
                
                enrollment = {
                    "_id": enrollment_id,
                    "student_id": student_id,
                    "course_id": course_id,
                    "enrollment_date": enrollment_date,
                    "status": status,
                    "grade": random.choice(["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"]) if status == "completed" else None,
                    "drop_date": enrollment_date + timedelta(days=random.randint(20, 60)) if status == "dropped" else None,
                    "completion_date": enrollment_date + timedelta(days=random.randint(90, 120)) if status == "completed" else None
                }
                enrollments.append(enrollment)
                
                # Update student's enrolled_courses
                if status == "enrolled":
                    self.db.users.update_one(
                        {"_id": student_id},
                        {"$push": {"enrolled_courses": course_id}}
                    )
        
        # Add some additional random enrollments to reach at least 100 total
        while len(enrollments) < 100:
            student_id = random.choice(self.user_ids["students"])
            course_id = random.choice(self.course_ids)
            
            # Check if this enrollment already exists
            if not any(e["student_id"] == student_id and e["course_id"] == course_id for e in enrollments):
                enrollment_id = ObjectId()
                enrollment_date = datetime.utcnow() - timedelta(days=random.randint(10, 120))
                
                enrollment = {
                    "_id": enrollment_id,
                    "student_id": student_id,
                    "course_id": course_id,
                    "enrollment_date": enrollment_date,
                    "status": "enrolled",
                    "grade": None,
                    "drop_date": None,
                    "completion_date": None
                }
                enrollments.append(enrollment)
                
                # Update student's enrolled_courses
                self.db.users.update_one(
                    {"_id": student_id},
                    {"$push": {"enrolled_courses": course_id}}
                )
        
        if enrollments:
            self.db.enrollments.insert_many(enrollments)
        print(f"Created {len(enrollments)} enrollments")

    def create_assignments(self):
        """Create sample assignments for courses."""
        print("Creating assignments...")
        
        assignments = []
        assignment_types = ["homework", "project", "lab", "essay"]
        
        assignment_titles = {
            "homework": ["Problem Set 1", "Homework Assignment", "Practice Problems", "Weekly Exercises"],
            "project": ["Final Project", "Research Project", "Group Project", "Capstone Project"],
            "lab": ["Lab Experiment", "Laboratory Work", "Practical Lab", "Lab Report"],
            "essay": ["Research Essay", "Analysis Paper", "Critical Essay", "Term Paper"]
        }
        
        # Create 2-4 assignments per course
        for course_id in self.course_ids:
            num_assignments = random.randint(2, 4)
            
            for i in range(num_assignments):
                assignment_id = ObjectId()
                self.assignment_ids.append(assignment_id)
                
                assignment_type = random.choice(assignment_types)
                title = f"{random.choice(assignment_titles[assignment_type])} {i+1}"
                
                # Get course teacher
                course = self.db.courses.find_one({"_id": course_id})
                teacher_id = course["teacher_id"]
                
                created_date = datetime.utcnow() - timedelta(days=random.randint(30, 90))
                due_date = created_date + timedelta(days=random.randint(7, 30))
                
                assignment = {
                    "_id": assignment_id,
                    "title": title,
                    "description": f"Complete the {title.lower()} as outlined in the course materials.",
                    "assignment_type": assignment_type,
                    "course_id": course_id,
                    "teacher_id": teacher_id,
                    "total_points": random.randint(50, 200),
                    "due_date": due_date,
                    "created_date": created_date,
                    "is_published": True,
                    "instructions": f"Detailed instructions for {title}. Please follow the guidelines carefully.",
                    "attachments": [],
                    "submissions": []
                }
                assignments.append(assignment)
                
                # Update course's assignments
                self.db.courses.update_one(
                    {"_id": course_id},
                    {"$push": {"assignments": assignment_id}}
                )
        
        self.db.assignments.insert_many(assignments)
        print(f"Created {len(assignments)} assignments")

    def create_quizzes(self):
        """Create sample quizzes for courses."""
        print("Creating quizzes...")
        
        quizzes = []
        quiz_types = ["multiple_choice", "short_answer", "essay"]
        
        # Create 1-3 quizzes per course
        for course_id in self.course_ids:
            num_quizzes = random.randint(1, 3)
            
            for i in range(num_quizzes):
                quiz_id = ObjectId()
                self.quiz_ids.append(quiz_id)
                
                # Get course teacher
                course = self.db.courses.find_one({"_id": course_id})
                teacher_id = course["teacher_id"]
                
                created_date = datetime.utcnow() - timedelta(days=random.randint(20, 80))
                start_date = created_date + timedelta(days=random.randint(1, 5))
                due_date = start_date + timedelta(days=random.randint(3, 14))
                
                quiz_type = random.choice(quiz_types)
                questions = self.generate_quiz_questions(quiz_type)
                total_points = sum(q["points"] for q in questions)
                
                quiz = {
                    "_id": quiz_id,
                    "title": f"Quiz {i+1}",
                    "description": f"Quiz covering recent course material.",
                    "quiz_type": quiz_type,
                    "course_id": course_id,
                    "teacher_id": teacher_id,
                    "total_points": total_points,
                    "time_limit": random.randint(30, 120),  # 30-120 minutes
                    "due_date": due_date,
                    "start_date": start_date,
                    "questions": questions,
                    "is_published": True,
                    "submissions": [],
                    "created_date": created_date
                }
                quizzes.append(quiz)
                
                # Update course's quizzes
                self.db.courses.update_one(
                    {"_id": course_id},
                    {"$push": {"quizzes": quiz_id}}
                )
        
        self.db.quizzes.insert_many(quizzes)
        print(f"Created {len(quizzes)} quizzes")

    def generate_quiz_questions(self, quiz_type):
        """Generate sample quiz questions."""
        questions = []
        num_questions = random.randint(5, 15)
        
        for i in range(num_questions):
            if quiz_type == "multiple_choice":
                question = {
                    "question_text": f"What is the correct answer to question {i+1}?",
                    "question_type": "multiple_choice",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "points": random.randint(2, 10)
                }
            elif quiz_type == "short_answer":
                question = {
                    "question_text": f"Provide a brief answer to question {i+1}.",
                    "question_type": "short_answer",
                    "options": None,
                    "correct_answer": "Sample answer",
                    "points": random.randint(5, 15)
                }
            else:  # essay
                question = {
                    "question_text": f"Write an essay discussing the topic of question {i+1}.",
                    "question_type": "essay",
                    "options": None,
                    "correct_answer": None,
                    "points": random.randint(10, 25)
                }
            
            questions.append(question)
        
        return questions

    def create_submissions(self):
        """Create sample assignment and quiz submissions."""
        print("Creating submissions...")
        
        assignment_submissions = []
        quiz_submissions = []
        
        # Create assignment submissions (60-80% submission rate)
        for assignment_id in self.assignment_ids:
            assignment = self.db.assignments.find_one({"_id": assignment_id})
            course_id = assignment["course_id"]
            
            # Get enrolled students for this course
            enrollments = list(self.db.enrollments.find({"course_id": course_id, "status": "enrolled"}))
            
            # Random subset of students submit
            num_submissions = int(len(enrollments) * random.uniform(0.6, 0.8))
            submitting_students = random.sample(enrollments, min(num_submissions, len(enrollments)))
            
            for enrollment in submitting_students:
                submission_id = ObjectId()
                student_id = enrollment["student_id"]
                
                submission_date = assignment["due_date"] - timedelta(hours=random.randint(1, 48))
                is_late = submission_date > assignment["due_date"]
                
                score = random.randint(int(assignment["total_points"] * 0.6), assignment["total_points"])
                
                submission = {
                    "_id": submission_id,
                    "assignment_id": assignment_id,
                    "student_id": student_id,
                    "submission_date": submission_date,
                    "content": f"Student submission for {assignment['title']}",
                    "attachments": [],
                    "status": "late" if is_late else "submitted",
                    "score": score,
                    "feedback": f"Good work on {assignment['title']}. Score: {score}/{assignment['total_points']}",
                    "graded_date": submission_date + timedelta(days=random.randint(1, 7)),
                    "graded_by": assignment["teacher_id"]
                }
                assignment_submissions.append(submission)
                
                # Update assignment's submissions
                self.db.assignments.update_one(
                    {"_id": assignment_id},
                    {"$push": {"submissions": submission_id}}
                )
        
        # Create quiz submissions (70-90% submission rate)
        for quiz_id in self.quiz_ids:
            quiz = self.db.quizzes.find_one({"_id": quiz_id})
            course_id = quiz["course_id"]
            
            # Get enrolled students for this course
            enrollments = list(self.db.enrollments.find({"course_id": course_id, "status": "enrolled"}))
            
            # Random subset of students submit
            num_submissions = int(len(enrollments) * random.uniform(0.7, 0.9))
            submitting_students = random.sample(enrollments, min(num_submissions, len(enrollments)))
            
            for enrollment in submitting_students:
                submission_id = ObjectId()
                student_id = enrollment["student_id"]
                
                submission_date = quiz["due_date"] - timedelta(hours=random.randint(1, 24))
                
                # Generate answers for quiz questions
                answers = []
                total_score = 0
                for i, question in enumerate(quiz["questions"]):
                    is_correct = random.choice([True, False, True])  # 67% correct rate
                    points_earned = question["points"] if is_correct else random.randint(0, question["points"])
                    total_score += points_earned
                    
                    answer = {
                        "question_index": i,
                        "answer": "Sample answer" if question["question_type"] != "multiple_choice" else random.choice(question.get("options", ["A"])),
                        "is_correct": is_correct,
                        "points_earned": points_earned
                    }
                    answers.append(answer)
                
                submission = {
                    "_id": submission_id,
                    "quiz_id": quiz_id,
                    "student_id": student_id,
                    "submission_date": submission_date,
                    "content": None,
                    "attachments": [],
                    "status": "graded",
                    "answers": answers,
                    "total_score": total_score,
                    "time_taken": random.randint(quiz.get("time_limit", 60) // 2, quiz.get("time_limit", 60)),
                    "graded_date": submission_date + timedelta(hours=random.randint(1, 12)),
                    "graded_by": quiz["teacher_id"]
                }
                quiz_submissions.append(submission)
                
                # Update quiz's submissions
                self.db.quizzes.update_one(
                    {"_id": quiz_id},
                    {"$push": {"submissions": submission_id}}
                )
        
        if assignment_submissions:
            self.db.assignment_submissions.insert_many(assignment_submissions)
        if quiz_submissions:
            self.db.quiz_submissions.insert_many(quiz_submissions)
        
        print(f"Created {len(assignment_submissions)} assignment submissions and {len(quiz_submissions)} quiz submissions")

    def create_attendance_records(self):
        """Create sample attendance records."""
        print("Creating attendance records...")
        
        attendance_records = []
        
        # Create attendance for the last 30 days for each course
        for course_id in self.course_ids:
            course = self.db.courses.find_one({"_id": course_id})
            teacher_id = course["teacher_id"]
            
            # Get enrolled students for this course
            enrollments = list(self.db.enrollments.find({"course_id": course_id, "status": "enrolled"}))
            student_ids = [str(e["student_id"]) for e in enrollments]
            
            # Create attendance for last 20 class days
            for day_offset in range(0, 40, 2):  # Every other day for 20 records
                attendance_date = datetime.now().date() - timedelta(days=day_offset)
                
                # Skip weekends
                if attendance_date.weekday() >= 5:
                    continue
                
                record_id = ObjectId()
                student_attendances = {}
                
                # Generate attendance for each student (85% attendance rate)
                for student_id in student_ids:
                    is_present = random.choice([True] * 85 + [False] * 15)  # 85% attendance
                    student_attendances[student_id] = is_present
                
                attendance = {
                    "_id": record_id,
                    "course_id": course_id,
                    "date": datetime.combine(attendance_date, datetime.min.time()),  # Convert date to datetime
                    "student_attendances": student_attendances,
                    "recorded_by": teacher_id,
                    "recorded_at": datetime.combine(attendance_date, datetime.min.time()) + timedelta(hours=random.randint(8, 17))
                }
                attendance_records.append(attendance)
        
        if attendance_records:
            self.db.attendance.insert_many(attendance_records)
        print(f"Created {len(attendance_records)} attendance records")

    def create_grades(self):
        """Create comprehensive grade records for students."""
        print("Creating grade records...")
        
        grades = []
        
        # Create grades for enrolled students
        enrollments = list(self.db.enrollments.find({"status": {"$in": ["enrolled", "completed"]}}))
        
        for enrollment in enrollments:
            student_id = enrollment["student_id"]
            course_id = enrollment["course_id"]
            
            grade_id = ObjectId()
            components = []
            
            # Get assignments and quizzes for this course
            assignments = list(self.db.assignments.find({"course_id": course_id}))
            quizzes = list(self.db.quizzes.find({"course_id": course_id}))
            
            total_points_earned = 0
            total_points_possible = 0
            
            # Add assignment grades
            for assignment in assignments:
                submission = self.db.assignment_submissions.find_one({
                    "assignment_id": assignment["_id"],
                    "student_id": student_id
                })
                
                if submission:
                    points_earned = submission.get("score", 0)
                else:
                    points_earned = 0  # Missing assignment
                
                component = {
                    "component_type": "assignment",
                    "component_id": assignment["_id"],
                    "name": assignment["title"],
                    "points_earned": points_earned,
                    "total_points": assignment["total_points"],
                    "weight": 1.0
                }
                components.append(component)
                total_points_earned += points_earned
                total_points_possible += assignment["total_points"]
            
            # Add quiz grades
            for quiz in quizzes:
                submission = self.db.quiz_submissions.find_one({
                    "quiz_id": quiz["_id"],
                    "student_id": student_id
                })
                
                if submission:
                    points_earned = submission.get("total_score", 0)
                else:
                    points_earned = 0  # Missing quiz
                
                component = {
                    "component_type": "quiz",
                    "component_id": quiz["_id"],
                    "name": quiz["title"],
                    "points_earned": points_earned,
                    "total_points": quiz["total_points"],
                    "weight": 1.0
                }
                components.append(component)
                total_points_earned += points_earned
                total_points_possible += quiz["total_points"]
            
            # Calculate final percentage and letter grade
            if total_points_possible > 0:
                final_percentage = (total_points_earned / total_points_possible) * 100
            else:
                final_percentage = 0
            
            # Convert to letter grade
            if final_percentage >= 97:
                final_grade = "A+"
            elif final_percentage >= 93:
                final_grade = "A"
            elif final_percentage >= 90:
                final_grade = "A-"
            elif final_percentage >= 87:
                final_grade = "B+"
            elif final_percentage >= 83:
                final_grade = "B"
            elif final_percentage >= 80:
                final_grade = "B-"
            elif final_percentage >= 77:
                final_grade = "C+"
            elif final_percentage >= 73:
                final_grade = "C"
            elif final_percentage >= 70:
                final_grade = "C-"
            elif final_percentage >= 60:
                final_grade = "D"
            else:
                final_grade = "F"
            
            grade_record = {
                "_id": grade_id,
                "student_id": student_id,
                "course_id": course_id,
                "components": components,
                "final_grade": final_grade,
                "final_percentage": round(final_percentage, 2),
                "calculated_at": datetime.utcnow()
            }
            grades.append(grade_record)
        
        if grades:
            self.db.grades.insert_many(grades)
        print(f"Created {len(grades)} grade records")

    def create_calendar_events(self):
        """Create calendar events for assignments, quizzes, and classes."""
        print("Creating calendar events...")
        
        events = []
        
        # Create events for assignments
        assignments = list(self.db.assignments.find())
        for assignment in assignments:
            event_id = ObjectId()
            course = self.db.courses.find_one({"_id": assignment["course_id"]})
            
            # Get enrolled students
            enrollments = list(self.db.enrollments.find({"course_id": assignment["course_id"], "status": "enrolled"}))
            attendees = [e["student_id"] for e in enrollments] + [assignment["teacher_id"]]
            
            event = {
                "_id": event_id,
                "title": f"{assignment['title']} Due",
                "description": f"Assignment due date for {course['course_name']}",
                "event_type": "assignment",
                "course_id": assignment["course_id"],
                "start_datetime": assignment["due_date"],
                "end_datetime": assignment["due_date"] + timedelta(hours=1),
                "created_by": assignment["teacher_id"],
                "attendees": attendees,
                "created_at": assignment["created_date"]
            }
            events.append(event)
        
        # Create events for quizzes
        quizzes = list(self.db.quizzes.find())
        for quiz in quizzes:
            event_id = ObjectId()
            course = self.db.courses.find_one({"_id": quiz["course_id"]})
            
            # Get enrolled students
            enrollments = list(self.db.enrollments.find({"course_id": quiz["course_id"], "status": "enrolled"}))
            attendees = [e["student_id"] for e in enrollments] + [quiz["teacher_id"]]
            
            event = {
                "_id": event_id,
                "title": f"{quiz['title']} - {course['course_name']}",
                "description": f"Quiz for {course['course_name']}",
                "event_type": "quiz",
                "course_id": quiz["course_id"],
                "start_datetime": quiz["start_date"],
                "end_datetime": quiz["due_date"],
                "created_by": quiz["teacher_id"],
                "attendees": attendees,
                "created_at": quiz["created_date"]
            }
            events.append(event)
        
        # Create some general course events
        for course_id in self.course_ids[:10]:  # First 10 courses
            course = self.db.courses.find_one({"_id": course_id})
            
            # Midterm exam
            event_id = ObjectId()
            midterm_date = datetime.utcnow() + timedelta(days=random.randint(30, 60))
            
            enrollments = list(self.db.enrollments.find({"course_id": course_id, "status": "enrolled"}))
            attendees = [e["student_id"] for e in enrollments] + [course["teacher_id"]]
            
            event = {
                "_id": event_id,
                "title": f"Midterm Exam - {course['course_name']}",
                "description": f"Midterm examination for {course['course_name']}",
                "event_type": "exam",
                "course_id": course_id,
                "start_datetime": midterm_date,
                "end_datetime": midterm_date + timedelta(hours=2),
                "created_by": course["teacher_id"],
                "attendees": attendees,
                "created_at": datetime.utcnow() - timedelta(days=30)
            }
            events.append(event)
        
        if events:
            self.db.calendar_events.insert_many(events)
        print(f"Created {len(events)} calendar events")

    def create_notifications(self):
        """Create sample notifications for users."""
        print("Creating notifications...")
        
        notifications = []
        notification_types = ["assignment", "grade", "enrollment", "announcement"]
        
        # Create notifications for students
        for student_id in self.user_ids["students"][:30]:  # First 30 students
            # Get student's enrolled courses
            enrollments = list(self.db.enrollments.find({"student_id": student_id, "status": "enrolled"}))
            
            for enrollment in enrollments[:3]:  # Max 3 notifications per student
                notification_id = ObjectId()
                course = self.db.courses.find_one({"_id": enrollment["course_id"]})
                notification_type = random.choice(notification_types)
                
                if notification_type == "assignment":
                    title = "New Assignment Posted"
                    message = f"A new assignment has been posted in {course['course_name']}"
                elif notification_type == "grade":
                    title = "Grade Posted"
                    message = f"Your grade has been posted for {course['course_name']}"
                elif notification_type == "enrollment":
                    title = "Enrollment Confirmed"
                    message = f"Your enrollment in {course['course_name']} has been confirmed"
                else:  # announcement
                    title = "Course Announcement"
                    message = f"New announcement in {course['course_name']}"
                
                notification = {
                    "_id": notification_id,
                    "recipient_id": student_id,
                    "title": title,
                    "message": message,
                    "notification_type": notification_type,
                    "related_course_id": enrollment["course_id"],
                    "related_assignment_id": None,
                    "is_read": random.choice([True, False]),
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                    "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 15)) if random.choice([True, False]) else None
                }
                notifications.append(notification)
        
        # Create notifications for teachers
        for teacher_id in self.user_ids["teachers"][:15]:  # First 15 teachers
            # Get teacher's courses
            courses = list(self.db.courses.find({"teacher_id": teacher_id}))
            
            for course in courses[:2]:  # Max 2 notifications per teacher
                notification_id = ObjectId()
                
                title = "Student Enrollment"
                message = f"New student enrolled in {course['course_name']}"
                
                notification = {
                    "_id": notification_id,
                    "recipient_id": teacher_id,
                    "title": title,
                    "message": message,
                    "notification_type": "enrollment",
                    "related_course_id": course["_id"],
                    "related_assignment_id": None,
                    "is_read": random.choice([True, False]),
                    "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 20)),
                    "read_at": datetime.utcnow() - timedelta(days=random.randint(1, 10)) if random.choice([True, False]) else None
                }
                notifications.append(notification)
        
        if notifications:
            self.db.notifications.insert_many(notifications)
        print(f"Created {len(notifications)} notifications")

    def initialize_database(self):
        """Main method to initialize the entire database."""
        print("=== Starting Database Initialization ===")
        print(f"Database URI: {Config.MONGO_URI}")
        
        try:
            # Clear existing data
            self.clear_database()
            
            # Create indexes
            self.create_indexes()
            
            # Create all data
            self.create_users()
            self.create_courses()
            self.create_enrollments()
            self.create_assignments()
            self.create_quizzes()
            self.create_submissions()
            self.create_attendance_records()
            self.create_grades()
            self.create_calendar_events()
            self.create_notifications()
            
            # Print summary
            self.print_summary()
            
            print("\n=== Database Initialization Complete! ===")
            print("\nDefault login credentials:")
            print("Admin: admin1@university.edu / password123")
            print("Teacher: teacher1@university.edu / password123")
            print("Student: student1@university.edu / password123")
            
        except Exception as e:
            print(f"Error during database initialization: {e}")
            raise
        finally:
            self.client.close()

    def print_summary(self):
        """Print a summary of created data."""
        print("\n=== Database Summary ===")
        collections_info = {
            'users': self.db.users.count_documents({}),
            'courses': self.db.courses.count_documents({}),
            'enrollments': self.db.enrollments.count_documents({}),
            'assignments': self.db.assignments.count_documents({}),
            'quizzes': self.db.quizzes.count_documents({}),
            'assignment_submissions': self.db.assignment_submissions.count_documents({}),
            'quiz_submissions': self.db.quiz_submissions.count_documents({}),
            'attendance': self.db.attendance.count_documents({}),
            'grades': self.db.grades.count_documents({}),
            'calendar_events': self.db.calendar_events.count_documents({}),
            'notifications': self.db.notifications.count_documents({})
        }
        
        for collection, count in collections_info.items():
            print(f"{collection}: {count} documents")


if __name__ == "__main__":
    print("University Management System - Database Initializer")
    print("This will clear existing data and create sample data.")
    
    confirm = input("Do you want to proceed? (yes/no): ").lower().strip()
    if confirm in ['yes', 'y']:
        initializer = DatabaseInitializer()
        initializer.initialize_database()
    else:
        print("Database initialization cancelled.") 