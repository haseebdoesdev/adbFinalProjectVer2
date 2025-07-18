import apiClient from './api';
import { Course, CourseCreationPayload, CourseUpdatePayload } from '../types/course';

// Fetch all courses
export const getCourses = async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>('/admin/courses');
    return response.data;
};

// Fetch a single course by its ID
export const getCourseById = async (courseId: string): Promise<Course> => {
    const response = await apiClient.get<Course>(`/admin/courses/${courseId}`);
    return response.data;
};

// Create a new course
export const createCourse = async (courseData: CourseCreationPayload): Promise<Course> => {
    const response = await apiClient.post<Course>('/admin/courses', courseData);
    return response.data;
};

// Update an existing course
export const updateCourse = async (courseId: string, courseData: CourseUpdatePayload): Promise<Course> => {
    const response = await apiClient.put<Course>(`/admin/courses/${courseId}`, courseData);
    return response.data; // Assuming the backend returns the updated course
};

// Delete a course
export const deleteCourse = async (courseId: string): Promise<void> => {
    await apiClient.delete(`/admin/courses/${courseId}`);
};

// Assign a teacher to a course
export const assignTeacherToCourse = async (courseId: string, teacherId: string): Promise<any> => {
    const response = await apiClient.put(`/admin/courses/${courseId}/assign-teacher`, { teacher_id: teacherId });
    return response.data;
}; 