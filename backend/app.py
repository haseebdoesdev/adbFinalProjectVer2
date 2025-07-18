from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import mongo, bcrypt, jwt
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Enable CORS for cross-origin requests
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    # Import blueprints here to avoid circular imports
    from routes.auth_routes import auth_bp
    from routes.admin_routes import admin_bp
    from routes.student_routes import student_bp
    from routes.teacher_routes import teacher_bp

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(teacher_bp, url_prefix='/api/teacher')

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"message": "Internal server error"}), 500

    @app.errorhandler(400)
    def bad_request_error(error):
        return jsonify({"message": "Bad request"}), 400

    @app.errorhandler(401)
    def unauthorized_error(error):
        return jsonify({"message": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden_error(error):
        return jsonify({"message": "Forbidden"}), 403

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"message": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"message": "Authorization token is required"}), 401

    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        try:
            # Check database connection
            mongo.db.command('ping')
            return jsonify({
                "status": "healthy",
                "database": "connected",
                "version": "1.0.0"
            }), 200
        except Exception as e:
            return jsonify({
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }), 503

    @app.route('/api')
    def api_info():
        return jsonify({
            "message": "University Management System API",
            "version": "1.0.0",
            "endpoints": {
                "auth": "/api/auth",
                "admin": "/api/admin", 
                "student": "/api/student",
                "teacher": "/api/teacher"
            }
        })

    # Initialize database indexes when app is created
    with app.app_context():
        try:
            from utils.database import DatabaseUtils
            DatabaseUtils.create_indexes()
            print("Database indexes initialized successfully")
        except Exception as e:
            print(f"Error initializing database: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        debug=True, 
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000))
    ) 