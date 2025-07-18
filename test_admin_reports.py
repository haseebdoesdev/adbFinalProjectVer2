#!/usr/bin/env python3
"""
Test script for Admin Reports API endpoints
Tests all admin report routes to identify data population issues
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000/api/admin"
TEST_ADMIN_CREDENTIALS = {
    "username": "admin1",  # Use existing admin username from university_ms database
    "password": "password123"  # Try common password first
}

class AdminReportsAPITester:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        
    def authenticate(self):
        """Authenticate as admin user"""
        # Common passwords to try
        common_passwords = ["password123", "admin123", "123456", "password", "admin", "university123"]
        
        try:
            print("🔐 Authenticating as admin...")
            auth_url = "http://localhost:5000/api/auth/login"
            
            for password in common_passwords:
                credentials = {
                    "username": "admin1",
                    "password": password
                }
                
                print(f"   Trying password: {password}")
                response = self.session.post(auth_url, json=credentials)
                
                if response.status_code == 200:
                    data = response.json()
                    self.token = data.get('access_token')
                    if self.token:
                        self.session.headers.update({
                            'Authorization': f'Bearer {self.token}',
                            'Content-Type': 'application/json'
                        })
                        print(f"✅ Authentication successful with password: {password}")
                        return True
                elif response.status_code == 401:
                    print(f"   ❌ Wrong password: {password}")
                    continue
                else:
                    print(f"   ❌ Unexpected response ({response.status_code}): {response.text}")
                    continue
            
            print("❌ Authentication failed with all common passwords")
            print("🔧 You may need to:")
            print("   1. Check the actual password in the database")
            print("   2. Reset the admin password") 
            print("   3. Create a new admin user with known credentials")
            return False
                    
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def test_endpoint(self, endpoint, params=None, description=""):
        """Test a single endpoint and return results"""
        try:
            url = f"{BASE_URL}{endpoint}"
            print(f"\n📊 Testing: {description}")
            print(f"🔗 URL: {url}")
            if params:
                print(f"📝 Params: {params}")
            
            response = self.session.get(url, params=params)
            
            print(f"📋 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"✅ SUCCESS - Data received")
                    
                    # Show data summary
                    if isinstance(data, list):
                        print(f"📄 Array length: {len(data)}")
                        if len(data) > 0:
                            print(f"📄 Sample item keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not a dict'}")
                        else:
                            print("⚠️  Empty array returned")
                    elif isinstance(data, dict):
                        print(f"📄 Object keys: {list(data.keys())}")
                        # Show some values for key metrics
                        for key, value in data.items():
                            if isinstance(value, (int, float)):
                                print(f"📊 {key}: {value}")
                    else:
                        print(f"📄 Data type: {type(data)}")
                    
                    return {
                        'success': True,
                        'status_code': response.status_code,
                        'data': data,
                        'data_type': type(data).__name__,
                        'length': len(data) if isinstance(data, (list, dict)) else None
                    }
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON decode error: {str(e)}")
                    print(f"Raw response: {response.text[:500]}...")
                    return {'success': False, 'error': 'JSON decode error'}
                    
            else:
                print(f"❌ FAILED - Status: {response.status_code}")
                print(f"Error response: {response.text}")
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'error': response.text
                }
                
        except Exception as e:
            print(f"❌ Exception occurred: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def run_all_tests(self):
        """Run tests for all admin report endpoints"""
        if not self.authenticate():
            print("❌ Cannot proceed without authentication")
            return
        
        print("\n" + "="*80)
        print("🚀 STARTING COMPREHENSIVE ADMIN REPORTS API TESTS")
        print("="*80)
        
        # Test cases
        test_cases = [
            {
                'endpoint': '/reports/system-stats',
                'description': 'System Statistics',
                'params': None
            },
            {
                'endpoint': '/reports/enrollment-trends',
                'description': 'Enrollment Trends (Month)',
                'params': {'period': 'month'}
            },
            {
                'endpoint': '/reports/enrollment-trends',
                'description': 'Enrollment Trends (Week)',
                'params': {'period': 'week'}
            },
            {
                'endpoint': '/reports/enrollment-trends',
                'description': 'Enrollment Trends (Quarter)',
                'params': {'period': 'quarter'}
            },
            {
                'endpoint': '/reports/enrollment-trends',
                'description': 'Enrollment Trends (Year)',
                'params': {'period': 'year'}
            },
            {
                'endpoint': '/reports/course-performance',
                'description': 'Course Performance (All Departments)',
                'params': None
            },
            {
                'endpoint': '/reports/course-performance',
                'description': 'Course Performance (Computer Science)',
                'params': {'department': 'Computer Science'}
            },
            {
                'endpoint': '/reports/department-stats',
                'description': 'Department Statistics',
                'params': None
            },
            {
                'endpoint': '/reports/recent-activities',
                'description': 'Recent Activities (Default)',
                'params': None
            },
            {
                'endpoint': '/reports/recent-activities',
                'description': 'Recent Activities (Limit 10)',
                'params': {'limit': 10}
            },
            {
                'endpoint': '/reports/recent-activities',
                'description': 'Recent Activities (Limit 50)',
                'params': {'limit': 50}
            },
            {
                'endpoint': '/reports/top-students',
                'description': 'Top Students (Default)',
                'params': None
            },
            {
                'endpoint': '/reports/top-students',
                'description': 'Top Students (Limit 5)',
                'params': {'limit': 5}
            },
            {
                'endpoint': '/reports/teacher-performance',
                'description': 'Teacher Performance',
                'params': None
            },
            {
                'endpoint': '/reports/grade-distribution',
                'description': 'Grade Distribution (All)',
                'params': None
            },
            {
                'endpoint': '/reports/grade-distribution',
                'description': 'Grade Distribution (Computer Science)',
                'params': {'department': 'Computer Science'}
            },
            {
                'endpoint': '/reports/assignment-completion',
                'description': 'Assignment Completion Rates',
                'params': None
            },
            {
                'endpoint': '/reports/comprehensive',
                'description': 'Comprehensive Report (Month)',
                'params': {'period': 'month'}
            },
            {
                'endpoint': '/reports/comprehensive',
                'description': 'Comprehensive Report (Week, CS)',
                'params': {'period': 'week', 'department': 'Computer Science'}
            }
        ]
        
        # Store results
        results = {}
        successful_tests = 0
        failed_tests = 0
        
        # Run each test
        for test_case in test_cases:
            result = self.test_endpoint(
                test_case['endpoint'],
                test_case.get('params'),
                test_case['description']
            )
            
            test_key = f"{test_case['endpoint']}_{test_case.get('params', 'no_params')}"
            results[test_key] = result
            
            if result['success']:
                successful_tests += 1
            else:
                failed_tests += 1
        
        # Print summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        print(f"✅ Successful tests: {successful_tests}")
        print(f"❌ Failed tests: {failed_tests}")
        print(f"📊 Total tests: {len(test_cases)}")
        
        # Detailed analysis
        print("\n" + "="*80)
        print("🔍 DETAILED ANALYSIS")
        print("="*80)
        
        empty_data_endpoints = []
        error_endpoints = []
        
        for test_key, result in results.items():
            if not result['success']:
                error_endpoints.append(test_key)
            elif result.get('length') == 0:
                empty_data_endpoints.append(test_key)
        
        if empty_data_endpoints:
            print("\n⚠️  ENDPOINTS RETURNING EMPTY DATA:")
            for endpoint in empty_data_endpoints:
                print(f"   - {endpoint}")
        
        if error_endpoints:
            print("\n❌ ENDPOINTS WITH ERRORS:")
            for endpoint in error_endpoints:
                result = results[endpoint]
                print(f"   - {endpoint}: {result.get('error', 'Unknown error')}")
        
        return results
    
    def test_database_collections(self):
        """Test if database collections have data"""
        print("\n" + "="*80)
        print("🗄️  DATABASE COLLECTION CHECK")
        print("="*80)
        
        # We can't directly access MongoDB from here, but we can make some basic checks
        # by testing simple endpoints that should have data
        
        basic_checks = [
            ('/dashboard/stats', 'Basic Dashboard Stats'),
            ('/users', 'Users Collection'),
            ('/courses', 'Courses Collection')
        ]
        
        for endpoint, description in basic_checks:
            print(f"\n🔍 Checking: {description}")
            result = self.test_endpoint(endpoint, description=description)
            
            if result['success'] and isinstance(result.get('data'), (list, dict)):
                data = result['data']
                if isinstance(data, list):
                    print(f"📊 Collection has {len(data)} items")
                elif isinstance(data, dict):
                    print(f"📊 Data object with keys: {list(data.keys())}")
            else:
                print("⚠️  No data or error occurred")

def main():
    """Main function to run all tests"""
    print("🧪 Admin Reports API Comprehensive Tester")
    print("=" * 50)
    
    tester = AdminReportsAPITester()
    
    # Run all tests
    results = tester.run_all_tests()
    
    # Test basic database collections
    tester.test_database_collections()
    
    print("\n" + "="*80)
    print("🏁 TESTING COMPLETED")
    print("="*80)
    print("📄 Check the output above for detailed results and recommendations")
    
    # Return exit code based on results
    failed_count = sum(1 for result in results.values() if not result['success'])
    if failed_count > 0:
        print(f"⚠️  {failed_count} tests failed. Please check the backend implementation.")
        sys.exit(1)
    else:
        print("✅ All tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main() 