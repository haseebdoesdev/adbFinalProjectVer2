import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  People as PeopleIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  Psychology as TeacherIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/common/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as userService from '../../services/userService';
import { handleApiError } from '../../services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  phone?: string;
  department?: string;
  student_id_str?: string;
  teacher_id_str?: string;
  major?: string;
  enrolled_courses?: string[];
  courses_teaching?: string[];
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  newUsersThisMonth: number;
}

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    newUsersThisMonth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<User | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all users from the backend API
        const fetchedUsers = await userService.getAllUsers();
        
        // Map backend user data to frontend format
        const normalizedUsers = fetchedUsers.map(user => ({
          ...user,
          // Ensure all required fields are present
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          // Default is_active to true if not set
          is_active: user.is_active !== undefined ? user.is_active : true,
          date_joined: user.date_joined || new Date().toISOString()
        }));

        setUsers(normalizedUsers);
        setFilteredUsers(normalizedUsers);

        // Calculate stats
        const totalUsers = normalizedUsers.length;
        const activeUsers = normalizedUsers.filter(u => u.is_active).length;
        const totalStudents = normalizedUsers.filter(u => u.role === 'student').length;
        const totalTeachers = normalizedUsers.filter(u => u.role === 'teacher').length;
        const totalAdmins = normalizedUsers.filter(u => u.role === 'admin').length;
        const newUsersThisMonth = normalizedUsers.filter(u => {
          const createdDate = new Date(u.date_joined);
          const now = new Date();
          return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        }).length;

        setStats({
          totalUsers,
          activeUsers,
          totalStudents,
          totalTeachers,
          totalAdmins,
          newUsersThisMonth
        });

      } catch (err: any) {
        console.error('Failed to fetch users:', err);
        setError(handleApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.is_active === (statusFilter === 'active'));
    }

    setFilteredUsers(filtered);
    setPage(1); // Reset to first page when filters change
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchor(event.currentTarget);
    setSelectedUserForMenu(user);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedUserForMenu(null);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.first_name} ${user.last_name}"? This action cannot be undone.`)) {
      try {
        setError(null);
        await userService.deleteUser(user._id);
        // Remove user from local state
    setUsers(users.filter(u => u._id !== user._id));
    handleMenuClose();
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError(handleApiError(err));
        handleMenuClose();
      }
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setError(null);
      const newStatus = !user.is_active;
      await userService.toggleUserStatus(user._id, newStatus);
      
      // Update user in local state
    const updatedUsers = users.map(u =>
      u._id === user._id
          ? { ...u, is_active: newStatus }
        : u
    );
    setUsers(updatedUsers);
    handleMenuClose();
    } catch (err: any) {
      console.error('Failed to toggle user status:', err);
      setError(handleApiError(err));
      handleMenuClose();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminIcon />;
      case 'teacher': return <TeacherIcon />;
      case 'student': return <SchoolIcon />;
      default: return <PeopleIcon />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'teacher': return 'warning';
      case 'student': return 'primary';
      default: return 'default';
    }
  };

  const paginatedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (isLoading) {
    return <LoadingSpinner variant="page" message="Loading users..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                width: 48,
                height: 48,
                mr: 2
              }}
            >
              <PeopleIcon />
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
                User Management
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Manage all users, roles, and permissions in the system
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669, #10b981)',
              }
            }}
          >
            Add New User
          </Button>
        </Box>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* User Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon />}
            color="#6366f1"
            trend="up"
            trendValue="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<ActiveIcon />}
            color="#10b981"
            trend="up"
            trendValue="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="Students"
            value={stats.totalStudents}
            icon={<SchoolIcon />}
            color="#3b82f6"
            trend="up"
            trendValue="+15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="Teachers"
            value={stats.totalTeachers}
            icon={<TeacherIcon />}
            color="#f59e0b"
            trend="up"
            trendValue="+5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="Admins"
            value={stats.totalAdmins}
            icon={<AdminIcon />}
            color="#ef4444"
            trend="neutral"
            trendValue="0%"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={2}>
          <StatsCard
            title="New This Month"
            value={stats.newUsersThisMonth}
            icon={<CalendarIcon />}
            color="#ec4899"
            trend="up"
            trendValue="+25%"
          />
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="student">Student</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredUsers.length} of {stats.totalUsers} users
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            background: `linear-gradient(135deg, ${user.role === 'admin' ? '#ef4444, #f87171' : user.role === 'teacher' ? '#f59e0b, #fbbf24' : '#3b82f6, #60a5fa'})`,
                            width: 40,
                            height: 40,
                            fontWeight: 600
                          }}
                        >
                          {(user.first_name || '').charAt(0)}{(user.last_name || '').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.first_name} {user.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        size="small"
                        color={getRoleColor(user.role) as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.department || 'Not specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.is_active ? 'success' : 'default'}
                        icon={user.is_active ? <ActiveIcon /> : <BlockIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, user)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Pagination
              count={Math.ceil(filteredUsers.length / rowsPerPage)}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* User Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedUserForMenu && handleEditUser(selectedUserForMenu)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit User</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedUserForMenu && handleToggleStatus(selectedUserForMenu)}>
          <ListItemIcon>
            {selectedUserForMenu?.is_active ? <BlockIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {selectedUserForMenu?.is_active ? 'Deactivate' : 'Activate'}
          </ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => selectedUserForMenu && handleDeleteUser(selectedUserForMenu)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete User</ListItemText>
        </MenuItem>
      </Menu>

      {/* User Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    defaultValue={selectedUser.first_name}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    defaultValue={selectedUser.last_name}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    defaultValue={selectedUser.email}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Role</InputLabel>
                    <Select defaultValue={selectedUser.role} label="Role">
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="teacher">Teacher</MenuItem>
                      <MenuItem value="student">Student</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select defaultValue={selectedUser.is_active ? 'active' : 'inactive'} label="Status">
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Department"
                    defaultValue={selectedUser.department}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage; 