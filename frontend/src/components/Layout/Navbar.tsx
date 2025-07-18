import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getUserDisplayName } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);

  const displayName = getUserDisplayName(user);
  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
          { path: '/admin/courses', label: 'Courses', icon: <SchoolIcon /> }
        ];
      case 'student':
        return [
          { path: '/student/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
          { path: '/student/courses/available', label: 'Browse Courses', icon: <SchoolIcon /> },
          { path: '/student/courses/my', label: 'My Courses', icon: <AssignmentIcon /> }
        ];
      case 'teacher':
        return [
          { path: '/teacher/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
          { path: '/teacher/courses/my', label: 'My Courses', icon: <SchoolIcon /> },
          { path: '/teacher/assignments', label: 'Assignments', icon: <AssignmentIcon /> },
          { path: '/teacher/quizzes', label: 'Quizzes', icon: <QuizIcon /> }
        ];
      default:
        return [];
    }
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Mobile Menu Button */}
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ 
            mr: 2, 
            display: { sm: 'none' },
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
              background: 'rgba(255,255,255,0.1)',
            }
          }}
          onClick={handleMobileMenuOpen}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Title */}
        <Typography 
          variant="h6" 
          component={RouterLink}
          to="/"
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontWeight: 700,
            fontSize: '1.25rem',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              opacity: 0.8,
            }
          }}
        >
          <SchoolIcon sx={{ fontSize: 28 }} />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
            University MS
          </Box>
        </Typography>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/"
            startIcon={<HomeIcon />}
            sx={{ 
              borderRadius: 2,
              px: 2,
              py: 1,
              fontWeight: 600,
              transition: 'all 0.2s ease-in-out',
              background: isActivePath('/') ? 'rgba(255,255,255,0.2)' : 'transparent',
              '&:hover': {
                background: 'rgba(255,255,255,0.15)',
                transform: 'translateY(-1px)',
              }
            }}
          >
            Home
          </Button>

          {user && getNavItems().map((item) => (
            <Button
              key={item.path}
              color="inherit"
              component={RouterLink}
              to={item.path}
              startIcon={item.icon}
              sx={{ 
                borderRadius: 2,
                px: 2,
                py: 1,
                fontWeight: 600,
                transition: 'all 0.2s ease-in-out',
                background: isActivePath(item.path) ? 'rgba(255,255,255,0.2)' : 'transparent',
                '&:hover': {
                  background: 'rgba(255,255,255,0.15)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Section */}
        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          {user ? (
            <>
              {/* Notifications */}
              <Tooltip title="Notifications">
                <IconButton
                  color="inherit"
                  sx={{
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)',
                      transform: 'scale(1.1)',
                    }
                  }}
                >
                  <Badge badgeContent={3} color="warning">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* User Profile */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ lineHeight: 1.2 }}>
                    {displayName}
                  </Typography>
                  <Chip
                    label={user.role?.toUpperCase()}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '& .MuiChip-label': {
                        px: 1,
                      }
                    }}
                  />
                </Box>
                <Tooltip title="Account Menu">
                  <IconButton
                    size="large"
                    edge="end"
                    aria-label="account of current user"
                    aria-controls="profile-menu"
                    aria-haspopup="true"
                    onClick={handleProfileMenuOpen}
                    color="inherit"
                    sx={{
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        fontWeight: 600
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
                variant="outlined"
                size="small"
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.5)',
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  fontWeight: 600,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Login
              </Button>
              <Button 
                component={RouterLink} 
                to="/register"
                variant="contained"
                size="small"
                sx={{ 
                  background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px 0 rgba(251, 191, 36, 0.39)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(251, 191, 36, 0.4)',
                  }
                }}
              >
                Register
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={isMenuOpen}
        onClose={handleMenuClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 220,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }}
      >
        <Box sx={{ px: 3, py: 2, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontWeight: 600,
                fontSize: '1.2rem'
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                {displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Chip 
              label={user?.role?.toUpperCase()} 
              size="small" 
              sx={{ 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem'
              }} 
            />
          </Box>
        </Box>
        <Divider />
        <MenuItem onClick={() => { navigate(`/${user?.role}/dashboard`); handleMenuClose(); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Dashboard" 
            primaryTypographyProps={{ fontWeight: 500 }}
          />
        </MenuItem>
        <MenuItem onClick={() => { /* Navigate to profile page */ handleMenuClose(); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Profile" 
            primaryTypographyProps={{ fontWeight: 500 }}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{ fontWeight: 500, color: 'error.main' }}
          />
        </MenuItem>
      </Menu>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        open={isMobileMenuOpen}
        onClose={handleMenuClose}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }}
      >
        <MenuItem 
          component={RouterLink} 
          to="/" 
          onClick={handleMenuClose}
          sx={{ 
            borderRadius: 1, 
            mx: 1, 
            mt: 1,
            background: isActivePath('/') ? 'primary.main' : 'transparent',
            color: isActivePath('/') ? 'white' : 'inherit',
            '&:hover': {
              background: isActivePath('/') ? 'primary.dark' : 'action.hover',
            }
          }}
        >
          <ListItemIcon sx={{ color: isActivePath('/') ? 'white' : 'primary.main' }}>
            <HomeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Home</ListItemText>
        </MenuItem>

        {user && getNavItems().map((item) => (
          <MenuItem
            key={item.path}
            component={RouterLink}
            to={item.path}
            onClick={handleMenuClose}
            sx={{ 
              borderRadius: 1, 
              mx: 1,
              background: isActivePath(item.path) ? 'primary.main' : 'transparent',
              color: isActivePath(item.path) ? 'white' : 'inherit',
              '&:hover': {
                background: isActivePath(item.path) ? 'primary.dark' : 'action.hover',
              }
            }}
          >
            <ListItemIcon sx={{ color: isActivePath(item.path) ? 'white' : 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
        
        {user && <Divider sx={{ my: 1 }} />}
        
        {user && (
          <MenuItem onClick={handleLogout} sx={{ borderRadius: 1, mx: 1, mb: 1 }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </AppBar>
  );
};

export default Navbar;