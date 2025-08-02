#!/usr/bin/env python3
"""
Database Initialization Script
This script initializes the database with proper indexes, sample data, and configurations.
"""

import sys
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from config import config
from extensions import mongo
from flask import Flask
from utils.database import DatabaseUtils

def create_app():
    """Create Flask app for database operations."""
    app = Flask(__name__)
    config_name = os.environ.get('FLASK_CONFIG', 'default')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    mongo.init_app(app)
    
    return app

def initialize_database():
    """Initialize database with indexes and sample data."""
    print("🚀 Starting database initialization...")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Step 1: Create indexes
            print("\n📊 Creating database indexes...")
            DatabaseUtils.create_indexes()
            print("✅ Database indexes created successfully")
            
            # Step 2: Create admin user if it doesn't exist
            print("\n👤 Checking for admin user...")
            admin_user = mongo.db.users.find_one({"role": "admin"})
            
            if not admin_user:
                print("Creating default admin user...")
                admin_data = {
                    "username": "admin",
                    "email": "admin@university.edu",
                    "password": generate_password_hash("admin123"),
                    "first_name": "System",
                    "last_name": "Administrator",
                    "role": "admin",
                    "is_active": True,
                    "date_joined": datetime.utcnow(),
                    "last_login": None
                }
                
                result = mongo.db.users.insert_one(admin_data)
                print(f"✅ Admin user created with ID: {result.inserted_id}")
                print("📧 Email: admin@university.edu")
                print("🔑 Password: admin123")
                print("⚠️  Please change the default password after first login!")
            else:
                print("✅ Admin user already exists")
            
            # Step 3: Create sample data if database is empty
            print("\n📝 Checking for sample data...")
            course_count = mongo.db.courses.count_documents({})
            user_count = mongo.db.users.count_documents({})
            
            if course_count == 0 and user_count <= 1:  # Only admin user exists
                print("Creating sample data...")
                create_sample_data()
            else:
                print(f"✅ Database already has data ({user_count} users, {course_count} courses)")
            
            # Step 4: Health check
            print("\n🏥 Performing database health check...")
            health_status = DatabaseUtils.health_check()
            
            if health_status.get('overall_status') == 'healthy':
                print("✅ Database health check: PASSED")
            else:
                print("⚠️  Database health check: ISSUES DETECTED")
                print(f"Details: {health_status}")
            
            # Step 5: Performance optimization
            print("\n⚡ Optimizing database performance...")
            recommendations = DatabaseUtils.optimize_indexes()
            if recommendations.get('recommendations'):
                print(f"📋 Index optimization recommendations: {len(recommendations['recommendations'])}")
                for rec in recommendations['recommendations'][:3]:  # Show first 3
                    print(f"   - {rec['recommendation']}")
            else:
                print("✅ No index optimization needed")
            
            print("\n🎉 Database initialization completed successfully!")
            print("\n📊 Database Statistics:")
            
            # Show collection stats
            collections_stats = {
                'users': mongo.db.users.count_documents({}),
                'courses': mongo.db.courses.count_documents({}),
                'enrollments': mongo.db.enrollments.count_documents({}),
                'assignments': mongo.db.assignments.count_documents({}),
                'assignment_submissions': mongo.db.assignment_submissions.count_documents({}),
                'grades': mongo.db.grades.count_documents({})
            }
            
            for collection, count in collections_stats.items():
                print(f"   📄 {collection}: {count} documents")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during database initialization: {e}")
            import traceback
            traceback.print_exc()
            return False

