#!/usr/bin/env python3
"""
Test script for teacher routes to verify they work correctly
"""

import requests
import json
from pymongo import MongoClient
from config import Config

# Connect to MongoDB to check data
client = MongoClient(Config.MONGO_URI)
db = client.get_database()

def test_data_availability():
    """Check if we have the necessary data in the database"""
    print("=== Checking Database Data ===")
    
    # Check if we have users
    total_users = db.users.count_documents({})
    print(f"Total users in database: {total_users}")
    
    # Check if we have teachers
    teachers = list(db.users.find({"role": "teacher"}, {"_id": 1, "username": 1, "first_name": 1, "last_name": 1}))
    print(f"Number of teachers: {len(teachers)}")
    if teachers:
        print("Sample teachers:")
        for teacher in teachers[:3]:
            print(f"  - {teacher.get('username')} ({teacher.get('first_name')} {teacher.get('last_name')})")
    
    # Check if we have courses
    total_courses = db.courses.count_documents({})
    print(f"Total courses in database: {total_courses}")
    
    # Check if we have courses assigned to teachers
    teacher_courses = list(db.courses.find({}, {"_id": 1, "course_code": 1, "course_name": 1, "teacher_id": 1}))
    print(f"Courses with teacher assignments: {len([c for c in teacher_courses if c.get('teacher_id')])}")
    
    # Check if we have enrollments
    total_enrollments = db.enrollments.count_documents({})
    print(f"Total enrollments: {total_enrollments}")
    
    # Check if we have assignments
    total_assignments = db.assignments.count_documents({})
    print(f"Total assignments: {total_assignments}")
    
    # Check if we have quizzes
    total_quizzes = db.quizzes.count_documents({})
    print(f"Total quizzes: {total_quizzes}")
    
    return len(teachers) > 0

def get_teacher_token():
    """Get authentication token for a teacher"""
    print("\n=== Getting Teacher Token ===")
    
    # Try to get a teacher user
    teacher = db.users.find_one({"role": "teacher"})
    if not teacher:
        print("No teacher found in database!")
        return None
    
    print(f"Using teacher: {teacher.get('username')}")
    
    # Try to login
    login_data = {
        "username": teacher.get('username'),
        "password": "password123"  # Default password from init_db.py
    }
    
    try:
        response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get('access_token')
            print("Successfully obtained teacher token")
            return token
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print("Could not connect to the server. Make sure it's running on http://localhost:5000")
        return None

def test_teacher_endpoints(token):
    """Test teacher API endpoints"""
    print("\n=== Testing Teacher Endpoints ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "http://localhost:5000/api/teacher"
    
    # Test basic endpoints
    endpoints = [
        "/ping",
        "/dashboard/stats", 
        "/courses/my",
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", headers=headers)
            print(f"{endpoint}: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if endpoint == "/dashboard/stats":
                    print(f"  Dashboard stats: {data}")
                elif endpoint == "/courses/my":
                    print(f"  Teacher courses: {len(data)} courses")
                    if data:
                        # Test assignment creation with the first course
                        test_assignment_creation(token, data[0]['_id'])
                        # Test assignment fetching for all courses
                        for course in data[:2]:  # Test first 2 courses
                            test_assignment_fetching(token, course['_id'])
            else:
                print(f"  Error: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"{endpoint}: Connection error - {e}")

def test_assignment_creation(token, course_id):
    """Test creating an assignment"""
    print(f"\n=== Testing Assignment Creation for Course {course_id} ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test assignment data
    assignment_data = {
        "title": "Test Assignment",
        "description": "This is a test assignment created via API",
        "assignment_type": "homework",
        "total_points": 100,
        "due_date": "2024-12-31T23:59:00",
        "instructions": "Complete all exercises and submit your work."
    }
    
    try:
        response = requests.post(
            f"http://localhost:5000/api/teacher/courses/{course_id}/assignments",
            headers=headers,
            json=assignment_data
        )
        
        print(f"Assignment creation: {response.status_code}")
        if response.status_code == 201:
            result = response.json()
            print(f"  Created assignment: {result.get('assignment_id')}")
            print(f"  Message: {result.get('message')}")
            
            # Test fetching assignments for the course
            test_assignment_fetching(token, course_id)
        else:
            print(f"  Failed to create assignment: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Assignment creation error: {e}")

def test_assignment_fetching(token, course_id):
    """Test fetching assignments for a course"""
    print(f"\n=== Testing Assignment Fetching for Course {course_id} ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"http://localhost:5000/api/teacher/courses/{course_id}/assignments",
            headers=headers
        )
        
        print(f"Fetch assignments: {response.status_code}")
        if response.status_code == 200:
            assignments = response.json()
            print(f"  Successfully fetched {len(assignments)} assignments")
            for assignment in assignments[:3]:  # Show first 3
                print(f"    - {assignment.get('title')} ({assignment.get('total_points')} pts)")
        else:
            print(f"  Failed to fetch assignments: {response.status_code}")
            print(f"  Error: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Assignment fetching error: {e}")

if __name__ == "__main__":
    print("Teacher Routes Test Script")
    print("=" * 50)
    
    # Check if we have data
    if not test_data_availability():
        print("\nNo teachers found in database. You may need to run init_db.py first.")
        exit(1)
    
    # Get token and test
    token = get_teacher_token()
    if token:
        test_teacher_endpoints(token)
    else:
        print("Could not obtain teacher token. Check if the server is running and credentials are correct.") 