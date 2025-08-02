from flask import Flask, jsonify
from flask_cors import CORS
from config import config
from extensions import mongo, bcrypt, jwt
import os

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    
    config_class = config[config_name]
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Enable CORS for cross-origin requests
    CORS(app, origins=app.config.get('CORS_ORIGINS', ["http://localhost:3000", "http://127.0.0.1:3000"]))

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
            from utils.database import DatabaseUtils
            
            # Get comprehensive health check
            health_status = DatabaseUtils.health_check()
            
            if health_status.get('overall_status') == 'healthy':
                return jsonify({
                    "status": "healthy",
                    "database": "connected",
                    "version": "1.0.0",
                    "timestamp": health_status.get('timestamp'),
                    "details": health_status.get('checks', {})
                }), 200
            else:
                return jsonify({
                    "status": "unhealthy",
                    "database": "issues_detected",
                    "version": "1.0.0",
                    "timestamp": health_status.get('timestamp'),
                    "details": health_status.get('checks', {}),
                    "error": health_status.get('error')
                }), 503
        except Exception as e:
            return jsonify({
                "status": "unhealthy",
                "database": "disconnected",
                "version": "1.0.0",
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
            print("Initializing database indexes...")
            DatabaseUtils.create_indexes()
            print("Database indexes initialized successfully")
            
            # Perform health check
            health_status = DatabaseUtils.health_check()
            if health_status.get('overall_status') == 'healthy':
                print("Database health check: PASSED")
            else:
                print(f"Database health check: FAILED - {health_status}")
                
        except Exception as e:
            print(f"Error initializing database: {e}")
            print("Application will continue but some features may not work properly")
    
    # Initialize configuration
    config_class.init_app(app)

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', False)
    
    print(f"Starting Flask app on port {port}")
    print(f"Debug mode: {debug}")
    print(f"Environment: {os.environ.get('FLASK_CONFIG', 'default')}")
    
    app.run(
        debug=debug, 
        host='0.0.0.0' if not debug else '127.0.0.1',  # Only bind to all interfaces in production
        port=port
    ) 