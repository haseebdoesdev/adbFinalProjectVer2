import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  BookmarkBorder as BookmarkIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth, getUserDisplayName } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as studentService from '../../services/studentService';

const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [recentCourses, setRecentCourses] = useState<studentService.EnrolledCourse[]>([]);
  const [stats, setStats] = useState<studentService.StudentDashboardStats>({
    total_courses: 0,
    total_credits: 0,
    upcoming_assignments: 0,
    upcoming_quizzes: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [coursesResponse, statsResponse] = await Promise.all([
          studentService.getEnrolledCourses(3),
          studentService.getDashboardStats()
        ]);
        setRecentCourses(coursesResponse);
        setStats(statsResponse);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const displayName = getUserDisplayName(user);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading dashboard..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome back, {displayName}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your courses today.
        </Typography>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Stats Cards */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
        <Paper sx={{ p: 3, flex: 1, minWidth: 200 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <SchoolIcon color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" color="primary">
                {stats.total_courses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enrolled Courses
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, flex: 1, minWidth: 200 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" color="success.main">
                {stats.total_credits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Credits
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, flex: 1, minWidth: 200 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <AssignmentIcon color="warning" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" color="warning.main">
                {stats.upcoming_assignments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Assignments
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, flex: 1, minWidth: 200 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <QuizIcon color="info" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" color="info.main">
                {stats.upcoming_quizzes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming Quizzes
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={3}>
        {/* Recent Courses */}
        <Card sx={{ flex: 2, minWidth: 400 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="h2">
                Your Courses
              </Typography>
              <Button 
                component={RouterLink} 
                to="/student/courses/my"
                variant="outlined"
                size="small"
              >
                View All
              </Button>
            </Box>

            {recentCourses.length === 0 ? (
              <Box textAlign="center" py={4}>
                <BookmarkIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No courses enrolled yet
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Start by browsing available courses
                </Typography>
                <Button
                  component={RouterLink}
                  to="/student/courses/available"
                  variant="contained"
                  size="small"
                >
                  Browse Courses
                </Button>
              </Box>
            ) : (
              <List>
                {recentCourses.map((course, index) => (
                  <React.Fragment key={course._id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <SchoolIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {course.course_code}
                            </Typography>
                            <Chip 
                              label={`${course.credits} credits`} 
                              size="small" 
                              variant="outlined" 
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.primary">
                              {course.course_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {course.department} • {course.semester} {course.year}
                            </Typography>
                            {course.teacher_info?.name && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Instructor: {course.teacher_info.name}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentCourses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Quick Actions
            </Typography>
            
            <List>
              <ListItem 
                component={RouterLink} 
                to="/student/courses/available"
                sx={{ 
                  borderRadius: 1, 
                  mb: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <BookmarkIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Browse Available Courses"
                  secondary="Find and enroll in new courses"
                />
              </ListItem>

              <ListItem 
                component={RouterLink} 
                to="/student/courses/my"
                sx={{ 
                  borderRadius: 1, 
                  mb: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <SchoolIcon color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary="My Courses"
                  secondary="View your enrolled courses"
                />
              </ListItem>

              <ListItem 
                component={RouterLink} 
                to="/student/assignments"
                sx={{ 
                  borderRadius: 1, 
                  mb: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <AssignmentIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Assignments"
                  secondary="View pending assignments"
                />
              </ListItem>

              <ListItem 
                component={RouterLink} 
                to="/student/grades"
                sx={{ 
                  borderRadius: 1, 
                  mb: 1,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <GradeIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Grades"
                  secondary="View your academic performance"
                />
              </ListItem>

              <ListItem 
                sx={{ 
                  borderRadius: 1, 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <PersonIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Profile"
                  secondary="Update your information"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>

      {/* User Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Student Information
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">Student ID</Typography>
              <Typography variant="body1">{user?.student_id_str || 'Not assigned'}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1">{user?.email}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Major</Typography>
              <Typography variant="body1">{user?.major || 'Not specified'}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Department</Typography>
              <Typography variant="body1">{user?.department || 'Not specified'}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
    );
};

export default StudentDashboardPage; 