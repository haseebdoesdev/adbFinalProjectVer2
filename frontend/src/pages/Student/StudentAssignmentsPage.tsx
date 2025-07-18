import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  AttachFile as AttachFileIcon,
  AccessTime as AccessTimeIcon,
  Done as DoneIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as studentService from '../../services/studentService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface ExtendedAssignment extends studentService.StudentAssignment {
  course_code?: string;
  course_name?: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`assignments-tabpanel-${index}`}
      aria-labelledby={`assignments-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [courses, setCourses] = useState<studentService.EnrolledCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch enrolled courses
        const coursesData = await studentService.getEnrolledCourses();
        setCourses(coursesData);

        // Fetch assignments for all courses
        const allAssignments: ExtendedAssignment[] = [];
        const failedCourses: string[] = [];
        
        for (const course of coursesData) {
          try {
            const courseAssignments = await studentService.getCourseAssignments(course._id);
            
            // Add course info to each assignment
            const assignmentsWithCourse = courseAssignments.map(assignment => ({
              ...assignment,
              course_code: course.course_code,
              course_name: course.course_name
            }));
            allAssignments.push(...assignmentsWithCourse);
          } catch (err: any) {
            console.error(`Error fetching assignments for course ${course.course_code}:`, err.response?.data?.message || err.message);
            failedCourses.push(course.course_code);
            // Don't fail completely, just log the error and continue
          }
        }
        
        setAssignments(allAssignments);
        
        // Set a warning message if some courses failed but we still have data
        if (failedCourses.length > 0) {
          setError(`Failed to load assignments for: ${failedCourses.join(', ')}`);
        }
      } catch (err: any) {
        console.error('Error fetching assignments data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch assignments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getAssignmentStatus = (assignment: ExtendedAssignment) => {
    if (assignment.submission_status === 'submitted' || assignment.submission_status === 'graded') {
      return { label: 'Submitted', color: 'success' as const, icon: <CheckCircleIcon /> };
    }
    
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    
    if (now > dueDate) {
      return { label: 'Overdue', color: 'error' as const, icon: <WarningIcon /> };
    }
    
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 3) {
      return { label: 'Due Soon', color: 'warning' as const, icon: <ScheduleIcon /> };
    }
    
    return { label: 'Pending', color: 'default' as const, icon: <PendingIcon /> };
  };

  const filterAssignments = (assignments: ExtendedAssignment[]) => {
    let filtered = assignments;
    
    // Filter by course if not 'all'
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(assignment => assignment.course_id === selectedCourse);
    }
    
    // Filter by tab
    if (tabValue === 1) { // Pending
      filtered = filtered.filter(assignment => 
        assignment.submission_status !== 'submitted' && assignment.submission_status !== 'graded'
      );
    } else if (tabValue === 2) { // Due Soon
      const now = new Date();
      filtered = filtered.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        const timeDiff = dueDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff <= 3 && daysDiff > 0 && assignment.submission_status !== 'submitted' && assignment.submission_status !== 'graded';
      });
    } else if (tabValue === 3) { // Submitted
      filtered = filtered.filter(assignment => 
        assignment.submission_status === 'submitted' || assignment.submission_status === 'graded'
      );
    } else if (tabValue === 4) { // Overdue
      const now = new Date();
      filtered = filtered.filter(assignment => {
        const dueDate = new Date(assignment.due_date);
        return now > dueDate && assignment.submission_status !== 'submitted' && assignment.submission_status !== 'graded';
      });
    }
    
    return filtered;
  };

  const getDueSoonAssignments = (assignments: ExtendedAssignment[]) => {
    const now = new Date();
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysDiff <= 3 && daysDiff > 0 && assignment.submission_status !== 'submitted' && assignment.submission_status !== 'graded';
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAssignmentClick = (assignment: ExtendedAssignment) => {
    navigate(`/student/assignments/${assignment._id}`, { 
      state: { assignment, courseCode: assignment.course_code, courseName: assignment.course_name } 
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading assignments..." />
      </Container>
    );
  }

  const filteredAssignments = filterAssignments(assignments);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          My Assignments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your assignments across all courses
        </Typography>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Course Filter */}
      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Course</InputLabel>
          <Select
            value={selectedCourse}
            label="Filter by Course"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">All Courses</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course._id} value={course._id}>
                {course.course_code} - {course.course_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="assignment tabs"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 'medium'
            }
          }}
        >
          <Tab 
            icon={<AssignmentIcon />}
            iconPosition="start"
            label={`All (${assignments.length})`} 
          />
          <Tab 
            icon={<PendingIcon />}
            iconPosition="start"
            label={`Pending (${assignments.filter(a => a.submission_status !== 'submitted' && a.submission_status !== 'graded').length})`} 
          />
          <Tab 
            icon={<AccessTimeIcon />}
            iconPosition="start"
            label={`Due Soon (${getDueSoonAssignments(assignments).length})`}
            sx={{ color: 'warning.main' }}
          />
          <Tab 
            icon={<DoneIcon />}
            iconPosition="start"
            label={`Submitted (${assignments.filter(a => a.submission_status === 'submitted' || a.submission_status === 'graded').length})`}
            sx={{ color: 'success.main' }} 
          />
          <Tab 
            icon={<ErrorIcon />}
            iconPosition="start"
            label={`Overdue (${assignments.filter(a => {
              const now = new Date();
              const dueDate = new Date(a.due_date);
              return now > dueDate && a.submission_status !== 'submitted' && a.submission_status !== 'graded';
            }).length})`}
            sx={{ color: 'error.main' }}
          />
        </Tabs>
      </Box>

      {/* Assignment List */}
      <TabPanel value={tabValue} index={tabValue}>
        {/* Show any specific error messages from failed course fetches */}
        {error && assignments.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Some assignments could not be loaded: {error}
          </Alert>
        )}
        
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <AssignmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No assignments found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {assignments.length === 0 ? (
                    courses.length === 0 ? 
                      'You are not enrolled in any courses yet.' :
                      'No assignments have been created for your courses yet.'
                  ) : (
                    tabValue === 1 ? 'You have no pending assignments.' :
                    tabValue === 2 ? 'You have no due soon assignments.' :
                    tabValue === 3 ? 'You have not submitted any assignments yet.' :
                    tabValue === 4 ? 'You have no overdue assignments.' :
                    'You have no assignments at this time.'
                  )}
                </Typography>
                {courses.length === 0 && (
                  <Box mt={2}>
                    <Button
                      component={RouterLink}
                      to="/student/courses/available"
                      variant="contained"
                      size="small"
                    >
                      Browse Available Courses
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              return (
                <Grid item xs={12} md={6} lg={4} key={assignment._id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) => theme.shadows[4]
                      }
                    }}
                    onClick={() => handleAssignmentClick(assignment)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {status.icon}
                        <Chip 
                          label={status.label} 
                          color={status.color}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="h6" gutterBottom noWrap>
                        {assignment.title}
                      </Typography>
                      
                      <Typography variant="body2" color="primary" gutterBottom>
                        {assignment.course_code} - {assignment.course_name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: '3em', overflow: 'hidden' }}>
                        {assignment.description || 'No description provided'}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Due: {formatDate(assignment.due_date)}
                          </Typography>
                          {tabValue === 2 && (() => { // Due Soon tab
                            const now = new Date();
                            const dueDate = new Date(assignment.due_date);
                            const timeDiff = dueDate.getTime() - now.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                            const hoursLeft = Math.ceil(timeDiff / (1000 * 3600));
                            
                            if (daysDiff === 1) {
                              return (
                                <Typography variant="caption" color="warning.main" fontWeight="bold" display="block">
                                  Due in {hoursLeft} hours
                                </Typography>
                              );
                            } else if (daysDiff <= 3) {
                              return (
                                <Typography variant="caption" color="warning.main" fontWeight="bold" display="block">
                                  Due in {daysDiff} days
                                </Typography>
                              );
                            }
                            return null;
                          })()}
                          <Typography variant="caption" color="text.secondary">
                            Points: {assignment.total_points}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                          {(assignment.attachments && assignment.attachments.length > 0) && (
                            <Chip
                              icon={<AttachFileIcon />}
                              label={`${assignment.attachments.length} file${assignment.attachments.length > 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          )}
                          <Chip 
                            label={assignment.assignment_type.replace('_', ' ').toUpperCase()}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      {assignment.score !== null && assignment.score !== undefined && (
                        <Box mt={2}>
                          <Typography variant="body2" color="success.main">
                            Score: {assignment.score}/{assignment.total_points}
                          </Typography>
                        </Box>
                      )}
                      
                      {assignment.submitted_attachments && assignment.submitted_attachments.length > 0 && (
                        <Box mt={1}>
                          <Chip
                            icon={<AttachFileIcon />}
                            label={`Submitted: ${assignment.submitted_attachments.length} file${assignment.submitted_attachments.length > 1 ? 's' : ''}`}
                            size="small"
                            color="success"
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabPanel>
    </Container>
  );
};

export default StudentAssignmentsPage; 