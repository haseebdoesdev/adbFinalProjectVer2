#!/usr/bin/env python3
"""
Test script for Student Panel functionality
Tests all student endpoints and features
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000/api"

def test_login(username, password):
    """Test student login"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Login successful for {username}")
            print(f"   Role: {data.get('role')}")
            print(f"   User ID: {data.get('user', {}).get('_id')}")
            return data.get('access_token'), data.get('user')
        else:
            print(f"❌ Login failed: {response.json().get('message')}")
            return None, None
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return None, None

def test_student_endpoints(token):
    """Test all student endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints_to_test = [
        ("GET", "/student/dashboard/stats", "Dashboard Stats"),
        ("GET", "/student/courses/available", "Available Courses"),
        ("GET", "/student/courses/my", "My Enrolled Courses"),
        ("GET", "/student/courses/my?limit=3", "My Courses (Limited)"),
        ("GET", "/student/ping", "Ping Test"),
    ]
    
    results = {}
    
    for method, endpoint, description in endpoints_to_test:
        try:
            print(f"\n🔍 Testing {description} ({method} {endpoint})")
            
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {description} - Success")
                
                # Show relevant data for each endpoint
                if endpoint == "/student/dashboard/stats":
                    print(f"   Total Courses: {data.get('total_courses')}")
                    print(f"   Total Credits: {data.get('total_credits')}")
                    print(f"   Upcoming Assignments: {data.get('upcoming_assignments')}")
                    print(f"   Upcoming Quizzes: {data.get('upcoming_quizzes')}")
                    
                elif "courses" in endpoint:
                    print(f"   Found {len(data)} courses")
                    if data:
                        first_course = data[0]
                        print(f"   First course: {first_course.get('course_code')} - {first_course.get('course_name')}")
                
                results[endpoint] = {"status": "success", "data": data}
            else:
                print(f"❌ {description} - Failed ({response.status_code})")
                print(f"   Error: {response.json().get('message', 'Unknown error')}")
                results[endpoint] = {"status": "failed", "error": response.json()}
                
        except Exception as e:
            print(f"❌ {description} - Exception: {str(e)}")
            results[endpoint] = {"status": "error", "error": str(e)}
    
    return results

def test_course_enrollment(token):
    """Test course enrollment functionality"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n🔍 Testing Course Enrollment")
    
    # First get available courses
    try:
        response = requests.get(f"{BASE_URL}/student/courses/available", headers=headers)
        if response.status_code == 200:
            available_courses = response.json()
            
            if available_courses:
                # Try to enroll in the first available course
                course = available_courses[0]
                course_id = course['_id']
                course_name = course['course_name']
                
                print(f"   Attempting to enroll in: {course_name}")
                
                enroll_response = requests.post(
                    f"{BASE_URL}/student/courses/enroll/{course_id}", 
                    headers=headers
                )
                
                if enroll_response.status_code == 201:
                    print(f"✅ Successfully enrolled in {course_name}")
                    
                    # Test dropping the course
                    print(f"   Testing course drop...")
                    drop_response = requests.post(
                        f"{BASE_URL}/student/courses/drop/{course_id}", 
                        headers=headers
                    )
                    
                    if drop_response.status_code == 200:
                        print(f"✅ Successfully dropped {course_name}")
                    else:
                        print(f"❌ Failed to drop course: {drop_response.json().get('message')}")
                        
                else:
                    print(f"❌ Enrollment failed: {enroll_response.json().get('message')}")
                    
            else:
                print("   No available courses found for enrollment test")
        else:
            print(f"   Failed to get available courses: {response.json().get('message')}")
            
    except Exception as e:
        print(f"❌ Course enrollment test error: {str(e)}")

def test_course_content_access(token):
    """Test access to course content (assignments, quizzes, etc.)"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n🔍 Testing Course Content Access")
    
    # Get enrolled courses first
    try:
        response = requests.get(f"{BASE_URL}/student/courses/my", headers=headers)
        if response.status_code == 200:
            enrolled_courses = response.json()
            
            if enrolled_courses:
                course = enrolled_courses[0]
                course_id = course['_id']
                course_name = course['course_name']
                
                print(f"   Testing content access for: {course_name}")
                
                # Test assignments
                assignments_response = requests.get(
                    f"{BASE_URL}/student/courses/{course_id}/assignments", 
                    headers=headers
                )
                if assignments_response.status_code == 200:
                    assignments = assignments_response.json()
                    print(f"✅ Assignments access - Found {len(assignments)} assignments")
                else:
                    print(f"❌ Assignments access failed: {assignments_response.json().get('message')}")
                
                # Test quizzes
                quizzes_response = requests.get(
                    f"{BASE_URL}/student/courses/{course_id}/quizzes", 
                    headers=headers
                )
                if quizzes_response.status_code == 200:
                    quizzes = quizzes_response.json()
                    print(f"✅ Quizzes access - Found {len(quizzes)} quizzes")
                else:
                    print(f"❌ Quizzes access failed: {quizzes_response.json().get('message')}")
                
                # Test grades
                grades_response = requests.get(
                    f"{BASE_URL}/student/courses/{course_id}/grades", 
                    headers=headers
                )
                if grades_response.status_code == 200:
                    grades = grades_response.json()
                    print(f"✅ Grades access - Success")
                else:
                    print(f"❌ Grades access failed: {grades_response.json().get('message')}")
                
                # Test attendance
                attendance_response = requests.get(
                    f"{BASE_URL}/student/courses/{course_id}/attendance", 
                    headers=headers
                )
                if attendance_response.status_code == 200:
                    attendance = attendance_response.json()
                    print(f"✅ Attendance access - Success")
                else:
                    print(f"❌ Attendance access failed: {attendance_response.json().get('message')}")
                    
            else:
                print("   No enrolled courses found for content access test")
        else:
            print(f"   Failed to get enrolled courses: {response.json().get('message')}")
            
    except Exception as e:
        print(f"❌ Course content access test error: {str(e)}")

def main():
    print("🧪 Student Panel Functionality Test")
    print("=" * 50)
    
    # Test with a student account
    student_credentials = [
        ("teststudent", "password123"),
        ("student1", "password123"),
        ("john_doe", "password123")
    ]
    
    for username, password in student_credentials:
        print(f"\n👤 Testing with student: {username}")
        token, user = test_login(username, password)
        
        if token and user:
            if user.get('role') == 'student':
                print(f"✅ Confirmed student role")
                
                # Test all endpoints
                results = test_student_endpoints(token)
                
                # Test enrollment functionality
                test_course_enrollment(token)
                
                # Test course content access
                test_course_content_access(token)
                
                # Summary
                print(f"\n📊 Test Summary for {username}:")
                success_count = sum(1 for r in results.values() if r['status'] == 'success')
                total_count = len(results)
                print(f"   Successful endpoints: {success_count}/{total_count}")
                
                break  # Use first successful student login
            else:
                print(f"❌ User {username} is not a student (role: {user.get('role')})")
        else:
            print(f"❌ Could not login as {username}")
    
    print(f"\n✨ Student panel testing completed!")

if __name__ == "__main__":
    main() 