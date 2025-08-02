from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
import os

# Initialize extensions with optimized settings
class OptimizedPyMongo(PyMongo):
    def init_app(self, app, uri=None, **kwargs):
        # Add optimized connection settings
        if not kwargs:
            kwargs = {}
        
        # Connection pool settings for better performance
        kwargs.setdefault('maxPoolSize', 50)
        kwargs.setdefault('minPoolSize', 5)
        kwargs.setdefault('maxIdleTimeMS', 30000)
        kwargs.setdefault('serverSelectionTimeoutMS', 3000)
        kwargs.setdefault('connectTimeoutMS', 5000)
        kwargs.setdefault('socketTimeoutMS', 10000)
        kwargs.setdefault('retryWrites', True)
        kwargs.setdefault('retryReads', True)
        kwargs.setdefault('readPreference', 'secondaryPreferred')
        
        # Call parent init_app with optimized settings
        super().init_app(app, uri=uri, **kwargs)

mongo = OptimizedPyMongo()
bcrypt = Bcrypt()
jwt = JWTManager() 