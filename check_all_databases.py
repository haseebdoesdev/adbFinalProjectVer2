#!/usr/bin/env python3
"""
Script to check all MongoDB databases and find the actual data
"""

from pymongo import MongoClient
from datetime import datetime

def check_all_databases():
    """Check all MongoDB databases to find where the data is"""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        
        print("🔍 Checking all MongoDB databases...")
        print("=" * 60)
        
        # List all databases
        databases = client.list_database_names()
        print(f"📁 Found {len(databases)} databases:")
        
        for db_name in databases:
            print(f"\n🗄️  Database: {db_name}")
            
            if db_name in ['admin', 'config', 'local']:
                print("   (System database - skipping)")
                continue
                
            db = client[db_name]
            collections = db.list_collection_names()
            
            if not collections:
                print("   📂 No collections found")
                continue
                
            print(f"   📂 Collections ({len(collections)}):")
            
            total_docs = 0
            collection_stats = {}
            
            for collection_name in collections:
                try:
                    collection = db[collection_name]
                    count = collection.count_documents({})
                    collection_stats[collection_name] = count
                    total_docs += count
                    print(f"      📄 {collection_name}: {count} documents")
                    
                    # Sample a document if exists
                    if count > 0:
                        sample = collection.find_one({})
                        if sample:
                            sample_keys = list(sample.keys())
                            print(f"         Sample keys: {sample_keys[:5]}{'...' if len(sample_keys) > 5 else ''}")
                            
                except Exception as e:
                    print(f"      ❌ Error reading {collection_name}: {str(e)}")
            
            print(f"   📊 Total documents: {total_docs}")
            
            # If this looks like our main database, show more details
            if 'users' in collection_stats and 'courses' in collection_stats:
                print(f"\n   🎯 This looks like the main application database!")
                
                # Check users by role
                users_collection = db['users']
                user_roles = users_collection.aggregate([
                    {"$group": {"_id": "$role", "count": {"$sum": 1}}}
                ])
                
                print(f"   👥 Users by role:")
                for role_data in user_roles:
                    print(f"      {role_data['_id']}: {role_data['count']}")
                
                # Check course departments
                if collection_stats.get('courses', 0) > 0:
                    courses_collection = db['courses']
                    departments = courses_collection.aggregate([
                        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
                    ])
                    
                    print(f"   🏢 Courses by department:")
                    for dept_data in departments:
                        print(f"      {dept_data['_id']}: {dept_data['count']}")
                
                # Check recent data
                if collection_stats.get('enrollments', 0) > 0:
                    enrollments_collection = db['enrollments']
                    recent_enrollments = enrollments_collection.count_documents({
                        "enrollment_date": {"$gte": datetime(2024, 1, 1)}
                    })
                    print(f"   📈 Recent enrollments (2024+): {recent_enrollments}")
                
                if collection_stats.get('assignments', 0) > 0:
                    assignments_collection = db['assignments']
                    recent_assignments = assignments_collection.count_documents({
                        "created_at": {"$gte": datetime(2024, 1, 1)}
                    })
                    print(f"   📝 Recent assignments (2024+): {recent_assignments}")
        
        client.close()
        
        print("\n" + "=" * 60)
        print("🎯 RECOMMENDATION:")
        print("=" * 60)
        
        # Find the database with the most data
        max_docs = 0
        best_db = None
        
        for db_name in databases:
            if db_name in ['admin', 'config', 'local']:
                continue
                
            db = client[db_name]
            collections = db.list_collection_names()
            total_docs = 0
            
            for collection_name in collections:
                try:
                    count = db[collection_name].count_documents({})
                    total_docs += count
                except:
                    pass
            
            if total_docs > max_docs:
                max_docs = total_docs
                best_db = db_name
        
        if best_db and max_docs > 0:
            print(f"📊 Use database: '{best_db}' (has {max_docs} total documents)")
            
            # Show the backend connection string needed
            print(f"\n🔧 Backend Configuration Update:")
            print(f"   Update your MongoDB connection to use database: '{best_db}'")
            print(f"   Current: 'university_ms'")
            print(f"   Recommended: '{best_db}'")
        else:
            print("❌ No databases with significant data found.")
            print("   You may need to:")
            print("   1. Import sample data")
            print("   2. Check if MongoDB is running the correct data")
            print("   3. Verify the connection string")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking databases: {str(e)}")
        return False

if __name__ == "__main__":
    check_all_databases() 