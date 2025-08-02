from typing import Dict, Any, List, Optional, Callable, Union
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.errors import DuplicateKeyError, OperationFailure, ConnectionFailure, ServerSelectionTimeoutError
from extensions import mongo
from datetime import datetime, timedelta
import time
import threading
import functools
import logging
from collections import defaultdict
from contextlib import contextmanager

class OptimisticLockException(Exception):
    """Exception raised when optimistic locking fails."""
    pass

class TransactionException(Exception):
    """Exception raised when transaction operations fail."""
    pass

class CascadeDeleteException(Exception):
    """Exception raised when cascade delete operations fail."""
    pass

# Performance monitoring
class QueryPerformanceMonitor:
    def __init__(self):
        self.query_stats = defaultdict(list)
        self.slow_query_threshold = 1.0  # seconds
    
    def record_query(self, operation: str, collection: str, duration: float, query: Dict = None):
        self.query_stats[f"{collection}.{operation}"].append({
            'duration': duration,
            'timestamp': datetime.utcnow(),
            'query': str(query) if query else None
        })
        
        if duration > self.slow_query_threshold:
            logging.warning(f"Slow query detected: {collection}.{operation} took {duration:.2f}s")
    
    def get_performance_report(self) -> Dict[str, Any]:
        report = {}
        for operation, stats in self.query_stats.items():
            if stats:
                durations = [s['duration'] for s in stats]
                report[operation] = {
                    'count': len(stats),
                    'avg_duration': sum(durations) / len(durations),
                    'max_duration': max(durations),
                    'min_duration': min(durations),
                    'slow_queries': len([d for d in durations if d > self.slow_query_threshold])
                }
        return report

# Global performance monitor
performance_monitor = QueryPerformanceMonitor()

# Query result cache
class QueryCache:
    def __init__(self, ttl_seconds: int = 300):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Any:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.ttl):
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, datetime.utcnow())
    
    def clear(self):
        self.cache.clear()
    
    def invalidate_pattern(self, pattern: str):
        keys_to_remove = [k for k in self.cache.keys() if pattern in k]
        for key in keys_to_remove:
            del self.cache[key]

# Global cache instance
query_cache = QueryCache()

