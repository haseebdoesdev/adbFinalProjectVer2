import os
import secrets
from pathlib import Path

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Environment variables should be set manually.")

class Config:
    # Security keys with better defaults
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        SECRET_KEY = secrets.token_urlsafe(32)
        print("WARNING: Using generated SECRET_KEY. Set SECRET_KEY environment variable for production!")
    
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        JWT_SECRET_KEY = secrets.token_urlsafe(32)
        print("WARNING: Using generated JWT_SECRET_KEY. Set JWT_SECRET_KEY environment variable for production!")
    
    # Database configuration
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/university_ms')
    
    # Flask configuration
    DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'
    TESTING = os.environ.get('TESTING', 'false').lower() == 'true'
    
    # Upload configuration
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB default
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Ensure upload folder exists
    Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
    
    # CORS origins
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
    
    @staticmethod
    def init_app(app):
        """Initialize application with config."""
        # Ensure upload directories exist
        upload_dirs = ['assignments', 'profiles', 'temp']
        for subdir in upload_dirs:
            Path(app.config['UPLOAD_FOLDER']) / subdir
            (Path(app.config['UPLOAD_FOLDER']) / subdir).mkdir(parents=True, exist_ok=True)

class DevelopmentConfig(Config):
    DEBUG = True
    DEVELOPMENT = True

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Ensure all required environment variables are set in production
        required_vars = ['SECRET_KEY', 'JWT_SECRET_KEY', 'MONGO_URI']
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        
        if missing_vars:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    MONGO_URI = os.environ.get('TEST_MONGO_URI', 'mongodb://localhost:27017/university_ms_test')

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 