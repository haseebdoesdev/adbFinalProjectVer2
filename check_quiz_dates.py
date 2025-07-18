#!/usr/bin/env python3
from pymongo import MongoClient
from backend.config import Config
import json

def check_quiz_dates():
    client = MongoClient(Config.MONGO_URI)
    db = client.get_database()

    # Check quiz dates to see what format they're in
    quizzes = list(db.quizzes.find({}, {
        'title': 1, 
        'start_date': 1, 
        'end_date': 1, 
        'due_date': 1
    }).limit(5))
    
    print("Quiz date formats in database:")
    print("=" * 50)
    
    for quiz in quizzes:
        print(f'Quiz: {quiz.get("title")}')
        print(f'  Start Date: {quiz.get("start_date")} ({type(quiz.get("start_date"))})')
        print(f'  End Date: {quiz.get("end_date")} ({type(quiz.get("end_date"))})')
        print(f'  Due Date: {quiz.get("due_date")} ({type(quiz.get("due_date"))})')
        print()

if __name__ == "__main__":
    check_quiz_dates() 