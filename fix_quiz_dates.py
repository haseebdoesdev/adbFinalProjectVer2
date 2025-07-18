#!/usr/bin/env python3
from pymongo import MongoClient
from backend.config import Config

def fix_quiz_dates():
    client = MongoClient(Config.MONGO_URI)
    db = client.get_database()

    # Find quizzes with null end_date
    quizzes_to_fix = list(db.quizzes.find({"end_date": None}))
    
    print(f"Found {len(quizzes_to_fix)} quizzes with null end_date")
    
    updated_count = 0
    for quiz in quizzes_to_fix:
        # Set end_date to due_date if due_date exists
        if quiz.get('due_date'):
            result = db.quizzes.update_one(
                {"_id": quiz['_id']},
                {"$set": {"end_date": quiz['due_date']}}
            )
            if result.modified_count > 0:
                updated_count += 1
                print(f"Fixed quiz: {quiz['title']}")
    
    print(f"Updated {updated_count} quiz(es)")

if __name__ == "__main__":
    fix_quiz_dates() 