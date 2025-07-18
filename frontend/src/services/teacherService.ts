import apiClient from './api';
import { Course } from '../types/course';
import { User } from '../types/user';
import { StudentGrade, BulkGradeEntry, GradeComponent, GradeStats } from '../types/grade';

// Teacher dashboard stats interface
export interface TeacherDashboardStats {
    total_courses: number;
    total_students: number;
    total_assignments: number;
    total_quizzes: number;
}

// Assignment interface
export interface Assignment {
    _id: string;
    title: string;
    description: string;
    assignment_type: string;
    total_points: number;
    due_date: string;
    instructions: string;
    course_id: string;
    teacher_id: string;
    submission_stats?: {
        total_submissions: number;
        graded_submissions: number;
        pending_grading: number;
    };
}

// Quiz interface  
export interface Quiz {
    _id: string;
    title: string;
    description: string;
    quiz_type: string;
    total_points: number;
    course_id: string;
    teacher_id: string;
    questions: any[];
    time_limit: number;
    attempts_allowed: number;
    is_published: boolean;
    start_date: string;
    end_date: string;
    created_date: string;
    submission_stats?: {
        total_submissions: number;
    };
}

// Quiz submission interface
export interface QuizSubmission {
    _id: string;
    answers: any[];
    submission_date: string;
    score?: number;
    time_taken: number;
    attempt_number: number;
    status: string;
    student: {
        id: string;
        name: string;
        email: string;
        student_id_str: string;
    };
}

// Assignment submission interface
export interface AssignmentSubmission {
    _id: string;
    content: string;
    attachments: string[];
    submission_date: string;
    score?: number;
    feedback?: string;
    status: string;
    graded_date?: string;
    student: {
        id: string;
        name: string;
        email: string;
        student_id_str: string;
    };
}

// Student in course interface
export interface StudentInCourse {
    _id: string;
    user_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    student_id_str: string;
    major?: string;
}

// --- DASHBOARD ENDPOINTS ---

// Fetch teacher dashboard stats
export const getDashboardStats = async (): Promise<TeacherDashboardStats> => {
    const response = await apiClient.get<TeacherDashboardStats>('/teacher/dashboard/stats');
    return response.data;
};

// --- COURSE MANAGEMENT ---

// Fetch all courses taught by the teacher
export const getMyCourses = async (limit?: number): Promise<Course[]> => {
    const params = limit ? { limit } : {};
    const response = await apiClient.get<Course[]>('/teacher/courses/my', { params });
    return response.data;
};

// Fetch students enrolled in a specific course
export const getCourseStudents = async (courseId: string): Promise<StudentInCourse[]> => {
    const response = await apiClient.get<StudentInCourse[]>(`/teacher/courses/${courseId}/students`);
    return response.data;
};

// --- ASSIGNMENT MANAGEMENT ---

// Fetch assignments for a course
export const getCourseAssignments = async (courseId: string): Promise<Assignment[]> => {
    const response = await apiClient.get<Assignment[]>(`/teacher/courses/${courseId}/assignments`);
    return response.data;
};

// Create a new assignment
export const createAssignment = async (courseId: string, assignmentData: Partial<Assignment>): Promise<void> => {
    await apiClient.post(`/teacher/courses/${courseId}/assignments`, assignmentData);
};

// Fetch submissions for an assignment
export const getAssignmentSubmissions = async (assignmentId: string): Promise<AssignmentSubmission[]> => {
    const response = await apiClient.get<AssignmentSubmission[]>(`/teacher/assignments/${assignmentId}/submissions`);
    return response.data;
};

// Grade an assignment submission
export const gradeAssignmentSubmission = async (
    submissionId: string, 
    score: number, 
    feedback?: string
): Promise<AssignmentSubmission> => {
    const response = await apiClient.post<AssignmentSubmission>(`/teacher/submissions/${submissionId}/grade`, {
        score,
        feedback
    });
    return response.data;
};

// Update an assignment
export const updateAssignment = async (assignmentId: string, assignmentData: Partial<Assignment>): Promise<void> => {
    await apiClient.put(`/teacher/assignments/${assignmentId}`, assignmentData);
};

// Delete an assignment
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
    await apiClient.delete(`/teacher/assignments/${assignmentId}`);
};

