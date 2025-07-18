#!/usr/bin/env python3
"""
Check university_ms database for admin users
"""

from pymongo import MongoClient

def check_university_db():
    client = MongoClient('mongodb://localhost:27017/')
    db = client['university_ms']
    
    print("🔍 Checking university_ms database...")
    print("=" * 50)
    
    # Count total documents in each collection
    collections = ['users', 'courses', 'enrollments', 'assignments', 'assignment_submissions', 'grades']
    
    for collection_name in collections:
        try:
            count = db[collection_name].count_documents({})
            print(f"📄 {collection_name}: {count} documents")
        except:
            print(f"❌ {collection_name}: Error reading collection")
    
    print("\n" + "=" * 50)
    print("👤 Admin Users:")
    print("=" * 50)
    
    # Find admin users
    admins = list(db.users.find({'role': 'admin'}, {'password_hash': 0}))
    
    if not admins:
        print("❌ No admin users found!")
        
        # Let's check all users and their roles
        print("\n🔍 All user roles:")
        user_roles = db.users.aggregate([
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ])
        
        for role_data in user_roles:
            print(f"  {role_data['_id']}: {role_data['count']} users")
        
        # Show some sample users
        print("\n📋 Sample users (first 5):")
        sample_users = list(db.users.find({}, {'password_hash': 0}).limit(5))
        for user in sample_users:
            print(f"  Username: {user.get('username', 'N/A')}, Role: {user.get('role', 'N/A')}, Email: {user.get('email', 'N/A')}")
    else:
        print(f"✅ Found {len(admins)} admin user(s):")
        for admin in admins:
            print(f"  👤 Username: {admin.get('username', 'N/A')}")
            print(f"     📧 Email: {admin.get('email', 'N/A')}")
            print(f"     📛 Name: {admin.get('first_name', '')} {admin.get('last_name', '')}")
            print(f"     ✅ Active: {admin.get('is_active', False)}")
            print()
    
    # Check if we have an admin password or need to create one
    if not admins:
        print("\n🔧 SOLUTION: Need to create admin user")
        print("Since no admin users exist, I'll create one...")
        
        from werkzeug.security import generate_password_hash
        
        test_admin = {
            "username": "admin",
            "password_hash": generate_password_hash("admin123"),
            "email": "admin@university.edu",
            "first_name": "System",
            "last_name": "Administrator",
            "role": "admin",
            "is_active": True,
            "date_joined": None,
            "enrolled_courses": [],
            "courses_teaching": []
        }
        
        result = db.users.insert_one(test_admin)
        print(f"✅ Admin user created with ID: {result.inserted_id}")
        print(f"📧 Username: admin")
        print(f"🔑 Password: admin123")
    
    client.close()

if __name__ == "__main__":
    check_university_db() 