#!/usr/bin/env python3
import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
LOGIN_URL = f"{BASE_URL}/login"

# Test credentials for teacher
TEACHER_CREDENTIALS = {
    "username": "teacher1",
    "password": "password123"
}

def get_teacher_token():
    """Login as teacher and get JWT token"""
    response = requests.post(LOGIN_URL, json=TEACHER_CREDENTIALS)
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_quiz_operations():
    """Test quiz operations endpoints"""
    token = get_teacher_token()
    if not token:
        print("Failed to get teacher token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test get quizzes
    print("Testing get quizzes...")
    courses_response = requests.get(f"{BASE_URL}/teacher/courses/my", headers=headers)
    if courses_response.status_code != 200:
        print(f"Failed to get courses: {courses_response.status_code}")
        return
    
    courses = courses_response.json()
    if not courses:
        print("No courses found")
        return
    
    course_id = courses[0]['_id']
    print(f"Using course ID: {course_id}")
    
    # Get existing quizzes
    quizzes_response = requests.get(f"{BASE_URL}/teacher/courses/{course_id}/quizzes", headers=headers)
    print(f"Get quizzes: {quizzes_response.status_code}")
    
    if quizzes_response.status_code == 200:
        quizzes = quizzes_response.json()
        print(f"Found {len(quizzes)} quizzes")
        
        if quizzes:
            quiz_id = quizzes[0]['_id']
            print(f"Testing with quiz ID: {quiz_id}")
            
            # Test get quiz submissions
            print("\nTesting get quiz submissions...")
            submissions_response = requests.get(f"{BASE_URL}/teacher/quizzes/{quiz_id}/submissions", headers=headers)
            print(f"Get quiz submissions: {submissions_response.status_code}")
            if submissions_response.status_code == 200:
                submissions = submissions_response.json()
                print(f"Found {len(submissions)} submissions")
            else:
                print(f"Error: {submissions_response.text}")
            
            # Test update quiz
            print("\nTesting update quiz...")
            update_data = {
                "title": "Updated Quiz Title",
                "description": "Updated description"
            }
            update_response = requests.put(f"{BASE_URL}/teacher/quizzes/{quiz_id}", json=update_data, headers=headers)
            print(f"Update quiz: {update_response.status_code}")
            if update_response.status_code != 200:
                print(f"Error: {update_response.text}")
            
            # Test delete quiz (commented out to avoid actually deleting)
            # print("\nTesting delete quiz...")
            # delete_response = requests.delete(f"{BASE_URL}/teacher/quizzes/{quiz_id}", headers=headers)
            # print(f"Delete quiz: {delete_response.status_code}")
            
        else:
            print("No quizzes found to test with")
    else:
        print(f"Error getting quizzes: {quizzes_response.text}")

if __name__ == "__main__":
    test_quiz_operations() 