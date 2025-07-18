import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Paper,
  IconButton,
  Avatar,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  BarChart as BarChartIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as courseService from '../../services/courseService';
import * as userService from '../../services/userService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatsCard from '../../components/common/StatsCard';
import { Course } from '../../types/course';
import { handleApiError } from '../../services/api';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<userService.DashboardStats>({
    total_courses: 0,
    total_students: 0,
    total_teachers: 0,
    total_enrollments: 0,
  });
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch real dashboard stats and recent courses in parallel
        const [dashboardStats, courses] = await Promise.all([
          userService.getDashboardStats(),
          courseService.getCourses()
        ]);

        setStats(dashboardStats);
        setRecentCourses(courses.slice(0, 5)); // Show 5 most recent courses

      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(handleApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Create Course',
      description: 'Add a new course to the system',
      icon: <AddIcon />,
      color: 'primary.main',
      action: '/admin/courses'
    },
    {
      title: 'View Reports',
      description: 'Generate analytics reports',
      icon: <BarChartIcon />,
      color: 'info.main',
      action: '/admin/reports'
    },
    {
      title: 'Manage Users',
      description: 'Add or edit user accounts',
      icon: <PeopleIcon />,
      color: 'secondary.main',
      action: '/admin/users'
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: <SettingsIcon />,
      color: 'warning.main',
      action: '#'
    }
  ];

  if (isLoading) {
    return <LoadingSpinner variant="page" message="Loading dashboard..." />;
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
            <DashboardIcon />
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
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Welcome back, {user?.first_name || user?.username}! Here's your system overview.
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
            value={stats.total_courses}
            icon={<SchoolIcon />}
            color="#6366f1"
            trend="up"
            trendValue="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={stats.total_students.toLocaleString()}
            icon={<PeopleIcon />}
            color="#ec4899"
            trend="up"
            trendValue="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Teachers"
            value={stats.total_teachers}
            icon={<GradeIcon />}
            color="#10b981"
            trend="up"
            trendValue="+5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Enrollments"
            value={stats.total_enrollments.toLocaleString()}
            icon={<TrendingUpIcon />}
            color="#f59e0b"
            trend="up"
            trendValue="+15%"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Recent Courses */}
        <Grid item xs={12} lg={8}>
          <Card 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <SchoolIcon />
                  </Avatar>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Recent Courses
                  </Typography>
                </Box>
                <Button 
                  component={RouterLink} 
                  to="/admin/courses"
                  variant="outlined"
                  size="small"
                  endIcon={<ViewIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  View All
                </Button>
              </Box>

              {recentCourses.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <SchoolIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No courses available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Start by creating your first course
                  </Typography>
                  <Button 
                    variant="contained" 
                    component={RouterLink} 
                    to="/admin/courses"
                    startIcon={<AddIcon />}
                    sx={{ mt: 2 }}
                  >
                    Create Course
                  </Button>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {recentCourses.map((course, index) => (
                    <React.Fragment key={course._id}>
                      <ListItem 
                        sx={{ 
                          px: 0, 
                          py: 2,
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            background: 'rgba(99, 102, 241, 0.04)',
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Avatar 
                            sx={{ 
                              background: `linear-gradient(135deg, ${['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'][index % 5]}, ${['#8b5cf6', '#f472b6', '#34d399', '#fbbf24', '#f87171'][index % 5]})`,
                              width: 40,
                              height: 40,
                              fontSize: '0.9rem',
                              fontWeight: 600
                            }}
                          >
                            {course.course_code.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {course.course_code}
                              </Typography>
                              <Chip 
                                label={`${course.credits} credits`} 
                                size="small" 
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                                {course.course_name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {course.department}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  •
                                </Typography>
                                <Chip 
                                  label={`${course.current_enrollment}/${course.max_capacity} enrolled`}
                                  size="small"
                                  color={course.current_enrollment >= course.max_capacity * 0.8 ? 'warning' : 'success'}
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <Box sx={{ textAlign: 'right' }}>
                          <LinearProgress
                            variant="determinate"
                            value={(course.current_enrollment / course.max_capacity) * 100}
                            sx={{
                              width: 80,
                              height: 6,
                              borderRadius: 3,
                              mb: 1,
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round((course.current_enrollment / course.max_capacity) * 100)}% full
                          </Typography>
                        </Box>
                      </ListItem>
                      {index < recentCourses.length - 1 && <Divider sx={{ my: 1 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                  <AssignmentIcon />
                </Avatar>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Quick Actions
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {quickActions.map((action, index) => (
                  <Paper
                    key={index}
                    component={action.action.startsWith('/') ? RouterLink : 'div'}
                    to={action.action.startsWith('/') ? action.action : undefined}
                    sx={{
                      p: 2,
                      textDecoration: 'none',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        borderColor: action.color,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          background: `linear-gradient(135deg, ${action.color}, ${action.color}dd)`,
                          width: 36,
                          height: 36
                        }}
                      >
                        {action.icon}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {action.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
    );
};

export default AdminDashboardPage; 