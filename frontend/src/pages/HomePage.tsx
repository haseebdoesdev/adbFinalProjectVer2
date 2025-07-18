import React from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Avatar,
  Chip,
  Paper,
  Stack
} from '@mui/material';
import { 
  School as SchoolIcon, 
  Assignment as AssignmentIcon, 
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Groups as GroupsIcon,
  AutoStories as AutoStoriesIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
    const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Course Management',
      description: 'Comprehensive course creation, enrollment, and tracking system',
      color: 'primary.main'
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Student Portal',
      description: 'Easy access to courses, assignments, and academic progress',
      color: 'secondary.main'
    },
    {
      icon: <DashboardIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Admin Dashboard',
      description: 'Powerful administration tools for managing the entire system',
      color: 'success.main'
    },
    {
      icon: <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: 'Assessment Tools',
      description: 'Create and manage assignments, quizzes, and evaluations',
      color: 'warning.main'
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'Analytics',
      description: 'Track performance metrics and generate detailed reports',
      color: 'info.main'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      title: 'Secure Access',
      description: 'Role-based authentication and data protection',
      color: 'error.main'
    }
  ];

  const stats = [
    { number: '500+', label: 'Students', icon: <GroupsIcon /> },
    { number: '50+', label: 'Courses', icon: <AutoStoriesIcon /> },
    { number: '25+', label: 'Teachers', icon: <PeopleIcon /> },
    { number: '98%', label: 'Satisfaction', icon: <StarIcon /> }
  ];

    return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            zIndex: 1
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Chip 
                  label="Modern Education Platform" 
                  sx={{ 
                    mb: 3, 
                    background: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }} 
                />
                <Typography 
                  variant="h1" 
                  component="h1" 
                  gutterBottom 
                  sx={{ 
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 700,
                    lineHeight: 1.1,
                    mb: 3
                  }}
                >
                  University Management
                  <Box component="span" sx={{ color: '#fbbf24', display: 'block' }}>
                    Made Simple
                  </Box>
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mb: 4, 
                    opacity: 0.9,
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    lineHeight: 1.6
                  }}
                >
                  Streamline your educational institution with our comprehensive management system. 
                  From course enrollment to academic tracking, everything you need in one place.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
            {user ? (
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={() => navigate(`/${user.role}/dashboard`)}
                      sx={{ 
                        py: 2, 
                        px: 4,
                        background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                        }
                      }}
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="contained" 
                        component={RouterLink} 
                        to="/register"
                        size="large"
                        sx={{ 
                          py: 2, 
                          px: 4,
                          background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1.1rem',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                          }
                        }}
                      >
                        Get Started
                      </Button>
                      <Button 
                        variant="outlined" 
                        component={RouterLink} 
                        to="/login"
                        size="large"
                        sx={{ 
                          py: 2, 
                          px: 4,
                          borderColor: 'rgba(255,255,255,0.5)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1.1rem',
                          '&:hover': {
                            borderColor: 'white',
                            background: 'rgba(255,255,255,0.1)',
                          }
                        }}
                      >
                        Sign In
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center', position: 'relative' }}>
                <Paper
                  elevation={0}
                  sx={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    p: 4,
                    transform: 'perspective(1000px) rotateY(-15deg) rotateX(15deg)',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg)',
                    }
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 80, mb: 2, color: '#fbbf24' }} />
                  <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                    Smart Learning Platform
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Experience the future of education management
                  </Typography>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 6, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                    {stat.number}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Powerful Features
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Everything you need to manage your educational institution effectively and efficiently
          </Typography>
        </Box>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${feature.color}15, ${feature.color}05)`,
                      borderRadius: '50%',
                      width: 80,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          py: 8,
          mt: 6
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of educational institutions using our platform
          </Typography>
          {!user && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/register"
                size="large"
                sx={{ 
                  py: 2, 
                  px: 4,
                  background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}
              >
                Create Account
              </Button>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/login"
                size="large"
                sx={{ 
                  py: 2, 
                  px: 4,
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Sign In
              </Button>
            </Stack>
          )}
        </Container>
      </Box>
    </Box>
    );
};

export default HomePage; 