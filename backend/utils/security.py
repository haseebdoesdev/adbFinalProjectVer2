from extensions import bcrypt
from passlib.hash import pbkdf2_sha256
from bson import ObjectId
from typing import Any, Dict, List, Union
import re
import html
import secrets
import string

# For password hashing and verification
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.generate_password_hash(password).decode('utf-8')

def check_password(hashed_password: str, password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.check_password_hash(hashed_password, password)

def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# Enhanced NoSQL injection prevention
def sanitize_input(data: Any) -> Any:
    """
    Comprehensive sanitization to prevent NoSQL injection attacks.
    This function recursively sanitizes data structures.
    """
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            # Sanitize keys - prevent operator injection
            clean_key = sanitize_key(key)
            sanitized[clean_key] = sanitize_input(value)
        return sanitized
    
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    
    elif isinstance(data, str):
        return sanitize_string(data)
    
    elif isinstance(data, (int, float, bool)) or data is None:
        return data
    
    else:
        # For other types, convert to string and sanitize
        return sanitize_string(str(data))

def sanitize_key(key: str) -> str:
    """
    Sanitize dictionary keys to prevent operator injection.
    Remove MongoDB operators and other potentially dangerous characters.
    """
    if not isinstance(key, str):
        key = str(key)
    
    # Remove MongoDB operators
    dangerous_patterns = [
        r'^\$', r'\.', r'javascript:', r'eval\(', r'function\(', 
        r'<script', r'</script', r'<iframe', r'</iframe'
    ]
    
    for pattern in dangerous_patterns:
        key = re.sub(pattern, '', key, flags=re.IGNORECASE)
    
    return key.strip()

def sanitize_string(value: str) -> str:
    """
    Sanitize string values to prevent various injection attacks.
    """
    if not isinstance(value, str):
        return value
    
    # HTML escape
    value = html.escape(value)
    
    # Remove potentially dangerous JavaScript
    js_patterns = [
        r'javascript:', r'eval\(', r'function\(', r'setTimeout\(', 
        r'setInterval\(', r'document\.', r'window\.', r'alert\('
    ]
    
    for pattern in js_patterns:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)
    
    return value.strip()

def validate_object_id(obj_id: Union[str, ObjectId]) -> bool:
    """
    Validate if a string is a valid MongoDB ObjectId.
    """
    if isinstance(obj_id, ObjectId):
        return True
    
    if isinstance(obj_id, str):
        return ObjectId.is_valid(obj_id)
    
    return False

def sanitize_object_id(obj_id: Union[str, ObjectId]) -> Union[ObjectId, None]:
    """
    Safely convert string to ObjectId, return None if invalid.
    """
    if isinstance(obj_id, ObjectId):
        return obj_id
    
    if isinstance(obj_id, str) and validate_object_id(obj_id):
        try:
            return ObjectId(obj_id)
        except:
            return None
    
    return None

def validate_email(email: str) -> bool:
    """
    Validate email format using regex.
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username: str) -> bool:
    """
    Validate username format - alphanumeric with underscores, 3-50 chars.
    """
    if not isinstance(username, str) or len(username) < 3 or len(username) > 50:
        return False
    
    pattern = r'^[a-zA-Z0-9_]+$'
    return re.match(pattern, username) is not None

def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Check password strength and return validation results.
    """
    result = {
        "is_valid": True,
        "errors": [],
        "score": 0
    }
    
    if len(password) < 8:
        result["errors"].append("Password must be at least 8 characters long")
        result["is_valid"] = False
    else:
        result["score"] += 1
    
    if not re.search(r'[a-z]', password):
        result["errors"].append("Password must contain at least one lowercase letter")
        result["is_valid"] = False
    else:
        result["score"] += 1
    
    if not re.search(r'[A-Z]', password):
        result["errors"].append("Password must contain at least one uppercase letter")
        result["is_valid"] = False
    else:
        result["score"] += 1
    
    if not re.search(r'\d', password):
        result["errors"].append("Password must contain at least one number")
        result["is_valid"] = False
    else:
        result["score"] += 1
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        result["errors"].append("Password must contain at least one special character")
        result["is_valid"] = False
    else:
        result["score"] += 1
    
    return result

def build_safe_query(query_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a safe MongoDB query by sanitizing inputs and validating operators.
    """
    safe_query = {}
    allowed_operators = {
        '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', 
        '$exists', '$regex', '$and', '$or', '$not', '$nor'
    }
    
    for key, value in query_dict.items():
        clean_key = sanitize_key(key)
        
        # Handle operators
        if clean_key.startswith('$'):
            if clean_key in allowed_operators:
                safe_query[clean_key] = sanitize_input(value)
        else:
            safe_query[clean_key] = sanitize_input(value)
    
    return safe_query

def validate_file_upload(filename: str, allowed_extensions: set = None) -> Dict[str, Any]:
    """
    Validate uploaded file for security.
    """
    result = {
        "is_valid": True,
        "errors": [],
        "cleaned_filename": None
    }
    
    if not filename:
        result["errors"].append("Filename is required")
        result["is_valid"] = False
        return result
    
    # Remove path traversal attempts
    clean_filename = filename.replace('..', '').replace('/', '').replace('\\', '')
    
    # Remove potentially dangerous characters
    clean_filename = re.sub(r'[<>:"|?*]', '', clean_filename)
    
    if not clean_filename:
        result["errors"].append("Invalid filename")
        result["is_valid"] = False
        return result
    
    # Check file extension
    if allowed_extensions:
        file_ext = clean_filename.rsplit('.', 1)[-1].lower() if '.' in clean_filename else ''
        if file_ext not in allowed_extensions:
            result["errors"].append(f"File extension '{file_ext}' not allowed")
            result["is_valid"] = False
    
    result["cleaned_filename"] = clean_filename
    return result

# Rate limiting helpers
class RateLimiter:
    """Simple in-memory rate limiter for basic protection."""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, identifier: str, max_requests: int = 100, window_seconds: int = 3600) -> bool:
        """
        Check if request is allowed based on rate limiting.
        identifier: unique identifier (e.g., IP address, user ID)
        max_requests: maximum requests allowed in the time window
        window_seconds: time window in seconds
        """
        import time
        current_time = time.time()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier] 
            if current_time - req_time < window_seconds
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) < max_requests:
            self.requests[identifier].append(current_time)
            return True
        
        return False

# Global rate limiter instance
rate_limiter = RateLimiter() 