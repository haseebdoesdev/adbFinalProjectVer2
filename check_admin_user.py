#!/usr/bin/env python3
"""
Script to check admin users in the database
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from pymongo import MongoClient
from werkzeug.security import check_password_hash
from datetime import datetime

def check_admin_users():
    """Check what admin users exist in the database"""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['student_management_system']
        
        print("🔍 Checking admin users in database...")
        print("=" * 50)
        
        # Find all admin users
        admin_users = list(db.users.find({"role": "admin"}))
        
        if not admin_users:
            print("❌ No admin users found in database!")
            print("Creating a test admin user...")
            
            # Create a test admin user
            from werkzeug.security import generate_password_hash
            
            test_admin = {
                "username": "admin",
                "email": "admin@example.com",
                "password": generate_password_hash("admin123"),
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin",
                "is_active": True,
                "date_joined": datetime.utcnow(),
                "last_login": None
            }
            
            result = db.users.insert_one(test_admin)
            print(f"✅ Test admin user created with ID: {result.inserted_id}")
            print(f"📧 Email: admin@example.com")
            print(f"🔑 Password: admin123")
            
        else:
            print(f"✅ Found {len(admin_users)} admin user(s):")
            for i, admin in enumerate(admin_users, 1):
                print(f"\n👤 Admin User {i}:")
                print(f"   📧 Email: {admin.get('email', 'No email')}")
                print(f"   👤 Username: {admin.get('username', 'No username')}")
                print(f"   📛 Name: {admin.get('first_name', '')} {admin.get('last_name', '')}")
                print(f"   🔑 Has Password: {'Yes' if admin.get('password') else 'No'}")
                print(f"   ✅ Active: {admin.get('is_active', False)}")
                print(f"   📅 Joined: {admin.get('date_joined', 'Unknown')}")
        
        # Also check basic database stats
        print("\n" + "=" * 50)
        print("📊 Database Statistics:")
        print("=" * 50)
        
        collections_stats = {
            'users': db.users.count_documents({}),
            'courses': db.courses.count_documents({}),
            'enrollments': db.enrollments.count_documents({}),
            'assignments': db.assignments.count_documents({}),
            'assignment_submissions': db.assignment_submissions.count_documents({}),
            'grades': db.grades.count_documents({})
        }
        
        for collection, count in collections_stats.items():
            print(f"📄 {collection}: {count} documents")
        
        # Check if we have enough data for reports
        print("\n" + "=" * 50)
        print("🔍 Data Availability for Reports:")
        print("=" * 50)
        
        # Check recent data
        recent_enrollments = db.enrollments.count_documents({
            "enrollment_date": {"$gte": datetime(2024, 1, 1)}
        })
        
        recent_submissions = db.assignment_submissions.count_documents({
            "submission_date": {"$gte": datetime(2024, 1, 1)}
        })
        
        grades_with_scores = db.grades.count_documents({
            "final_percentage": {"$exists": True}
        })
        
        print(f"📈 Recent enrollments (2024+): {recent_enrollments}")
        print(f"📝 Recent submissions (2024+): {recent_submissions}")
        print(f"🎯 Grades with scores: {grades_with_scores}")
        
        # Sample some data
        print("\n" + "=" * 50)
        print("📋 Sample Data:")
        print("=" * 50)
        
        sample_course = db.courses.find_one({})
        if sample_course:
            print(f"📚 Sample Course: {sample_course.get('course_code', 'N/A')} - {sample_course.get('course_name', 'N/A')}")
            print(f"   Department: {sample_course.get('department', 'N/A')}")
        
        sample_enrollment = db.enrollments.find_one({})
        if sample_enrollment:
            print(f"📝 Sample Enrollment Date: {sample_enrollment.get('enrollment_date', 'N/A')}")
        
        sample_assignment = db.assignments.find_one({})
        if sample_assignment:
            print(f"📄 Sample Assignment: {sample_assignment.get('title', 'N/A')}")
            print(f"   Due Date: {sample_assignment.get('due_date', 'N/A')}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Error checking database: {str(e)}")
        return False

if __name__ == "__main__":
    check_admin_users() 