def create_sample_data():
    """Create sample data for testing."""
    print("Creating sample teachers...")
    
    # Sample teachers
    teachers = [
        {
            "username": "prof_smith",
            "email": "smith@university.edu",
            "password": generate_password_hash("teacher123"),
            "first_name": "John",
            "last_name": "Smith",
            "role": "teacher",
            "department": "Computer Science",
            "is_active": True,
            "date_joined": datetime.utcnow(),
            "last_login": None
        },
        {
            "username": "prof_jones",
            "email": "jones@university.edu",
            "password": generate_password_hash("teacher123"),
            "first_name": "Sarah",
            "last_name": "Jones",
            "role": "teacher",
            "department": "Mathematics",
            "is_active": True,
            "date_joined": datetime.utcnow(),
            "last_login": None
        }
    ]
    
    teacher_ids = []
    for teacher in teachers:
        result = mongo.db.users.insert_one(teacher)
        teacher_ids.append(result.inserted_id)
    
    print(f"✅ Created {len(teachers)} sample teachers")
    
    print("Creating sample students...")
    
    # Sample students
    students = [
        {
            "username": "student1",
            "email": "student1@university.edu",
            "password": generate_password_hash("student123"),
            "first_name": "Alice",
            "last_name": "Johnson",
            "role": "student",
            "major": "Computer Science",
            "is_active": True,
            "date_joined": datetime.utcnow(),
            "last_login": None
        },
        {
            "username": "student2",
            "email": "student2@university.edu",
            "password": generate_password_hash("student123"),
            "first_name": "Bob",
            "last_name": "Wilson",
            "role": "student",
            "major": "Mathematics",
            "is_active": True,
            "date_joined": datetime.utcnow(),
            "last_login": None
        }
    ]
    
    student_ids = []
    for student in students:
        result = mongo.db.users.insert_one(student)
        student_ids.append(result.inserted_id)
    
    print(f"✅ Created {len(students)} sample students")
    
    print("Creating sample courses...")
    
    # Sample courses
    courses = [
        {
            "course_code": "CS101",
            "course_name": "Introduction to Computer Science",
            "description": "Fundamentals of computer science and programming",
            "teacher_id": teacher_ids[0],
            "credits": 3,
            "department": "Computer Science",
            "max_capacity": 30,
            "current_enrollment": 0,
            "semester": "Fall",
            "year": 2024,
            "schedule_info": "MWF 10:00-11:00 AM",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "course_code": "MATH201",
            "course_name": "Calculus II",
            "description": "Advanced calculus concepts and applications",
            "teacher_id": teacher_ids[1],
            "credits": 4,
            "department": "Mathematics",
            "max_capacity": 25,
            "current_enrollment": 0,
            "semester": "Fall",
            "year": 2024,
            "schedule_info": "TTh 2:00-3:30 PM",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    course_ids = []
    for course in courses:
        result = mongo.db.courses.insert_one(course)
        course_ids.append(result.inserted_id)
    
    print(f"✅ Created {len(courses)} sample courses")
    
    print("Creating sample enrollments...")
    
    # Sample enrollments
    enrollments = []
    for i, student_id in enumerate(student_ids):
        for j, course_id in enumerate(course_ids):
            enrollment = {
                "student_id": student_id,
                "course_id": course_id,
                "enrollment_date": datetime.utcnow() - timedelta(days=30),
                "status": "enrolled"
            }
            enrollments.append(enrollment)
    
    if enrollments:
        mongo.db.enrollments.insert_many(enrollments)
        
        # Update course enrollment counts
        for course_id in course_ids:
            enrollment_count = mongo.db.enrollments.count_documents({
                "course_id": course_id,
                "status": "enrolled"
            })
            mongo.db.courses.update_one(
                {"_id": course_id},
                {"$set": {"current_enrollment": enrollment_count}}
            )
    
    print(f"✅ Created {len(enrollments)} sample enrollments")
    
    print("Creating sample assignments...")
    
    # Sample assignments
    assignments = []
    for i, course_id in enumerate(course_ids):
        assignment = {
            "title": f"Assignment 1 - {courses[i]['course_code']}",
            "description": "Complete the assigned problems and submit your solutions",
            "assignment_type": "homework",
            "total_points": 100,
            "due_date": datetime.utcnow() + timedelta(days=7),
            "instructions": "Please follow the guidelines provided in class",
            "course_id": course_id,
            "teacher_id": courses[i]['teacher_id'],
            "is_published": True,
            "created_date": datetime.utcnow()
        }
        assignments.append(assignment)
    
    if assignments:
        mongo.db.assignments.insert_many(assignments)
    
    print(f"✅ Created {len(assignments)} sample assignments")
    
    print("✅ Sample data creation completed!")

if __name__ == "__main__":
    success = initialize_database()
    sys.exit(0 if success else 1)