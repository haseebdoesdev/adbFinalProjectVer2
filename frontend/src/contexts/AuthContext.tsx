import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  first_name?: string;
  last_name?: string;
  student_id_str?: string;
  teacher_id_str?: string;
  major?: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  first_name?: string;
  last_name?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context for direct access if needed
export { AuthContext };

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // Validate token by making a profile request
          validateToken();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const validateToken = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.user_details) {
        setUser(response.data.user_details);
        localStorage.setItem('user', JSON.stringify(response.data.user_details));
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', {
        username,
        password,
      });

      const { access_token, role, user } = response.data;

      if (access_token && user) {
        localStorage.setItem('token', access_token);
        
        // Use the user data returned from login response
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error('No access token or user data received');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', userData);
      
      // After successful registration, automatically log in
      await login(userData.username, userData.password);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any cached API data
    delete api.defaults.headers.common['Authorization'];
    
    // Redirect to login page
    window.location.href = '/login';
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export API instance for use in other parts of the app
export { api };

// Higher-order component for role-based access control
export const withRoleAccess = (
  WrappedComponent: React.ComponentType<any>,
  allowedRoles: Array<'student' | 'teacher' | 'admin'>
) => {
  return (props: any) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
      return <div>Please log in to access this page.</div>;
    }

    if (!allowedRoles.includes(user.role)) {
      return <div>You don't have permission to access this page.</div>;
    }

    return <WrappedComponent {...props} />;
  };
};

// Utility functions
export const hasRole = (user: User | null, role: string): boolean => {
  return user?.role === role;
};

export const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return '';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  return user.username || user.email || '';
}; 