class DatabaseUtils:
    """Utility class for advanced database operations."""
    
    # Connection pool settings
    _connection_pool_size = 50
    _max_idle_time = 30000  # 30 seconds
    _server_selection_timeout = 3000  # 3 seconds
    
    @staticmethod
    def configure_connection_pool(pool_size: int = 50, max_idle_time: int = 30000, 
                                server_selection_timeout: int = 3000):
        """Configure MongoDB connection pool settings."""
        DatabaseUtils._connection_pool_size = pool_size
        DatabaseUtils._max_idle_time = max_idle_time
        DatabaseUtils._server_selection_timeout = server_selection_timeout
    
    @staticmethod
    def get_optimized_client(uri: str) -> MongoClient:
        """Get a MongoDB client with optimized connection settings."""
        return MongoClient(
            uri,
            maxPoolSize=DatabaseUtils._connection_pool_size,
            minPoolSize=5,
            maxIdleTimeMS=DatabaseUtils._max_idle_time,
            serverSelectionTimeoutMS=DatabaseUtils._server_selection_timeout,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            retryWrites=True,
            retryReads=True,
            readPreference='secondaryPreferred'  # Use secondary for reads when possible
        )
    
    @staticmethod
    def monitor_query_performance(collection_name: str, operation: str):
        """Decorator to monitor query performance."""
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = time.time() - start_time
                    performance_monitor.record_query(operation, collection_name, duration)
                    return result
                except Exception as e:
                    duration = time.time() - start_time
                    performance_monitor.record_query(f"{operation}_error", collection_name, duration)
                    raise e
            return wrapper
        return decorator
    
    @staticmethod
    def cached_query(cache_key: str, ttl: int = 300):
        """Decorator to cache query results."""
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Check cache first
                cached_result = query_cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute query and cache result
                result = func(*args, **kwargs)
                query_cache.set(cache_key, result)
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def create_indexes():
        """Create all necessary indexes for the collections with optimizations."""
        try:
            # Create indexes in background to avoid blocking
            index_options = {'background': True, 'sparse': False}
            text_index_options = {'background': True, 'default_language': 'english'}
            # Users collection indexes
            mongo.db.users.create_index("username", unique=True, **index_options)
            mongo.db.users.create_index("email", unique=True, **index_options)
            mongo.db.users.create_index("role", **index_options)
            mongo.db.users.create_index("is_active", **index_options)
            mongo.db.users.create_index("date_joined", **index_options)
            mongo.db.users.create_index("last_login", **index_options)
            mongo.db.users.create_index([("first_name", TEXT), ("last_name", TEXT)], **text_index_options)
            # Compound index for common queries
            mongo.db.users.create_index([("role", 1), ("is_active", 1)], **index_options)
            
            # Courses collection indexes
            mongo.db.courses.create_index("course_code", unique=True, **index_options)
            mongo.db.courses.create_index("teacher_id", **index_options)
            mongo.db.courses.create_index("department", **index_options)
            mongo.db.courses.create_index([("semester", 1), ("year", 1)], **index_options)
            mongo.db.courses.create_index("created_at", **index_options)
            mongo.db.courses.create_index("updated_at", **index_options)
            mongo.db.courses.create_index([("course_name", TEXT), ("description", TEXT)], **text_index_options)
            # Compound indexes for performance
            mongo.db.courses.create_index([("department", 1), ("semester", 1), ("year", 1)], **index_options)
            mongo.db.courses.create_index([("teacher_id", 1), ("semester", 1), ("year", 1)], **index_options)
            
            # Enrollments collection indexes
            mongo.db.enrollments.create_index([("student_id", 1), ("course_id", 1)], unique=True, **index_options)
            mongo.db.enrollments.create_index("student_id", **index_options)
            mongo.db.enrollments.create_index("course_id", **index_options)
            mongo.db.enrollments.create_index("status", **index_options)
            mongo.db.enrollments.create_index("enrollment_date", **index_options)
            mongo.db.enrollments.create_index("drop_date", sparse=True, **index_options)
            # Compound indexes for common queries
            mongo.db.enrollments.create_index([("student_id", 1), ("status", 1)], **index_options)
            mongo.db.enrollments.create_index([("course_id", 1), ("status", 1)], **index_options)
            
            # Assignments collection indexes
            mongo.db.assignments.create_index("course_id", **index_options)
            mongo.db.assignments.create_index("teacher_id", **index_options)
            mongo.db.assignments.create_index("due_date", **index_options)
            mongo.db.assignments.create_index("created_date", **index_options)
            mongo.db.assignments.create_index("is_published", **index_options)
            mongo.db.assignments.create_index([("title", TEXT), ("description", TEXT)], **text_index_options)
            # Compound indexes for performance
            mongo.db.assignments.create_index([("course_id", 1), ("due_date", 1)], **index_options)
            mongo.db.assignments.create_index([("course_id", 1), ("is_published", 1)], **index_options)
            
            # Quizzes collection indexes
            mongo.db.quizzes.create_index("course_id", **index_options)
            mongo.db.quizzes.create_index("teacher_id", **index_options)
            mongo.db.quizzes.create_index("due_date", **index_options)
            mongo.db.quizzes.create_index("start_date", **index_options)
            mongo.db.quizzes.create_index("created_date", **index_options)
            mongo.db.quizzes.create_index("is_published", **index_options)
            mongo.db.quizzes.create_index([("title", TEXT), ("description", TEXT)], **text_index_options)
            # Compound indexes
            mongo.db.quizzes.create_index([("course_id", 1), ("due_date", 1)], **index_options)
            mongo.db.quizzes.create_index([("course_id", 1), ("is_published", 1)], **index_options)
            
            # Assignment submissions indexes
            mongo.db.assignment_submissions.create_index([("student_id", 1), ("assignment_id", 1)], unique=True, **index_options)
            mongo.db.assignment_submissions.create_index("assignment_id", **index_options)
            mongo.db.assignment_submissions.create_index("student_id", **index_options)
            mongo.db.assignment_submissions.create_index("submission_date", **index_options)
            mongo.db.assignment_submissions.create_index("status", **index_options)
            mongo.db.assignment_submissions.create_index("graded_date", sparse=True, **index_options)
            # Compound indexes
            mongo.db.assignment_submissions.create_index([("assignment_id", 1), ("status", 1)], **index_options)
            
            # Quiz submissions indexes
            mongo.db.quiz_submissions.create_index([("student_id", 1), ("quiz_id", 1)], unique=True, **index_options)
            mongo.db.quiz_submissions.create_index("quiz_id", **index_options)
            mongo.db.quiz_submissions.create_index("student_id", **index_options)
            mongo.db.quiz_submissions.create_index("submission_date", **index_options)
            mongo.db.quiz_submissions.create_index("graded_date", sparse=True, **index_options)
            # Compound indexes
            mongo.db.quiz_submissions.create_index([("quiz_id", 1), ("submission_date", 1)], **index_options)
            
            # Attendance collection indexes
            mongo.db.attendance.create_index([("course_id", 1), ("date", 1)], unique=True, **index_options)
            mongo.db.attendance.create_index("course_id", **index_options)
            mongo.db.attendance.create_index("date", **index_options)
            mongo.db.attendance.create_index("recorded_by", **index_options)
            mongo.db.attendance.create_index("recorded_at", **index_options)
            
            # Grades collection indexes
            mongo.db.grades.create_index([("student_id", 1), ("course_id", 1)], unique=True, **index_options)
            mongo.db.grades.create_index("student_id", **index_options)
            mongo.db.grades.create_index("course_id", **index_options)
            mongo.db.grades.create_index("final_percentage", sparse=True, **index_options)
            mongo.db.grades.create_index("calculated_at", sparse=True, **index_options)
            
            # Calendar events collection indexes
            mongo.db.calendar_events.create_index("course_id", **index_options)
            mongo.db.calendar_events.create_index("created_by", **index_options)
            mongo.db.calendar_events.create_index("start_datetime", **index_options)
            mongo.db.calendar_events.create_index("end_datetime", sparse=True, **index_options)
            mongo.db.calendar_events.create_index("event_type", **index_options)
            mongo.db.calendar_events.create_index("created_at", **index_options)
            # Compound indexes for calendar queries
            mongo.db.calendar_events.create_index([("course_id", 1), ("start_datetime", 1)], **index_options)
            mongo.db.calendar_events.create_index([("created_by", 1), ("start_datetime", 1)], **index_options)
            
            # Notifications collection indexes
            mongo.db.notifications.create_index("recipient_id", **index_options)
            mongo.db.notifications.create_index("is_read", **index_options)
            mongo.db.notifications.create_index("created_at", **index_options)
            mongo.db.notifications.create_index("notification_type", **index_options)
            mongo.db.notifications.create_index("related_course_id", sparse=True, **index_options)
            # Compound indexes for notification queries
            mongo.db.notifications.create_index([("recipient_id", 1), ("is_read", 1)], **index_options)
            mongo.db.notifications.create_index([("recipient_id", 1), ("created_at", -1)], **index_options)
            
            # Performance monitoring collection
            mongo.db.query_performance.create_index("operation", **index_options)
            mongo.db.query_performance.create_index("timestamp", **index_options)
            mongo.db.query_performance.create_index("duration", **index_options)
            mongo.db.query_performance.create_index([("operation", 1), ("timestamp", -1)], **index_options)
            
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
    
    # === ENHANCED TRANSACTION OPERATIONS ===
    
    @staticmethod
    @contextmanager
    def transaction_session():
        """Context manager for database transactions."""
        with mongo.cx.start_session() as session:
            try:
                with session.start_transaction():
                    yield session
            except Exception as e:
                # Transaction will auto-abort on exception
                raise TransactionException(f"Transaction failed: {str(e)}")
    
    @staticmethod
    def safe_execute_transaction(operations: List[Callable], max_retries: int = 3) -> Dict[str, Any]:
        """
        Execute operations in a transaction with retry logic.
        """
        for attempt in range(max_retries):
            try:
                with DatabaseUtils.transaction_session() as session:
                    results = []
                    for operation in operations:
                        result = operation(session)
                        results.append(result)
                    return {"success": True, "results": results, "attempt": attempt + 1}
            except Exception as e:
                if attempt == max_retries - 1:
                    return {"success": False, "error": str(e), "attempts": max_retries}
                time.sleep(0.1 * (attempt + 1))  # Exponential backoff
        
        return {"success": False, "error": "Max retries exceeded"}
    
    # === CASCADE DELETE OPERATIONS ===
    
    @staticmethod
    def cascade_delete_user(user_id: ObjectId, session=None) -> Dict[str, Any]:
        """
        Safely delete a user and all related data.
        """
        def _delete_user_data(session):
            results = {}
            
            # Get user details first
            user = mongo.db.users.find_one({"_id": user_id}, session=session)
            if not user:
                raise CascadeDeleteException("User not found")
            
            results['user'] = user
            
            if user['role'] == 'student':
                # Delete student-related data
                results['enrollments'] = mongo.db.enrollments.delete_many(
                    {"student_id": user_id}, session=session
                ).deleted_count
                
                results['assignment_submissions'] = mongo.db.assignment_submissions.delete_many(
                    {"student_id": user_id}, session=session
                ).deleted_count
                
                results['quiz_submissions'] = mongo.db.quiz_submissions.delete_many(
                    {"student_id": user_id}, session=session
                ).deleted_count
                
                results['grades'] = mongo.db.grades.delete_many(
                    {"student_id": user_id}, session=session
                ).deleted_count
                
                # Remove from course enrollments lists
                mongo.db.courses.update_many(
                    {"enrolled_students": user_id},
                    {"$pull": {"enrolled_students": user_id}},
                    session=session
                )
            
            elif user['role'] == 'teacher':
                # Handle teacher deletion more carefully
                # First check if they have assigned courses
                assigned_courses = list(mongo.db.courses.find(
                    {"teacher_id": user_id}, {"_id": 1, "course_code": 1}, session=session
                ))
                
                if assigned_courses:
                    # Unassign teacher from courses instead of deleting
                    results['courses_unassigned'] = mongo.db.courses.update_many(
                        {"teacher_id": user_id},
                        {"$unset": {"teacher_id": ""}},
                        session=session
                    ).modified_count
                    
                    results['assigned_courses'] = [c['course_code'] for c in assigned_courses]
                else:
                    results['courses_unassigned'] = 0
                    results['assigned_courses'] = []
            
            # Delete notifications
            results['notifications'] = mongo.db.notifications.delete_many(
                {"$or": [
                    {"recipient_id": user_id},
                    {"created_by": user_id}
                ]}, session=session
            ).deleted_count
            
            # Delete calendar events
            results['calendar_events'] = mongo.db.calendar_events.delete_many(
                {"$or": [
                    {"created_by": user_id},
                    {"attendees": user_id}
                ]}, session=session
            ).deleted_count
            
            # Finally delete the user
            result = mongo.db.users.delete_one({"_id": user_id}, session=session)
            results['user_deleted'] = result.deleted_count > 0
            
            return results
        
        if session:
            return _delete_user_data(session)
        else:
            with DatabaseUtils.transaction_session() as session:
                return _delete_user_data(session)
    
    @staticmethod
    def cascade_delete_course(course_id: ObjectId, session=None) -> Dict[str, Any]:
        """
        Safely delete a course and all related data.
        """
        def _delete_course_data(session):
            results = {}
            
            # Get course details first
            course = mongo.db.courses.find_one({"_id": course_id}, session=session)
            if not course:
                raise CascadeDeleteException("Course not found")
            
            results['course'] = course
            
            # Delete enrollments
            results['enrollments'] = mongo.db.enrollments.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete assignments and their submissions
            assignment_ids = [doc['_id'] for doc in mongo.db.assignments.find(
                {"course_id": course_id}, {"_id": 1}, session=session
            )]
            
            if assignment_ids:
                results['assignment_submissions'] = mongo.db.assignment_submissions.delete_many(
                    {"assignment_id": {"$in": assignment_ids}}, session=session
                ).deleted_count
            else:
                results['assignment_submissions'] = 0
            
            results['assignments'] = mongo.db.assignments.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete quizzes and their submissions
            quiz_ids = [doc['_id'] for doc in mongo.db.quizzes.find(
                {"course_id": course_id}, {"_id": 1}, session=session
            )]
            
            if quiz_ids:
                results['quiz_submissions'] = mongo.db.quiz_submissions.delete_many(
                    {"quiz_id": {"$in": quiz_ids}}, session=session
                ).deleted_count
            else:
                results['quiz_submissions'] = 0
            
            results['quizzes'] = mongo.db.quizzes.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete grades
            results['grades'] = mongo.db.grades.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete attendance records
            results['attendance'] = mongo.db.attendance.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete calendar events
            results['calendar_events'] = mongo.db.calendar_events.delete_many(
                {"course_id": course_id}, session=session
            ).deleted_count
            
            # Delete notifications
            results['notifications'] = mongo.db.notifications.delete_many(
                {"related_course_id": course_id}, session=session
            ).deleted_count
            
            # Remove from teacher's courses_teaching list
            if course.get('teacher_id'):
                mongo.db.users.update_one(
                    {"_id": course['teacher_id']},
                    {"$pull": {"courses_teaching": course_id}},
                    session=session
                )
            
            # Remove from students' enrolled_courses lists
            mongo.db.users.update_many(
                {"enrolled_courses": course_id},
                {"$pull": {"enrolled_courses": course_id}},
                session=session
            )
            
            # Finally delete the course
            result = mongo.db.courses.delete_one({"_id": course_id}, session=session)
            results['course_deleted'] = result.deleted_count > 0
            
            return results
        
        if session:
            return _delete_course_data(session)
        else:
            with DatabaseUtils.transaction_session() as session:
                return _delete_course_data(session)
    
    @staticmethod
    def cascade_delete_assignment(assignment_id: ObjectId, session=None) -> Dict[str, Any]:
        """
        Safely delete an assignment and all related data.
        """
        def _delete_assignment_data(session):
            results = {}
            
            # Get assignment details first
            assignment = mongo.db.assignments.find_one({"_id": assignment_id}, session=session)
            if not assignment:
                raise CascadeDeleteException("Assignment not found")
            
            results['assignment'] = assignment
            
            # Delete submissions
            results['submissions'] = mongo.db.assignment_submissions.delete_many(
                {"assignment_id": assignment_id}, session=session
            ).deleted_count
            
            # Remove from course assignments list
            mongo.db.courses.update_one(
                {"_id": assignment['course_id']},
                {"$pull": {"assignments": assignment_id}},
                session=session
            )
            
            # Delete related calendar events
            results['calendar_events'] = mongo.db.calendar_events.delete_many(
                {"related_assignment_id": assignment_id}, session=session
            ).deleted_count
            
            # Delete related notifications
            results['notifications'] = mongo.db.notifications.delete_many(
                {"related_assignment_id": assignment_id}, session=session
            ).deleted_count
            
            # Finally delete the assignment
            result = mongo.db.assignments.delete_one({"_id": assignment_id}, session=session)
            results['assignment_deleted'] = result.deleted_count > 0
            
            return results
        
        if session:
            return _delete_assignment_data(session)
        else:
            with DatabaseUtils.transaction_session() as session:
                return _delete_assignment_data(session)
    
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
    
    # === PAGINATION UTILITIES ===
    
    @staticmethod
    def paginate_query(collection_name: str, query: Dict[str, Any] = None, 
                      page: int = 1, per_page: int = 20, sort_field: str = "_id", 
                      sort_direction: int = -1) -> Dict[str, Any]:
        """
        Paginate query results with metadata.
        """
        collection = getattr(mongo.db, collection_name)
        query = query or {}
        
        # Calculate skip
        skip = (page - 1) * per_page
        
        # Get total count
        total_count = collection.count_documents(query)
        
        # Calculate pagination metadata
        total_pages = (total_count + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1
        
        # Get paginated results
        cursor = collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(per_page)
        results = list(cursor)
        
        # Serialize results
        serialized_results = DatabaseUtils.serialize_docs(results)
        
        return {
            "data": serialized_results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev,
                "next_page": page + 1 if has_next else None,
                "prev_page": page - 1 if has_prev else None
            }
        }
    
    @staticmethod
    def paginate_aggregation(collection_name: str, pipeline: List[Dict[str, Any]], 
                           page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """
        Paginate aggregation pipeline results.
        """
        collection = getattr(mongo.db, collection_name)
        
        # Create count pipeline
        count_pipeline = pipeline + [{"$count": "total"}]
        count_result = list(collection.aggregate(count_pipeline))
        total_count = count_result[0]["total"] if count_result else 0
        
        # Add pagination to pipeline
        skip = (page - 1) * per_page
        paginated_pipeline = pipeline + [
            {"$skip": skip},
            {"$limit": per_page}
        ]
        
        # Execute paginated pipeline
        results = list(collection.aggregate(paginated_pipeline))
        
        # Calculate pagination metadata
        total_pages = (total_count + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "data": results,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev,
                "next_page": page + 1 if has_next else None,
                "prev_page": page - 1 if has_prev else None
            }
        }
    
    # === PERFORMANCE MONITORING ===
    
    @staticmethod
    def log_slow_query(collection: str, operation: str, duration: float, query: Dict = None):
        """Log slow queries for analysis."""
        if duration > 1.0:  # Log queries slower than 1 second
            slow_query_doc = {
                "collection": collection,
                "operation": operation,
                "duration": duration,
                "query": str(query) if query else None,
                "timestamp": datetime.utcnow(),
                "severity": "warning" if duration < 5.0 else "critical"
            }
            
            try:
                mongo.db.slow_queries.insert_one(slow_query_doc)
            except Exception as e:
                logging.error(f"Failed to log slow query: {e}")
    
    @staticmethod
    def get_performance_metrics(hours_back: int = 24) -> Dict[str, Any]:
        """Get database performance metrics."""
        try:
            since = datetime.utcnow() - timedelta(hours=hours_back)
            
            # Get slow query stats
            slow_queries = list(mongo.db.slow_queries.find({
                "timestamp": {"$gte": since}
            }))
            
            # Aggregate stats
            collection_stats = defaultdict(list)
            operation_stats = defaultdict(list)
            
            for query in slow_queries:
                collection_stats[query['collection']].append(query['duration'])
                operation_stats[query['operation']].append(query['duration'])
            
            # Calculate averages
            collection_avg = {
                coll: sum(durations) / len(durations) 
                for coll, durations in collection_stats.items()
            }
            
            operation_avg = {
                op: sum(durations) / len(durations) 
                for op, durations in operation_stats.items()
            }
            
            return {
                "period_hours": hours_back,
                "slow_query_count": len(slow_queries),
                "collections_affected": len(collection_stats),
                "slowest_collections": dict(sorted(collection_avg.items(), 
                                                 key=lambda x: x[1], reverse=True)[:5]),
                "slowest_operations": dict(sorted(operation_avg.items(), 
                                                key=lambda x: x[1], reverse=True)[:5]),
                "performance_monitor_stats": performance_monitor.get_performance_report()
            }
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def optimize_indexes():
        """Analyze and recommend index optimizations."""
        try:
            recommendations = []
            
            # Check for collections without proper indexes
            collections_to_check = ['users', 'courses', 'enrollments', 'assignments', 
                                  'quizzes', 'assignment_submissions', 'quiz_submissions']
            
            for collection_name in collections_to_check:
                collection = getattr(mongo.db, collection_name)
                
                # Get index usage stats
                try:
                    index_stats = collection.aggregate([{"$indexStats": {}}])
                    stats_list = list(index_stats)
                    
                    # Find unused indexes
                    for stat in stats_list:
                        if stat['accesses']['ops'] == 0 and stat['name'] != '_id_':
                            recommendations.append({
                                "type": "unused_index",
                                "collection": collection_name,
                                "index": stat['name'],
                                "recommendation": f"Consider dropping unused index '{stat['name']}' on {collection_name}"
                            })
                
                except Exception:
                    # Index stats may not be available in all MongoDB versions
                    pass
            
            return {"recommendations": recommendations}
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def cleanup_old_data(days_old: int = 30):
        """Clean up old temporary data."""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            cleanup_results = {}
            
            # Clean up old slow query logs
            result = mongo.db.slow_queries.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            cleanup_results['slow_queries_deleted'] = result.deleted_count
            
            # Clean up expired locks
            result = mongo.db.locks.delete_many({
                "expires_at": {"$lt": datetime.utcnow().timestamp()}
            })
            cleanup_results['expired_locks_deleted'] = result.deleted_count
            
            # Clean up old notifications (optional)
            old_notification_date = datetime.utcnow() - timedelta(days=90)
            result = mongo.db.notifications.delete_many({
                "created_at": {"$lt": old_notification_date},
                "is_read": True
            })
            cleanup_results['old_notifications_deleted'] = result.deleted_count
            
            return cleanup_results
        except Exception as e:
            return {"error": str(e)}
    
    # === BACKUP AND MAINTENANCE ===
    
    @staticmethod
    def create_backup_indexes():
        """Create backup of current index configuration."""
        try:
            backup_doc = {
                "created_at": datetime.utcnow(),
                "indexes": {}
            }
            
            collections = ['users', 'courses', 'enrollments', 'assignments', 'quizzes',
                          'assignment_submissions', 'quiz_submissions', 'attendance',
                          'grades', 'calendar_events', 'notifications']
            
            for collection_name in collections:
                collection = getattr(mongo.db, collection_name)
                indexes = list(collection.list_indexes())
                backup_doc["indexes"][collection_name] = indexes
            
            result = mongo.db.index_backups.insert_one(backup_doc)
            return {"backup_id": str(result.inserted_id), "collections": len(collections)}
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def health_check() -> Dict[str, Any]:
        """Comprehensive database health check."""
        try:
            health_status = {
                "timestamp": datetime.utcnow(),
                "overall_status": "healthy",
                "checks": {}
            }
            
            # Check connection
            try:
                mongo.db.command('ping')
                health_status["checks"]["connection"] = {"status": "ok", "message": "Database connection successful"}
            except Exception as e:
                health_status["checks"]["connection"] = {"status": "error", "message": str(e)}
                health_status["overall_status"] = "unhealthy"
            
            # Check collection counts
            collections_health = {}
            for collection_name in ['users', 'courses', 'enrollments']:
                try:
                    count = getattr(mongo.db, collection_name).count_documents({})
                    collections_health[collection_name] = {"count": count, "status": "ok"}
                except Exception as e:
                    collections_health[collection_name] = {"status": "error", "message": str(e)}
                    health_status["overall_status"] = "unhealthy"
            
            health_status["checks"]["collections"] = collections_health
            
            # Check recent activity
            try:
                recent_users = mongo.db.users.count_documents({
                    "date_joined": {"$gte": datetime.utcnow() - timedelta(days=7)}
                })
                health_status["checks"]["recent_activity"] = {
                    "status": "ok",
                    "new_users_last_7_days": recent_users
                }
            except Exception as e:
                health_status["checks"]["recent_activity"] = {"status": "error", "message": str(e)}
            
            return health_status
        except Exception as e:
            return {
                "timestamp": datetime.utcnow(),
                "overall_status": "unhealthy",
                "error": str(e)
            } 