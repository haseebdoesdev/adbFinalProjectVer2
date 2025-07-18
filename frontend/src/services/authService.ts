import apiClient from './api';
import { User, AuthResponse, RegisterData } from '../types/user';

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
};

export const registerUser = async (userData: RegisterData): Promise<{ message: string; user: User }> => {
    const response = await apiClient.post<{ message: string; user: User }>('/auth/register', userData);
    return response.data;
};

export const getProfile = async (token?: string): Promise<{logged_in_as: {username: string, role: string}, user_details: User}> => {
    // If a token is passed, use it for a one-time request (e.g. right after login)
    // Otherwise, the interceptor will add the token from localStorage
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await apiClient.get('/auth/profile', { headers });
    return response.data;
};

export const logoutUser = async (): Promise<any> => {
    // If your backend has a logout endpoint (e.g., for blacklisting tokens)
    // you can call it here.
    // Example: await apiClient.post('/auth/logout');
    // For now, we primarily handle logout on the client-side by clearing the token.
    return Promise.resolve();
}; 