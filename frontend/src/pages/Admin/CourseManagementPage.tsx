import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import * as courseService from '../../services/courseService';
import * as userService from '../../services/userService';
import { Course } from '../../types/course';
import { User } from '../../types/user';
import { handleApiError } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import CourseForm from '../../components/Admin/CourseForm';
import AssignTeacherForm from '../../components/Admin/AssignTeacherForm';

const CourseManagementPage: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // State for managing modals
    const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
    const [isAssignTeacherFormOpen, setIsAssignTeacherFormOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const fetchCoursesAndTeachers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [coursesData, teachersData] = await Promise.all([
                courseService.getCourses(),
                userService.getUsersByRole('teacher')
            ]);
            setCourses(coursesData);
            setTeachers(teachersData);
        } catch (err: any) {
            console.error(err);
            setError(handleApiError(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCoursesAndTeachers();
    }, [fetchCoursesAndTeachers]);

    const handleCreateCourse = () => {
        setSelectedCourse(null);
        setIsCourseFormOpen(true);
    };

    const handleEditCourse = (course: Course) => {
        setSelectedCourse(course);
        setIsCourseFormOpen(true);
    };

    const handleDeleteCourse = async (courseId: string, courseName: string) => {
        if (window.confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) {
            try {
                setError(null);
                await courseService.deleteCourse(courseId);
                await fetchCoursesAndTeachers(); // Refresh list
            } catch (err: any) {
                console.error(err);
                setError(handleApiError(err));
            }
        }
    };

    const handleOpenAssignTeacher = (course: Course) => {
        setSelectedCourse(course);
        setIsAssignTeacherFormOpen(true);
    };

    const handleCourseFormClose = (refresh?: boolean) => {
        setIsCourseFormOpen(false);
        setSelectedCourse(null);
        if (refresh) {
            fetchCoursesAndTeachers();
        }
    };

    const handleAssignTeacherFormClose = (refresh?: boolean) => {
        setIsAssignTeacherFormOpen(false);
        setSelectedCourse(null);
        if (refresh) {
            fetchCoursesAndTeachers();
        }
    };

    const getTeacherName = (teacherId?: string | null) => {
        if (!teacherId) return 'Unassigned';
        const teacher = teachers.find(t => t._id === teacherId);
        return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown';
    };

    const getEnrollmentStatus = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage >= 90) return 'error';
        if (percentage >= 75) return 'warning';
        return 'success';
    };

    if (isLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <LoadingSpinner variant="page" message="Loading courses..." />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Course Management
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleCreateCourse}
                    size="large"
                >
                    Create New Course
                </Button>
            </Box>

            <ErrorAlert 
                error={error} 
                onClose={() => setError(null)} 
            />
            
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Code</strong></TableCell>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Department</strong></TableCell>
                                <TableCell><strong>Credits</strong></TableCell>
                                <TableCell><strong>Teacher</strong></TableCell>
                                <TableCell><strong>Enrollment</strong></TableCell>
                                <TableCell><strong>Semester</strong></TableCell>
                                <TableCell align="center"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                    {courses.length > 0 ? courses.map(course => (
                                <TableRow key={course._id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {course.course_code}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {course.course_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{course.department}</TableCell>
                                    <TableCell>{course.credits}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={getTeacherName(course.teacher_id)}
                                            size="small"
                                            color={course.teacher_id ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={`${course.current_enrollment}/${course.max_capacity}`}
                                            size="small"
                                            color={getEnrollmentStatus(course.current_enrollment, course.max_capacity)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {course.semester} {course.year}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" justifyContent="center" gap={1}>
                                            <Tooltip title="Edit Course">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditCourse(course)}
                                                    color="primary"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Assign Teacher">
                                                <IconButton 
                                                    size="small"
                                                    onClick={() => handleOpenAssignTeacher(course)}
                                                    color="secondary"
                                                >
                                                    <PersonAddIcon />
                                                </IconButton>
                                            </Tooltip>
                                            
                                            <Tooltip title="Delete Course">
                                                <IconButton 
                                                    size="small"
                                                    onClick={() => handleDeleteCourse(course._id, course.course_name)}
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                    )) : (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            No courses found. Create your first course to get started.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                    )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Course Form Modal */}
            {isCourseFormOpen && (
                <CourseForm 
                    course={selectedCourse} 
                    onClose={handleCourseFormClose} 
                    teachers={teachers}
                />
            )} 

            {/* Assign Teacher Form Modal */}
            {isAssignTeacherFormOpen && selectedCourse && (
                <AssignTeacherForm 
                    course={selectedCourse} 
                    teachers={teachers}
                    onClose={handleAssignTeacherFormClose} 
                />
            )}
        </Container>
    );
};

export default CourseManagementPage; 