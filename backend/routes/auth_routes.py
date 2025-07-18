from flask import Blueprint, request, jsonify
from extensions import mongo, bcrypt # Import from extensions instead of app
from utils.security import hash_password, check_password, sanitize_input
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from utils.database import DatabaseUtils
from datetime import datetime

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = sanitize_input(data.get('username'))
    password = data.get('password')
    email = sanitize_input(data.get('email'))
    role = sanitize_input(data.get('role', 'student')) # Default role to student

    if not username or not password or not email:
        return jsonify({"message": "Missing username, password, or email"}), 400

    if role not in ['student', 'teacher', 'admin']:
        return jsonify({"message": "Invalid role specified"}), 400

    # Check if user already exists
    if mongo.db.users.find_one({"username": username}):
        return jsonify({"message": "Username already exists"}), 409
    if mongo.db.users.find_one({"email": email}):
        return jsonify({"message": "Email already registered"}), 409

    hashed_pw = hash_password(password)
    
    user_data = {
        "username": username,
        "password_hash": hashed_pw,
        "email": email,
        "role": role,
        "first_name": data.get('first_name'),
        "last_name": data.get('last_name'),
        "date_joined": datetime.utcnow(),
        "is_active": True,
        "enrolled_courses": [],
        "courses_teaching": [],
        # Add other fields like 'created_at', 'is_active' etc. as needed
    }
    
    try:
        result = mongo.db.users.insert_one(user_data)
        # Get the created user and serialize it (exclude password)
        created_user = mongo.db.users.find_one({"_id": result.inserted_id}, {'password_hash': 0})
        serialized_user = DatabaseUtils.serialize_doc(created_user)
        return jsonify({"message": "User registered successfully", "user": serialized_user}), 201
    except Exception as e:
        return jsonify({"message": "Could not register user", "error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = sanitize_input(data.get('username'))
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    user = mongo.db.users.find_one({"username": username})

    if user and check_password(user['password_hash'], password):
        access_token = create_access_token(identity={'username': username, 'role': user['role']})
        
        # Prepare user data (exclude password and serialize ObjectIds)
        user_data = {k: v for k, v in user.items() if k != 'password_hash'}
        serialized_user = DatabaseUtils.serialize_doc(user_data)
        
        return jsonify(
            access_token=access_token, 
            role=user['role'],
            user=serialized_user
        ), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user = get_jwt_identity()
    # Fetch more user details from DB if needed, excluding sensitive info like password
    user_details = mongo.db.users.find_one({"username": current_user['username']}, {'password_hash': 0})
    if not user_details:
         return jsonify({"message": "User not found"}), 404
    
    serialized_user = DatabaseUtils.serialize_doc(user_details)
    return jsonify(logged_in_as=current_user, user_details=serialized_user), 200

# We will add more routes here for other portals later. 