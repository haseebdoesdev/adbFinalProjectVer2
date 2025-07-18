#!/usr/bin/env python3
"""
Test script for admin export functionality
"""

import requests
import json

def test_export():
    # Login first
    print("🔐 Logging in...")
    login_response = requests.post('http://localhost:5000/api/auth/login', json={
        'username': 'admin1',
        'password': 'password123'
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return
    
    token = login_response.json().get('access_token')
    if not token:
        print("❌ No access token received")
        return
    
    print("✅ Login successful")
    
    # Test export endpoints
    headers = {'Authorization': f'Bearer {token}'}
    
    test_cases = [
        ('system-stats', 'csv'),
        ('system-stats', 'json'),
        ('course-performance', 'csv'),
        ('top-students', 'csv'),
    ]
    
    for report_type, format_type in test_cases:
        print(f"\n📊 Testing export: {report_type} ({format_type})")
        
        url = f'http://localhost:5000/api/admin/reports/export/{report_type}'
        params = {'format': format_type}
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                content_type = response.headers.get('Content-Type', 'Unknown')
                content_disposition = response.headers.get('Content-Disposition', 'No disposition')
                content_length = len(response.content)
                
                print(f"✅ SUCCESS")
                print(f"   Content-Type: {content_type}")
                print(f"   Content-Disposition: {content_disposition}")
                print(f"   Content Length: {content_length} bytes")
                
                if format_type == 'json':
                    try:
                        data = response.json()
                        print(f"   JSON Keys: {list(data.keys()) if isinstance(data, dict) else 'Array data'}")
                    except:
                        print("   JSON parsing failed")
                elif format_type == 'csv':
                    lines = response.text.split('\n')
                    print(f"   CSV Lines: {len(lines)}")
                    if lines:
                        print(f"   CSV Header: {lines[0][:100]}...")
                        
            else:
                print(f"❌ FAILED - Status: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
    
    print("\n🏁 Export testing completed!")

if __name__ == "__main__":
    test_export() 