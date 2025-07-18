from typing import Dict, Any, List, Optional, Callable
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.errors import DuplicateKeyError, OperationFailure
from extensions import mongo
from datetime import datetime
import time
import threading

class OptimisticLockException(Exception):
    """Exception raised when optimistic locking fails."""
    pass

class DatabaseUtils:
    """Utility class for advanced database operations."""
    
    @staticmethod
    def create_indexes():
        """Create all necessary indexes for the collections."""
        try:
            # Users collection indexes
            mongo.db.users.create_index("username", unique=True)
            mongo.db.users.create_index("email", unique=True)
            mongo.db.users.create_index("role")
            mongo.db.users.create_index([("first_name", TEXT), ("last_name", TEXT)])
            
            # Courses collection indexes
            mongo.db.courses.create_index("course_code", unique=True)
            mongo.db.courses.create_index("teacher_id")
            mongo.db.courses.create_index("department")
            mongo.db.courses.create_index([("semester", 1), ("year", 1)])
            mongo.db.courses.create_index([("course_name", TEXT), ("description", TEXT)])
            
            # Enrollments collection indexes
            mongo.db.enrollments.create_index([("student_id", 1), ("course_id", 1)], unique=True)
            mongo.db.enrollments.create_index("student_id")
            mongo.db.enrollments.create_index("course_id")
            mongo.db.enrollments.create_index("status")
            
            # Assignments collection indexes
            mongo.db.assignments.create_index("course_id")
            mongo.db.assignments.create_index("teacher_id")
            mongo.db.assignments.create_index("due_date")
            mongo.db.assignments.create_index([("title", TEXT), ("description", TEXT)])
            
            # Quizzes collection indexes
            mongo.db.quizzes.create_index("course_id")
            mongo.db.quizzes.create_index("teacher_id")
            mongo.db.quizzes.create_index("due_date")
            mongo.db.quizzes.create_index([("title", TEXT), ("description", TEXT)])
            
            # Submissions collections indexes
            mongo.db.assignment_submissions.create_index([("student_id", 1), ("assignment_id", 1)], unique=True)
            mongo.db.assignment_submissions.create_index("assignment_id")
            mongo.db.assignment_submissions.create_index("student_id")
            mongo.db.assignment_submissions.create_index("submission_date")
            
            mongo.db.quiz_submissions.create_index([("student_id", 1), ("quiz_id", 1)], unique=True)
            mongo.db.quiz_submissions.create_index("quiz_id")
            mongo.db.quiz_submissions.create_index("student_id")
            mongo.db.quiz_submissions.create_index("submission_date")
            
            # Attendance collection indexes
            mongo.db.attendance.create_index([("course_id", 1), ("date", 1)], unique=True)
            mongo.db.attendance.create_index("course_id")
            mongo.db.attendance.create_index("date")
            
            # Grades collection indexes
            mongo.db.grades.create_index([("student_id", 1), ("course_id", 1)], unique=True)
            mongo.db.grades.create_index("student_id")
            mongo.db.grades.create_index("course_id")
            
            # Calendar events collection indexes
            mongo.db.calendar_events.create_index("course_id")
            mongo.db.calendar_events.create_index("created_by")
            mongo.db.calendar_events.create_index("start_datetime")
            mongo.db.calendar_events.create_index("event_type")
            
            # Notifications collection indexes
            mongo.db.notifications.create_index("recipient_id")
            mongo.db.notifications.create_index("is_read")
            mongo.db.notifications.create_index("created_at")
            mongo.db.notifications.create_index("notification_type")
            
            print("All database indexes created successfully")
            return True
            
        except Exception as e:
            print(f"Error creating indexes: {str(e)}")
            return False
    
    @staticmethod
    def optimistic_lock_update(collection_name: str, document_id: ObjectId, 
                              update_data: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """
        Perform optimistic locking update on a document.
        Uses a version field to detect concurrent modifications.
        """
        collection = getattr(mongo.db, collection_name)
        
        for attempt in range(max_retries):
            try:
                # Get current document with version
                current_doc = collection.find_one({"_id": document_id})
                if not current_doc:
                    raise ValueError("Document not found")
                
                current_version = current_doc.get("version", 0)
                
                # Prepare update with incremented version
                update_with_version = {
                    **update_data,
                    "version": current_version + 1,
                    "updated_at": datetime.utcnow()
                }
                
                # Attempt update with version check
                result = collection.update_one(
                    {"_id": document_id, "version": current_version},
                    {"$set": update_with_version}
                )
                
                if result.modified_count == 1:
                    # Success - document was updated
                    updated_doc = collection.find_one({"_id": document_id})
                    return {"success": True, "document": updated_doc}
                else:
                    # Version mismatch - document was modified by another process
                    if attempt == max_retries - 1:
                        raise OptimisticLockException("Document was modified by another process")
                    
                    # Wait a bit before retrying
                    time.sleep(0.1 * (attempt + 1))
                    continue
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(0.1 * (attempt + 1))
        
        raise OptimisticLockException("Failed to update after maximum retries")
    
    @staticmethod
    def pessimistic_lock_operation(lock_key: str, operation: Callable, timeout: int = 30) -> Any:
        """
        Perform pessimistic locking using a distributed lock mechanism.
        Uses a locks collection to implement distributed locking.
        """
        lock_collection = mongo.db.locks
        lock_id = ObjectId()
        
        try:
            # Try to acquire lock
            lock_doc = {
                "_id": lock_id,
                "lock_key": lock_key,
                "acquired_at": datetime.utcnow(),
                "expires_at": datetime.utcnow().timestamp() + timeout,
                "thread_id": threading.get_ident()
            }
            
            # Clean up expired locks first
            lock_collection.delete_many({
                "lock_key": lock_key,
                "expires_at": {"$lt": datetime.utcnow().timestamp()}
            })
            
            # Try to acquire lock
            try:
                lock_collection.insert_one(lock_doc)
            except DuplicateKeyError:
                raise OperationFailure("Failed to acquire lock - another process is holding it")
            
            # Execute the operation
            return operation()
            
        finally:
            # Release lock
            lock_collection.delete_one({"_id": lock_id})
    
    @staticmethod
    def setup_sharding_config():
        """
        Configure sharding for large collections.
        This is a placeholder for production sharding setup.
        """
        sharding_config = {
            "users": {
                "shard_key": {"role": 1, "_id": 1},
                "collections": ["users"]
            },
            "courses": {
                "shard_key": {"department": 1, "semester": 1, "_id": 1},
                "collections": ["courses", "enrollments"]
            },
            "submissions": {
                "shard_key": {"course_id": 1, "submission_date": 1},
                "collections": ["assignment_submissions", "quiz_submissions"]
            }
        }
        
        # Note: Actual sharding setup requires MongoDB cluster configuration
        # This is just the configuration that would be used
        return sharding_config
    
    @staticmethod
    def get_aggregation_pipeline(operation_type: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Get pre-built aggregation pipelines for common operations.
        """
        pipelines = {
            "student_course_stats": [
                {"$match": {"student_id": kwargs.get("student_id")}},
                {"$lookup": {
                    "from": "courses",
                    "localField": "course_id",
                    "foreignField": "_id",
                    "as": "course_info"
                }},
                {"$unwind": "$course_info"},
                {"$lookup": {
                    "from": "grades",
                    "let": {"student_id": "$student_id", "course_id": "$course_id"},
                    "pipeline": [
                        {"$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$student_id", "$$student_id"]},
                                    {"$eq": ["$course_id", "$$course_id"]}
                                ]
                            }
                        }}
                    ],
                    "as": "grades"
                }},
                {"$project": {
                    "course_code": "$course_info.course_code",
                    "course_name": "$course_info.course_name",
                    "credits": "$course_info.credits",
                    "enrollment_date": 1,
                    "status": 1,
                    "final_grade": {"$arrayElemAt": ["$grades.final_grade", 0]},
                    "final_percentage": {"$arrayElemAt": ["$grades.final_percentage", 0]}
                }}
            ],
            
            "teacher_course_summary": [
                {"$match": {"teacher_id": kwargs.get("teacher_id")}},
                {"$lookup": {
                    "from": "enrollments",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "enrollments"
                }},
                {"$lookup": {
                    "from": "assignments",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "assignments"
                }},
                {"$lookup": {
                    "from": "quizzes",
                    "localField": "_id",
                    "foreignField": "course_id",
                    "as": "quizzes"
                }},
                {"$project": {
                    "course_code": 1,
                    "course_name": 1,
                    "semester": 1,
                    "year": 1,
                    "enrolled_count": {"$size": "$enrollments"},
                    "assignments_count": {"$size": "$assignments"},
                    "quizzes_count": {"$size": "$quizzes"},
                    "max_capacity": 1,
                    "current_enrollment": 1
                }}
            ],
            
            "course_performance_analytics": [
                {"$match": {"course_id": kwargs.get("course_id")}},
                {"$lookup": {
                    "from": "assignment_submissions",
                    "let": {"course_id": "$course_id"},
                    "pipeline": [
                        {"$lookup": {
                            "from": "assignments",
                            "localField": "assignment_id",
                            "foreignField": "_id",
                            "as": "assignment"
                        }},
                        {"$unwind": "$assignment"},
                        {"$match": {"$expr": {"$eq": ["$assignment.course_id", "$$course_id"]}}}
                    ],
                    "as": "submissions"
                }},
                {"$group": {
                    "_id": "$student_id",
                    "total_submissions": {"$sum": {"$size": "$submissions"}},
                    "avg_score": {"$avg": "$submissions.score"},
                    "course_info": {"$first": "$$ROOT"}
                }}
            ]
        }
        
        return pipelines.get(operation_type, [])
    
    @staticmethod
    def execute_transaction(operations: List[Callable], session=None) -> Dict[str, Any]:
        """
        Execute multiple operations in a transaction.
        """
        if session is None:
            with mongo.cx.start_session() as session:
                return DatabaseUtils._execute_with_session(operations, session)
        else:
            return DatabaseUtils._execute_with_session(operations, session)
    
    @staticmethod
    def _execute_with_session(operations: List[Callable], session) -> Dict[str, Any]:
        """Helper method to execute operations within a session."""
        try:
            with session.start_transaction():
                results = []
                for operation in operations:
                    result = operation(session)
                    results.append(result)
                
                # If we get here, all operations succeeded
                return {"success": True, "results": results}
                
        except Exception as e:
            # Transaction will be automatically aborted
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_collection_stats() -> Dict[str, Any]:
        """Get statistics about all collections."""
        collections = [
            "users", "courses", "enrollments", "assignments", "quizzes",
            "assignment_submissions", "quiz_submissions", "attendance",
            "grades", "calendar_events", "notifications"
        ]
        
        stats = {}
        for collection_name in collections:
            try:
                collection = getattr(mongo.db, collection_name)
                stats[collection_name] = {
                    "count": collection.count_documents({}),
                    "size": mongo.db.command("collStats", collection_name).get("size", 0),
                    "indexes": len(collection.list_indexes())
                }
            except Exception as e:
                stats[collection_name] = {"error": str(e)}
        
        return stats
    
    @staticmethod
    def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Convert ObjectId fields to strings for JSON serialization.
        Handles single documents.
        """
        if not doc:
            return doc
            
        serialized = doc.copy()
        
        # Convert _id to string
        if '_id' in serialized and isinstance(serialized['_id'], ObjectId):
            serialized['_id'] = str(serialized['_id'])
            
        # Convert other common ObjectId fields
        objectid_fields = [
            'teacher_id', 'student_id', 'course_id', 'assignment_id', 'quiz_id',
            'created_by', 'graded_by', 'recipient_id', 'related_course_id',
            'related_assignment_id'
        ]
        
        for field in objectid_fields:
            if field in serialized and isinstance(serialized[field], ObjectId):
                serialized[field] = str(serialized[field])
                
        # Handle array fields that might contain ObjectIds
        array_fields = ['enrolled_courses', 'courses_teaching', 'assignments', 'quizzes', 'attendees']
        for field in array_fields:
            if field in serialized and isinstance(serialized[field], list):
                serialized[field] = [str(item) if isinstance(item, ObjectId) else item for item in serialized[field]]
                
        # Handle nested feedback array in courses
        if 'feedback' in serialized and isinstance(serialized['feedback'], list):
            for feedback_item in serialized['feedback']:
                if isinstance(feedback_item, dict) and 'student_id' in feedback_item:
                    if isinstance(feedback_item['student_id'], ObjectId):
                        feedback_item['student_id'] = str(feedback_item['student_id'])
                        
        return serialized
    
    @staticmethod
    def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert ObjectId fields to strings for JSON serialization.
        Handles lists of documents.
        """
        return [DatabaseUtils.serialize_doc(doc) for doc in docs]
    
    @staticmethod
    def deserialize_objectids(data: Dict[str, Any], objectid_fields: List[str]) -> Dict[str, Any]:
        """
        Convert string IDs back to ObjectIds for database operations.
        """
        deserialized = data.copy()
        
        for field in objectid_fields:
            if field in deserialized and deserialized[field]:
                if isinstance(deserialized[field], str):
                    try:
                        deserialized[field] = ObjectId(deserialized[field])
                    except Exception:
                        # Invalid ObjectId string, leave as is
                        pass
                elif isinstance(deserialized[field], list):
                    # Handle arrays of ObjectIds
                    converted_list = []
                    for item in deserialized[field]:
                        if isinstance(item, str):
                            try:
                                converted_list.append(ObjectId(item))
                            except Exception:
                                converted_list.append(item)
                        else:
                            converted_list.append(item)
                    deserialized[field] = converted_list
                    
        return deserialized 