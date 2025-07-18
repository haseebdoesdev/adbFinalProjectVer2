import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Course } from '../../types/course';
import { User } from '../../types/user';
import apiClient, { handleApiError } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatsCard from '../../components/common/StatsCard';
import { useAuth } from '../../contexts/AuthContext';
import * as teacherService from '../../services/teacherService';

interface CourseWithStudents extends Course {
  enrolled_students?: teacherService.StudentInCourse[];
}

const TeacherMyCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithStudents[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const fetchMyCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await teacherService.getMyCourses();
      setCourses(response);
    } catch (err: any) {
      console.error('Error fetching teaching courses:', err);
      setError(err.message || 'Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseStudents = async (courseId: string) => {
    try {
      const response = await teacherService.getCourseStudents(courseId);
      setCourses(prev => prev.map(course => 
        course._id === courseId 
          ? { ...course, enrolled_students: response }
          : course
      ));
    } catch (err: any) {
      console.error('Error fetching course students:', err);
      setError(err.message || 'Failed to fetch course students');
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const handleCourseExpand = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      return;
    }
    
    setExpandedCourse(courseId);
    const course = courses.find(c => c._id === courseId);
    if (course && !course.enrolled_students) {
      await fetchCourseStudents(courseId);
    }
  };

  const getTotalStudents = () => {
    return courses.reduce((total, course) => total + course.current_enrollment, 0);
  };

  const getTotalCredits = () => {
    return courses.reduce((total, course) => total + course.credits, 0);
  };

  const handleGradebookNavigation = (courseId: string) => {
    navigate(`/teacher/courses/${courseId}/gradebook`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading your courses..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              width: 48,
              height: 48,
              mr: 2
            }}
          >
            <SchoolIcon />
          </Avatar>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e293b, #64748b)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              My Teaching Courses
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Manage your courses, students, and academic activities
            </Typography>
          </Box>
        </Box>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Courses"
            value={courses.length}
            icon={<SchoolIcon />}
            color="#6366f1"
            trend="up"
            trendValue="+2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={getTotalStudents()}
            icon={<PeopleIcon />}
            color="#10b981"
            trend="up"
            trendValue="+15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Credits"
            value={getTotalCredits()}
            icon={<TrendingUpIcon />}
            color="#f59e0b"
            trend="up"
            trendValue="+3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Average Enrollment"
            value={courses.length > 0 ? Math.round(getTotalStudents() / courses.length) : 0}
            icon={<DashboardIcon />}
            color="#ec4899"
            trend="up"
            trendValue="+8%"
          />
        </Grid>
      </Grid>

      {courses.length === 0 ? (
        <Box textAlign="center" py={8}>
          <SchoolIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 3 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No assigned courses
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You haven't been assigned to teach any courses yet. Contact your administrator 
            if you believe this is an error.
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={3}>
          {courses.map((course, index) => (
            <Card 
              key={course._id}
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      sx={{
                        background: `linear-gradient(135deg, ${['#6366f1', '#ec4899', '#10b981', '#f59e0b'][index % 4]}, ${['#8b5cf6', '#f472b6', '#34d399', '#fbbf24'][index % 4]})`,
                        width: 48,
                        height: 48,
                        fontSize: '1.1rem',
                        fontWeight: 600
                      }}
                    >
                      {course.course_code.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                        {course.course_code} - {course.course_name}
                      </Typography>
                      <Box display="flex" gap={1} mb={1}>
                        <Chip
                          label={`${course.semester} ${course.year}`}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={`${course.credits} credit${course.credits !== 1 ? 's' : ''}`}
                          variant="outlined"
                          size="small"
                        />
                        <Chip
                          label={course.department}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <LinearProgress
                      variant="determinate"
                      value={(course.current_enrollment / course.max_capacity) * 100}
                      sx={{
                        width: 120,
                        height: 8,
                        borderRadius: 4,
                        mb: 1,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                        }
                      }}
                    />
                    <Chip
                      label={`${course.current_enrollment}/${course.max_capacity} enrolled`}
                      color={course.current_enrollment >= course.max_capacity ? 'error' : 'success'}
                      size="small"
                    />
                  </Box>
                </Box>
                
                {course.description && (
                  <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
                    {course.description}
                  </Typography>
                )}
                
                <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                  {course.schedule_info && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">{course.schedule_info}</Typography>
                    </Box>
                  )}
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {course.current_enrollment} student{course.current_enrollment !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  {course.assignments && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <AssignmentIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {course.assignments.length} assignment{course.assignments.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  )}
                  
                  {course.quizzes && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <QuizIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {course.quizzes.length} quiz{course.quizzes.length !== 1 ? 'zes' : ''}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Student Enrollment Accordion */}
                <Accordion 
                  expanded={expandedCourse === course._id}
                  onChange={() => handleCourseExpand(course._id)}
                  sx={{
                    borderRadius: 2,
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      View Enrolled Students ({course.current_enrollment})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {course.enrolled_students ? (
                      course.enrolled_students.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Major</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {course.enrolled_students.map(student => (
                                <TableRow key={student._id} hover>
                                  <TableCell>{student.student_id_str || 'N/A'}</TableCell>
                                  <TableCell sx={{ fontWeight: 500 }}>
                                    {student.first_name} {student.last_name}
                                  </TableCell>
                                  <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <EmailIcon fontSize="small" color="action" />
                                      {student.email}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{student.major || 'Not specified'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No students enrolled in this course yet.
                        </Typography>
                      )
                    ) : (
                      <LoadingSpinner message="Loading students..." />
                    )}
                  </AccordionDetails>
                </Accordion>
              </CardContent>
              
              <Divider />
              
              <CardActions sx={{ p: 3 }}>
                <Box display="flex" gap={2} width="100%">
                  <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Manage Assignments
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Create Quiz
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<GradeIcon />}
                    onClick={() => handleGradebookNavigation(course._id)}
                    sx={{ 
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Grade Book
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    Attendance
                  </Button>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default TeacherMyCoursesPage; 