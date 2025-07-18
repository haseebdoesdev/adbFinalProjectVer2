import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from '../theme/theme';
import MainLayout from '../components/Layout/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import AdminDashboardPage from '../pages/Admin/AdminDashboardPage';
import AdminReportsPage from '../pages/Admin/AdminReportsPage';
import AdminUsersPage from '../pages/Admin/AdminUsersPage';
import CourseManagementPage from '../pages/Admin/CourseManagementPage';
import StudentDashboardPage from '../pages/Student/StudentDashboardPage';
import TeacherDashboardPage from '../pages/Teacher/TeacherDashboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Import the new course pages
import StudentAvailableCoursesPage from '../pages/Student/StudentAvailableCoursesPage';
import StudentMyCoursesPage from '../pages/Student/StudentMyCoursesPage';
import StudentAssignmentsPage from '../pages/Student/StudentAssignmentsPage';
import StudentAssignmentDetailPage from '../pages/Student/StudentAssignmentDetailPage';
import StudentGradesPage from '../pages/Student/StudentGradesPage';
import TeacherMyCoursesPage from '../pages/Teacher/TeacherMyCoursesPage';
import TeacherAssignmentsPage from '../pages/Teacher/TeacherAssignmentsPage';
import TeacherQuizzesPage from '../pages/Teacher/TeacherQuizzesPage';
import TeacherGradebookPage from '../pages/Teacher/TeacherGradebookPage';

const AppRouter: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ErrorBoundary>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route element={<MainLayout />}>
                                {/* Public Routes */}
                                <Route path="/" element={<HomePage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />

                                {/* Admin Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                                    <Route path="/admin/reports" element={<AdminReportsPage />} />
                                    <Route path="/admin/users" element={<AdminUsersPage />} />
                                    <Route path="/admin/courses" element={<CourseManagementPage />} />
                                </Route>

                                {/* Student Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                    <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                                    <Route path="/student/courses/available" element={<StudentAvailableCoursesPage />} />
                                    <Route path="/student/courses/my" element={<StudentMyCoursesPage />} />
                                    <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
                                    <Route path="/student/assignments/:assignmentId" element={<StudentAssignmentDetailPage />} />
                                    <Route path="/student/grades" element={<StudentGradesPage />} />
                                </Route>

                                {/* Teacher Routes */}
                                <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                                    <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                                    <Route path="/teacher/courses/my" element={<TeacherMyCoursesPage />} />
                                    <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
                                    <Route path="/teacher/quizzes" element={<TeacherQuizzesPage />} />
                                    <Route path="/teacher/courses/:courseId/gradebook" element={<TeacherGradebookPage />} />
                                </Route>
                                
                                {/* Catch-all for not found pages */}
                                <Route path="*" element={<NotFoundPage />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </ErrorBoundary>
        </ThemeProvider>
    );
};

export default AppRouter; 