// --- QUIZ MANAGEMENT ---

// Fetch quizzes for a course
export const getCourseQuizzes = async (courseId: string): Promise<Quiz[]> => {
    const response = await apiClient.get<Quiz[]>(`/teacher/courses/${courseId}/quizzes`);
    return response.data;
};

// Create a new quiz
export const createQuiz = async (courseId: string, quizData: Partial<Quiz>): Promise<Quiz> => {
    const response = await apiClient.post<Quiz>(`/teacher/courses/${courseId}/quizzes`, quizData);
    return response.data;
};

// Update a quiz
export const updateQuiz = async (quizId: string, quizData: Partial<Quiz>): Promise<Quiz> => {
    const response = await apiClient.put<Quiz>(`/teacher/quizzes/${quizId}`, quizData);
    return response.data;
};

// Delete a quiz
export const deleteQuiz = async (quizId: string): Promise<void> => {
    await apiClient.delete(`/teacher/quizzes/${quizId}`);
};

// Fetch submissions for a quiz
export const getQuizSubmissions = async (quizId: string): Promise<QuizSubmission[]> => {
    const response = await apiClient.get<QuizSubmission[]>(`/teacher/quizzes/${quizId}/submissions`);
    return response.data;
};

// Get grades for a course
export const getCourseGrades = async (courseId: string): Promise<StudentGrade[]> => {
    const response = await apiClient.get<StudentGrade[]>(`/teacher/courses/${courseId}/grades`);
    return response.data;
};

// Bulk upload grades
export const bulkUploadGrades = async (courseId: string, gradesData: BulkGradeEntry[]): Promise<any> => {
    const response = await apiClient.post(`/teacher/courses/${courseId}/grades/bulk`, {
        grades: gradesData
    });
    return response.data;
};

// Add individual grade component to student
export const addGradeComponent = async (
    courseId: string, 
    studentId: string, 
    component: Omit<GradeComponent, 'component_id'>
): Promise<void> => {
    await apiClient.post(`/teacher/courses/${courseId}/students/${studentId}/grades/components`, component);
};

// Update individual grade component
export const updateGradeComponent = async (
    courseId: string, 
    studentId: string, 
    componentId: string,
    component: Partial<GradeComponent>
): Promise<void> => {
    await apiClient.put(`/teacher/courses/${courseId}/students/${studentId}/grades/components/${componentId}`, component);
};

// Delete grade component
export const deleteGradeComponent = async (
    courseId: string, 
    studentId: string, 
    componentId: string
): Promise<void> => {
    await apiClient.delete(`/teacher/courses/${courseId}/students/${studentId}/grades/components/${componentId}`);
};

// Get individual student's grade
export const getStudentGrade = async (courseId: string, studentId: string): Promise<StudentGrade> => {
    const response = await apiClient.get<StudentGrade>(`/teacher/courses/${courseId}/students/${studentId}/grades`);
    return response.data;
};

// Calculate final grades for all students in course
export const calculateFinalGrades = async (courseId: string): Promise<void> => {
    await apiClient.post(`/teacher/courses/${courseId}/grades/calculate`);
};

// Get grade statistics for course
export const getCourseGradeStats = async (courseId: string): Promise<GradeStats> => {
    const response = await apiClient.get<GradeStats>(`/teacher/courses/${courseId}/grades/stats`);
    return response.data;
};

// Export grades to CSV
export const exportGradesToCSV = async (courseId: string): Promise<Blob> => {
    const response = await apiClient.get(`/teacher/courses/${courseId}/grades/export`, {
        responseType: 'blob'
    });
    return response.data;
};

// --- ATTENDANCE ---

// Get attendance records for a course
export const getCourseAttendance = async (courseId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/teacher/courses/${courseId}/attendance`);
    return response.data;
};

// Record attendance for a session
export const recordAttendance = async (courseId: string, attendanceData: any): Promise<any> => {
    const response = await apiClient.post(`/teacher/courses/${courseId}/attendance`, attendanceData);
    return response.data;
};

// --- ANALYTICS ---

// Get teacher analytics
export const getTeacherAnalytics = async (): Promise<any> => {
    const response = await apiClient.get('/teacher/analytics');
    return response.data;
}; 