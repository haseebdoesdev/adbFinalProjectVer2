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
  Divider,
  Grid,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  BarChart as BarChartIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Course } from '../../types/course';
import { useAuth, getUserDisplayName } from '../../contexts/AuthContext';
import * as teacherService from '../../services/teacherService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatsCard from '../../components/common/StatsCard';

const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<teacherService.TeacherDashboardStats>({
    total_courses: 0,
    total_students: 0,
    total_assignments: 0,
    total_quizzes: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Course selection dialog state
  const [courseSelectionDialog, setCourseSelectionDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [coursesData, statsData] = await Promise.all([
          teacherService.getMyCourses(3), // Get only 3 recent courses for dashboard
          teacherService.getDashboardStats()
        ]);
        setRecentCourses(coursesData);
        setStats(statsData);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleGradebookClick = () => {
    if (recentCourses.length === 1) {
      // If only one course, go directly to gradebook
      navigate(`/teacher/courses/${recentCourses[0]._id}/gradebook`);
    } else if (recentCourses.length > 1) {
      // If multiple courses, show selection dialog
      setCourseSelectionDialog(true);
    } else {
      // No courses available
      setError('No courses available. Please contact your administrator to get courses assigned.');
    }
  };

  const handleCourseSelection = () => {
    if (selectedCourseId) {
      navigate(`/teacher/courses/${selectedCourseId}/gradebook`);
      setCourseSelectionDialog(false);
      setSelectedCourseId('');
    }
  };

  const displayName = getUserDisplayName(user);

  const quickActions = [
    {
      title: 'My Courses',
      description: 'View and manage your courses',
      icon: <SchoolIcon />,
      color: '#6366f1',
      action: '/teacher/courses/my'
    },
    {
      title: 'Create Assignment',
      description: 'Add new assignments to courses',
      icon: <AssignmentIcon />,
      color: '#f59e0b',
      action: '/teacher/assignments'
    },
    {
      title: 'Create Quiz',
      description: 'Design and publish quizzes',
      icon: <QuizIcon />,
      color: '#3b82f6',
      action: '/teacher/quizzes'
    },
    {
      title: 'Grade Book',
      description: 'Review and manage grades',
      icon: <GradeIcon />,
      color: '#10b981',
      action: 'gradebook' // Special action for gradebook
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
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
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
              Welcome back, Professor {displayName}! 👨‍🏫
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
            title="Teaching Courses"
            value={stats.total_courses}
            icon={<SchoolIcon />}
            color="#6366f1"
            trend="up"
            trendValue="+2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={stats.total_students}
            icon={<PeopleIcon />}
            color="#10b981"
            trend="up"
            trendValue="+15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Assignments"
            value={stats.total_assignments}
            icon={<AssignmentIcon />}
            color="#f59e0b"
            trend="up"
            trendValue="+3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Quizzes"
            value={stats.total_quizzes}
            icon={<QuizIcon />}
            color="#3b82f6"
            trend="up"
            trendValue="+1"
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
                    Your Recent Courses
                  </Typography>
                </Box>
                <Button 
                  component={RouterLink} 
                  to="/teacher/courses/my"
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  View All
                </Button>
              </Box>

              {recentCourses.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <SchoolIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No courses assigned yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Contact your administrator to get courses assigned
                  </Typography>
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
                              background: `linear-gradient(135deg, ${['#6366f1', '#ec4899', '#10b981', '#f59e0b'][index % 4]}, ${['#8b5cf6', '#f472b6', '#34d399', '#fbbf24'][index % 4]})`,
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
                                <Typography variant="caption" color="text.secondary">
                                  {course.semester} {course.year}
                                </Typography>
                                {course.schedule_info && (
                                  <>
                                    <Typography variant="caption" color="text.secondary">
                                      •
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {course.schedule_info}
                                    </Typography>
                                  </>
                                )}
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
                            {course.current_enrollment}/{course.max_capacity} students
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
                  <TrendingUpIcon />
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
                    onClick={action.action === 'gradebook' ? handleGradebookClick : undefined}
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

      {/* Teacher Info */}
      <Card sx={{ mt: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>
              <PersonIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Teacher Information
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Teacher ID
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {user?.teacher_id_str || 'Not assigned'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {user?.email}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Department
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {user?.department || 'Not specified'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Member Since
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {(user as any)?.date_joined ? new Date((user as any).date_joined).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Course Selection Dialog for Gradebook */}
      <Dialog open={courseSelectionDialog} onClose={() => setCourseSelectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Course for Gradebook</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Course</InputLabel>
            <Select
              value={selectedCourseId}
              label="Course"
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {recentCourses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.course_code} - {course.course_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseSelectionDialog(false)}>Cancel</Button>
          <Button onClick={handleCourseSelection} variant="contained" disabled={!selectedCourseId}>
            Open Gradebook
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherDashboardPage; 