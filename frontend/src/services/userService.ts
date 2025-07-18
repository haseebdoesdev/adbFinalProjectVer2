import apiClient from './api';
import { User } from '../types/user';

// Dashboard stats interface
export interface DashboardStats {
    total_courses: number;
    total_students: number;
    total_teachers: number;
    total_enrollments: number;
}

// Fetch dashboard stats (admin only)
export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
    return response.data;
};

// Fetch all users (admin only)
export const getAllUsers = async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
};

// Fetch users by role (e.g., to get a list of all teachers, students, or admins)
export const getUsersByRole = async (role: 'student' | 'teacher' | 'admin'): Promise<User[]> => {
    const response = await apiClient.get<User[]>(`/admin/users`, { params: { role } });
    return response.data;
};

// Fetch user by ID
export const getUserById = async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${userId}`);
    return response.data;
};

// Update user (admin only)
export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}`, userData);
    return response.data;
};

// Delete user (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
};

// Toggle user status (admin only)
export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}/status`, { is_active: isActive });
    return response.data;
}; 