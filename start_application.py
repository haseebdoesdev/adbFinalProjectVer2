#!/usr/bin/env python3
"""
Application Startup Script
This script checks prerequisites and starts the application properly.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {major}.{minor}")
        return False
    print(f"✅ Python version: {major}.{minor}")
    return True

def check_mongodb():
    """Check if MongoDB is running."""
    try:
        import pymongo
        client = pymongo.MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
        client.server_info()
        client.close()
        print("✅ MongoDB is running")
        return True
    except Exception as e:
        print("❌ MongoDB is not running or not accessible")
        print(f"Error: {e}")
        print("Please start MongoDB before running the application")
        return False

def check_dependencies():
    """Check if all dependencies are installed."""
    requirements_file = Path(__file__).parent / 'backend' / 'requirements.txt'
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    try:
        # Try importing key packages
        import flask
        import pymongo
        import flask_jwt_extended
        import flask_cors
        print("✅ Core dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r backend/requirements.txt")
        return False

def setup_environment():
    """Set up environment variables."""
    backend_dir = Path(__file__).parent / 'backend'
    env_file = backend_dir / '.env'
    env_example = backend_dir / '.env.example'
    
    if not env_file.exists():
        if env_example.exists():
            print("⚠️  .env file not found. Creating from .env.example...")
            env_file.write_text(env_example.read_text())
            print("✅ .env file created")
            print("⚠️  Please review and update the .env file with your settings")
        else:
            print("⚠️  No .env file found. Using default settings.")
            print("Consider creating a .env file for custom configuration.")
    else:
        print("✅ .env file found")
    
    # Set default environment variables
    os.environ.setdefault('FLASK_CONFIG', 'development')
    os.environ.setdefault('FLASK_ENV', 'development')
    
    return True

def initialize_database():
    """Initialize database with indexes and sample data."""
    backend_dir = Path(__file__).parent / 'backend'
    init_script = backend_dir / 'init_database.py'
    
    if not init_script.exists():
        print("⚠️  Database initialization script not found")
        return True
    
    print("🔄 Initializing database...")
    try:
        # Change to backend directory
        original_cwd = os.getcwd()
        os.chdir(backend_dir)
        
        # Run initialization script
        result = subprocess.run([sys.executable, 'init_database.py'], 
                              capture_output=True, text=True)
        
        os.chdir(original_cwd)
        
        if result.returncode == 0:
            print("✅ Database initialized successfully")
            return True
        else:
            print("❌ Database initialization failed")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

def start_backend():
    """Start the Flask backend server."""
    backend_dir = Path(__file__).parent / 'backend'
    app_file = backend_dir / 'app.py'
    
    if not app_file.exists():
        print("❌ app.py not found in backend directory")
        return False
    
    print("🚀 Starting Flask backend server...")
    
    try:
        # Change to backend directory
        os.chdir(backend_dir)
        
        # Start Flask app
        env = os.environ.copy()
        env['PYTHONPATH'] = str(backend_dir)
        
        process = subprocess.Popen([sys.executable, 'app.py'], env=env)
        
        # Wait a moment to see if it starts successfully
        time.sleep(2)
        
        if process.poll() is None:
            print("✅ Backend server started successfully")
            print("🌐 Backend running at: http://localhost:5000")
            print("📊 Health check: http://localhost:5000/api/health")
            return process
        else:
            print("❌ Backend server failed to start")
            return None
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return None

def start_frontend():
    """Start the React frontend server."""
    frontend_dir = Path(__file__).parent / 'frontend'
    package_json = frontend_dir / 'package.json'
    
    if not package_json.exists():
        print("❌ package.json not found in frontend directory")
        return False
    
    print("🚀 Starting React frontend server...")
    
    try:
        # Change to frontend directory
        os.chdir(frontend_dir)
        
        # Check if node_modules exists
        if not (frontend_dir / 'node_modules').exists():
            print("📦 Installing frontend dependencies...")
            result = subprocess.run(['npm', 'install'], capture_output=True, text=True)
            if result.returncode != 0:
                print("❌ Failed to install frontend dependencies")
                print(result.stderr)
                return None
        
        # Start React app
        process = subprocess.Popen(['npm', 'start'])
        
        # Wait a moment to see if it starts successfully
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ Frontend server started successfully")
            print("🌐 Frontend running at: http://localhost:3000")
            return process
        else:
            print("❌ Frontend server failed to start")
            return None
            
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js and npm")
        return None
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return None

def main():
    """Main startup routine."""
    print("🎓 University Management System - Startup")
    print("=" * 50)
    
    # Pre-flight checks
    checks = [
        ("Python Version", check_python_version),
        ("MongoDB Connection", check_mongodb),
        ("Dependencies", check_dependencies),
        ("Environment Setup", setup_environment),
    ]
    
    print("\n🔍 Pre-flight checks:")
    for name, check_func in checks:
        print(f"\n{name}:")
        if not check_func():
            print("\n❌ Pre-flight checks failed. Please fix the issues above.")
            return False
    
    print("\n✅ All pre-flight checks passed!")
    
    # Initialize database
    print("\n🗄️  Database initialization:")
    if not initialize_database():
        print("\n⚠️  Database initialization failed, but continuing...")
    
    # Start services
    print("\n🚀 Starting services...")
    
    backend_process = start_backend()
    if not backend_process:
        print("\n❌ Failed to start backend. Exiting.")
        return False
    
    frontend_process = start_frontend()
    if not frontend_process:
        print("\n⚠️  Frontend failed to start, but backend is running.")
        print("You can still access the API at http://localhost:5000")
    
    print("\n" + "=" * 50)
    print("🎉 Application started successfully!")
    print("\n📋 Service URLs:")
    print("   Backend API: http://localhost:5000")
    print("   Frontend UI: http://localhost:3000")
    print("   Health Check: http://localhost:5000/api/health")
    
    print("\n👥 Default Login Credentials:")
    print("   Admin - Email: admin@university.edu, Password: admin123")
    print("   Teacher - Email: smith@university.edu, Password: teacher123")
    print("   Student - Email: student1@university.edu, Password: student123")
    
    print("\n⚠️  Important Notes:")
    print("   - Change default passwords after first login")
    print("   - Review .env files for production deployment")
    print("   - Press Ctrl+C to stop all services")
    
    try:
        # Keep the script running and monitor processes
        while True:
            time.sleep(5)
            
            # Check if backend is still running
            if backend_process.poll() is not None:
                print("\n❌ Backend process stopped unexpectedly")
                break
            
            # Check if frontend is still running (if it was started)
            if frontend_process and frontend_process.poll() is not None:
                print("\n⚠️  Frontend process stopped unexpectedly")
                frontend_process = None
                
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down services...")
        
        if backend_process:
            backend_process.terminate()
            backend_process.wait()
            print("✅ Backend stopped")
        
        if frontend_process:
            frontend_process.terminate()
            frontend_process.wait()
            print("✅ Frontend stopped")
        
        print("👋 Goodbye!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)