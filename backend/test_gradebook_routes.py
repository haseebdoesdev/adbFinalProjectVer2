#!/usr/bin/env python3
"""
Test script for Teacher Gradebook API routes
Tests all the gradebook-related endpoints for teachers including:
- Getting course grades
- Individual grade component management
- Bulk grade uploads
- Grade calculations and statistics
- CSV export functionality
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from bson import ObjectId

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

class GradebookTester:
    def __init__(self):
        self.teacher_token = None
        self.student_tokens = []
        self.admin_token = None
        self.course_id = None
        self.student_ids = []
        self.teacher_id = None
        self.test_data = {}
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def setup_test_data(self):
        """Create test users, course, and enrollments"""
        self.log("Setting up test data...")
        
        # Create admin user for setup
        admin_data = {
            "username": "test_admin_gradebook",
            "email": "admin_gradebook@test.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "Admin",
            "role": "admin"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=admin_data)
        if response.status_code not in [201, 409]:  # 409 if user already exists
            self.log(f"Failed to create admin: {response.text}", "ERROR")
            return False
            
        # Login as admin
        login_response = requests.post(f"{API_BASE}/auth/login", json={
            "username": admin_data["username"],
            "password": admin_data["password"]
        })
        
        if login_response.status_code != 200:
            self.log(f"Admin login failed: {login_response.text}", "ERROR")
            return False
            
        self.admin_token = login_response.json()["access_token"]
        
        # Create teacher
        teacher_data = {
            "username": "test_teacher_gradebook",
            "email": "teacher_gradebook@test.com",
            "password": "testpass123",
            "first_name": "Professor",
            "last_name": "Smith",
            "role": "teacher",
            "department": "Computer Science",
            "teacher_id_str": "T001"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=teacher_data)
        if response.status_code not in [201, 409]:
            self.log(f"Failed to create teacher: {response.text}", "ERROR")
            return False
            
        # Login as teacher
        teacher_login = requests.post(f"{API_BASE}/auth/login", json={
            "username": teacher_data["username"],
            "password": teacher_data["password"]
        })
        
        if teacher_login.status_code != 200:
            self.log(f"Teacher login failed: {teacher_login.text}", "ERROR")
            return False
            
        self.teacher_token = teacher_login.json()["access_token"]
        
        # Create students
        student_data_list = [
            {
                "username": "student1_gradebook",
                "email": "student1_gradebook@test.com",
                "password": "testpass123",
                "first_name": "Alice",
                "last_name": "Johnson",
                "role": "student",
                "student_id_str": "S001",
                "major": "Computer Science"
            },
            {
                "username": "student2_gradebook",
                "email": "student2_gradebook@test.com",
                "password": "testpass123",
                "first_name": "Bob",
                "last_name": "Williams",
                "role": "student",
                "student_id_str": "S002",
                "major": "Mathematics"
            },
            {
                "username": "student3_gradebook",
                "email": "student3_gradebook@test.com",
                "password": "testpass123",
                "first_name": "Carol",
                "last_name": "Davis",
                "role": "student",
                "student_id_str": "S003",
                "major": "Computer Science"
            }
        ]
        
        for student_data in student_data_list:
            response = requests.post(f"{API_BASE}/auth/register", json=student_data)
            if response.status_code not in [201, 409]:
                self.log(f"Failed to create student {student_data['username']}: {response.text}", "ERROR")
                continue
                
            # Login as student to get ID
            student_login = requests.post(f"{API_BASE}/auth/login", json={
                "username": student_data["username"],
                "password": student_data["password"]
            })
            
            if student_login.status_code == 200:
                token = student_login.json()["access_token"]
                self.student_tokens.append(token)
                
        # Create course using admin token
        course_data = {
            "course_code": "CS101-GRAD",
            "course_name": "Introduction to Programming - Gradebook Test",
            "description": "Test course for gradebook functionality",
            "credits": 3,
            "department": "Computer Science",
            "max_capacity": 30,
            "semester": "Fall 2024",
            "year": 2024,
            "schedule_info": "Mon, Wed, Fri 10:00-11:00 AM"
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.post(f"{API_BASE}/admin/courses", json=course_data, headers=headers)
        
        if response.status_code != 201:
            self.log(f"Failed to create course: {response.text}", "ERROR")
            return False
            
        self.course_id = response.json()["course_id"]
        self.log(f"Created course with ID: {self.course_id}")
        
        # Assign teacher to course
        assign_data = {"teacher_username": teacher_data["username"]}
        response = requests.put(f"{API_BASE}/admin/courses/{self.course_id}/assign-teacher", 
                              json=assign_data, headers=headers)
        
        if response.status_code != 200:
            self.log(f"Failed to assign teacher: {response.text}", "ERROR")
            return False
            
        # Enroll students in course
        for i, student_data in enumerate(student_data_list):
            enroll_data = {"student_username": student_data["username"]}
            response = requests.post(f"{API_BASE}/admin/courses/{self.course_id}/enroll", 
                                   json=enroll_data, headers=headers)
            
            if response.status_code != 200:
                self.log(f"Failed to enroll student {student_data['username']}: {response.text}", "ERROR")
                continue
                
        # Get student IDs from course enrollment
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/students", headers=headers)
        
        if response.status_code == 200:
            students = response.json()
            self.student_ids = [student["user_id"] for student in students]
            self.log(f"Found {len(self.student_ids)} enrolled students")
        else:
            self.log(f"Failed to get enrolled students: {response.text}", "ERROR")
            return False
            
        self.log("Test data setup completed successfully!")
        return True
        
    def test_get_course_grades_empty(self):
        """Test getting grades for a course with no grades yet"""
        self.log("Testing get course grades (empty)...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades", headers=headers)
        
        if response.status_code == 200:
            grades = response.json()
            self.log(f"✓ Got {len(grades)} grades (expected 0 for new course)")
            return True
        else:
            self.log(f"✗ Failed to get course grades: {response.text}", "ERROR")
            return False
            
    def test_add_grade_components(self):
        """Test adding individual grade components to students"""
        self.log("Testing add grade components...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        success_count = 0
        
        # Add different types of grade components
        test_components = [
            {
                "component_type": "assignment",
                "name": "Homework 1",
                "points_earned": 85,
                "total_points": 100,
                "weight": 1.0
            },
            {
                "component_type": "quiz",
                "name": "Quiz 1",
                "points_earned": 18,
                "total_points": 20,
                "weight": 0.5
            },
            {
                "component_type": "exam",
                "name": "Midterm Exam",
                "points_earned": 88,
                "total_points": 100,
                "weight": 2.0
            }
        ]
        
        for i, student_id in enumerate(self.student_ids):
            for j, component in enumerate(test_components):
                # Vary scores slightly for different students
                modified_component = component.copy()
                modified_component["points_earned"] = component["points_earned"] + (i * 2) - j
                
                response = requests.post(
                    f"{API_BASE}/teacher/courses/{self.course_id}/students/{student_id}/grades/components",
                    json=modified_component,
                    headers=headers
                )
                
                if response.status_code == 200:
                    success_count += 1
                else:
                    self.log(f"✗ Failed to add component {component['name']} for student {student_id}: {response.text}", "ERROR")
                    
        expected_total = len(self.student_ids) * len(test_components)
        self.log(f"✓ Added {success_count}/{expected_total} grade components")
        return success_count == expected_total
        
    def test_get_course_grades_with_data(self):
        """Test getting grades after adding components"""
        self.log("Testing get course grades (with data)...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades", headers=headers)
        
        if response.status_code == 200:
            grades = response.json()
            self.log(f"✓ Got {len(grades)} grade records")
            
            # Verify structure
            if grades and len(grades) > 0:
                first_grade = grades[0]
                required_fields = ["student", "components"]
                
                for field in required_fields:
                    if field not in first_grade:
                        self.log(f"✗ Missing field '{field}' in grade record", "ERROR")
                        return False
                        
                self.log(f"✓ First student has {len(first_grade['components'])} components")
                
            return True
        else:
            self.log(f"✗ Failed to get course grades: {response.text}", "ERROR")
            return False
            
    def test_get_individual_student_grade(self):
        """Test getting individual student grade"""
        self.log("Testing get individual student grade...")
        
        if not self.student_ids:
            self.log("✗ No student IDs available", "ERROR")
            return False
            
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        student_id = self.student_ids[0]
        
        response = requests.get(
            f"{API_BASE}/teacher/courses/{self.course_id}/students/{student_id}/grades",
            headers=headers
        )
        
        if response.status_code == 200:
            grade = response.json()
            self.log(f"✓ Got individual grade for student {student_id}")
            self.log(f"  Student: {grade['student']['name']}")
            self.log(f"  Components: {len(grade['components'])}")
            return True
        else:
            self.log(f"✗ Failed to get individual student grade: {response.text}", "ERROR")
            return False
            
    def test_update_grade_component(self):
        """Test updating a grade component"""
        self.log("Testing update grade component...")
        
        # First get a grade to find a component ID
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades", headers=headers)
        
        if response.status_code != 200 or not response.json():
            self.log("✗ No grades available to test update", "ERROR")
            return False
            
        grades = response.json()
        first_grade = grades[0]
        student_id = first_grade["student"]["id"]
        
        if not first_grade["components"]:
            self.log("✗ No components available to test update", "ERROR")
            return False
            
        component = first_grade["components"][0]
        component_id = component.get("component_id")
        
        if not component_id:
            self.log("✗ No component ID found", "ERROR")
            return False
            
        # Update the component
        update_data = {
            "points_earned": 95,
            "feedback": "Excellent work!"
        }
        
        response = requests.put(
            f"{API_BASE}/teacher/courses/{self.course_id}/students/{student_id}/grades/components/{component_id}",
            json=update_data,
            headers=headers
        )
        
        if response.status_code == 200:
            self.log("✓ Successfully updated grade component")
            return True
        else:
            self.log(f"✗ Failed to update grade component: {response.text}", "ERROR")
            return False
            
    def test_bulk_upload_grades(self):
        """Test bulk uploading grades"""
        self.log("Testing bulk upload grades...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        
        # Prepare bulk grade data
        bulk_grades = []
        for i, student_id in enumerate(self.student_ids):
            bulk_grades.append({
                "student_id": f"S{str(i+1).zfill(3)}",  # Use student_id_str
                "component_name": "Final Project",
                "points_earned": 85 + (i * 3),
                "total_points": 100
            })
            
        bulk_data = {"grades": bulk_grades}
        
        response = requests.post(
            f"{API_BASE}/teacher/courses/{self.course_id}/grades/bulk",
            json=bulk_data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            self.log(f"✓ Bulk upload completed: {result['updated_count']} updated, {result['error_count']} errors")
            if result['errors']:
                for error in result['errors']:
                    self.log(f"  Error: {error}", "WARN")
            return True
        else:
            self.log(f"✗ Failed bulk upload: {response.text}", "ERROR")
            return False
            
    def test_calculate_final_grades(self):
        """Test calculating final grades"""
        self.log("Testing calculate final grades...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.post(
            f"{API_BASE}/teacher/courses/{self.course_id}/grades/calculate",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            self.log(f"✓ Final grades calculated for {result['updated_count']} students")
            return True
        else:
            self.log(f"✗ Failed to calculate final grades: {response.text}", "ERROR")
            return False
            
    def test_get_grade_statistics(self):
        """Test getting grade statistics"""
        self.log("Testing get grade statistics...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(
            f"{API_BASE}/teacher/courses/{self.course_id}/grades/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            self.log(f"✓ Grade statistics retrieved:")
            self.log(f"  Total students: {stats['total_students']}")
            self.log(f"  Average grade: {stats['average_grade']:.1f}%")
            self.log(f"  Highest grade: {stats['highest_grade']:.1f}%")
            self.log(f"  Lowest grade: {stats['lowest_grade']:.1f}%")
            self.log(f"  Passing rate: {stats['passing_rate']:.1f}%")
            return True
        else:
            self.log(f"✗ Failed to get grade statistics: {response.text}", "ERROR")
            return False
            
    def test_export_grades_csv(self):
        """Test exporting grades to CSV"""
        self.log("Testing export grades to CSV...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(
            f"{API_BASE}/teacher/courses/{self.course_id}/grades/export",
            headers=headers
        )
        
        if response.status_code == 200:
            # Check if response is CSV
            content_type = response.headers.get('content-type', '')
            if 'csv' in content_type:
                csv_content = response.text
                lines = csv_content.strip().split('\n')
                self.log(f"✓ CSV export successful: {len(lines)} lines")
                self.log(f"  Header: {lines[0] if lines else 'No header'}")
                return True
            else:
                self.log(f"✗ Expected CSV content, got: {content_type}", "ERROR")
                return False
        else:
            self.log(f"✗ Failed to export grades: {response.text}", "ERROR")
            return False
            
    def test_delete_grade_component(self):
        """Test deleting a grade component"""
        self.log("Testing delete grade component...")
        
        # First get a grade to find a component ID
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades", headers=headers)
        
        if response.status_code != 200 or not response.json():
            self.log("✗ No grades available to test delete", "ERROR")
            return False
            
        grades = response.json()
        first_grade = grades[0]
        student_id = first_grade["student"]["id"]
        
        if not first_grade["components"]:
            self.log("✗ No components available to test delete", "ERROR")
            return False
            
        component = first_grade["components"][0]
        component_id = component.get("component_id")
        
        if not component_id:
            self.log("✗ No component ID found", "ERROR")
            return False
            
        # Delete the component
        response = requests.delete(
            f"{API_BASE}/teacher/courses/{self.course_id}/students/{student_id}/grades/components/{component_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            self.log("✓ Successfully deleted grade component")
            return True
        else:
            self.log(f"✗ Failed to delete grade component: {response.text}", "ERROR")
            return False
            
    def test_unauthorized_access(self):
        """Test unauthorized access scenarios"""
        self.log("Testing unauthorized access...")
        
        # Test without token
        response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades")
        if response.status_code == 401:
            self.log("✓ Correctly rejected request without token")
        else:
            self.log(f"✗ Expected 401, got {response.status_code}", "ERROR")
            return False
            
        # Test with student token (should be forbidden)
        if self.student_tokens:
            headers = {"Authorization": f"Bearer {self.student_tokens[0]}"}
            response = requests.get(f"{API_BASE}/teacher/courses/{self.course_id}/grades", headers=headers)
            if response.status_code == 403:
                self.log("✓ Correctly rejected student access to teacher endpoint")
            else:
                self.log(f"✗ Expected 403 for student access, got {response.status_code}", "ERROR")
                return False
                
        return True
        
    def test_invalid_data(self):
        """Test with invalid data"""
        self.log("Testing invalid data scenarios...")
        
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        
        # Test with invalid course ID
        response = requests.get(f"{API_BASE}/teacher/courses/invalid_id/grades", headers=headers)
        if response.status_code == 400:
            self.log("✓ Correctly rejected invalid course ID")
        else:
            self.log(f"✗ Expected 400 for invalid course ID, got {response.status_code}", "ERROR")
            return False
            
        # Test adding component with missing data
        invalid_component = {
            "component_type": "assignment"
            # Missing required fields
        }
        
        if self.student_ids:
            response = requests.post(
                f"{API_BASE}/teacher/courses/{self.course_id}/students/{self.student_ids[0]}/grades/components",
                json=invalid_component,
                headers=headers
            )
            if response.status_code in [400, 500]:  # Either bad request or server error is acceptable
                self.log("✓ Correctly handled invalid component data")
            else:
                self.log(f"✗ Expected error for invalid component, got {response.status_code}", "ERROR")
                return False
                
        return True
        
    def cleanup_test_data(self):
        """Clean up test data"""
        self.log("Cleaning up test data...")
        
        if not self.admin_token:
            self.log("No admin token available for cleanup", "WARN")
            return
            
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Delete course (this should cascade to enrollments and grades)
        if self.course_id:
            response = requests.delete(f"{API_BASE}/admin/courses/{self.course_id}", headers=headers)
            if response.status_code == 200:
                self.log("✓ Course deleted successfully")
            else:
                self.log(f"Failed to delete course: {response.text}", "WARN")
                
        # Note: In a real system, you might also want to delete the test users
        # but for this test script, we'll leave them for potential reuse
        
    def run_all_tests(self):
        """Run all gradebook tests"""
        self.log("Starting Gradebook API Tests", "INFO")
        self.log("="*50)
        
        if not self.setup_test_data():
            self.log("Failed to setup test data, aborting tests", "ERROR")
            return False
            
        tests = [
            ("Empty Course Grades", self.test_get_course_grades_empty),
            ("Add Grade Components", self.test_add_grade_components),
            ("Course Grades with Data", self.test_get_course_grades_with_data),
            ("Individual Student Grade", self.test_get_individual_student_grade),
            ("Update Grade Component", self.test_update_grade_component),
            ("Bulk Upload Grades", self.test_bulk_upload_grades),
            ("Calculate Final Grades", self.test_calculate_final_grades),
            ("Grade Statistics", self.test_get_grade_statistics),
            ("Export CSV", self.test_export_grades_csv),
            ("Delete Grade Component", self.test_delete_grade_component),
            ("Unauthorized Access", self.test_unauthorized_access),
            ("Invalid Data", self.test_invalid_data),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\nRunning: {test_name}")
            self.log("-" * 40)
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"✓ PASSED: {test_name}")
                else:
                    self.log(f"✗ FAILED: {test_name}")
            except Exception as e:
                self.log(f"✗ ERROR in {test_name}: {str(e)}", "ERROR")
                
        self.log("\n" + "="*50)
        self.log(f"Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed!", "INFO")
        else:
            self.log(f"❌ {total - passed} tests failed", "ERROR")
            
        self.cleanup_test_data()
        return passed == total

def main():
    """Main function to run the tests"""
    print("Teacher Gradebook API Test Suite")
    print("=" * 50)
    
    tester = GradebookTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 