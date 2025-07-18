import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your_default_secret_key') # Change in production!
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/university_ms')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your_default_jwt_secret_key') # Change in production!
    # Add other configurations as needed 