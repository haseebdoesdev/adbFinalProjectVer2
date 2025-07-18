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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  ExitToApp as ExitIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as studentService from '../../services/studentService';

const StudentMyCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<studentService.EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [droppingCourseId, setDroppingCourseId] = useState<string | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [courseToDropName, setCourseToDropName] = useState('');

  const fetchMyCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await studentService.getEnrolledCourses();
      setCourses(response);
    } catch (err: any) {
      console.error('Error fetching enrolled courses:', err);
      setError(err.message || 'Failed to fetch enrolled courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const handleDropCourse = async (courseId: string, courseName: string) => {
    setCourseToDropName(courseName);
    setDroppingCourseId(courseId);
    setDropConfirmOpen(true);
  };

  const confirmDropCourse = async () => {
    if (!droppingCourseId) return;
    
    setError(null);
    setSuccessMessage(null);

    try {
      await studentService.dropCourse(droppingCourseId);
      setSuccessMessage(`Successfully dropped ${courseToDropName}!`);
      await fetchMyCourses(); // Refresh the courses list
    } catch (err: any) {
      console.error('Error dropping course:', err);
      setError(err.message || 'Failed to drop course');
    } finally {
      setDropConfirmOpen(false);
      setDroppingCourseId(null);
      setCourseToDropName('');
    }
  };

  const cancelDropCourse = () => {
    setDropConfirmOpen(false);
    setDroppingCourseId(null);
    setCourseToDropName('');
  };

  const getTotalCredits = () => {
    return courses.reduce((total, course) => total + course.credits, 0);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading your courses..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Courses
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" color="primary">
            Total Credits: {getTotalCredits()}
          </Typography>
        </Paper>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />
      
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {courses.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No enrolled courses
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You haven't enrolled in any courses yet. Browse available courses to get started.
          </Typography>
          <Button variant="contained" href="/student/courses/available">
            Browse Available Courses
          </Button>
        </Box>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={3}>
          {courses.map(course => (
            <Box key={course._id} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)' } }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {course.course_code}
                    </Typography>
                    <Chip
                      label={`${course.semester} ${course.year}`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>
                    {course.course_name}
                  </Typography>
                  
                  {course.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {course.description}
                    </Typography>
                  )}
                  
                  <List dense>
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <SchoolIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${course.department} • ${course.credits} credit${course.credits !== 1 ? 's' : ''}`}
                      />
                    </ListItem>
                    
                    <ListItem disablePadding>
                      <ListItemIcon>
                        <PersonIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={course.teacher_info?.name || 'TBA'}
                        secondary="Instructor"
                      />
                    </ListItem>
                    
                    {course.schedule_info && (
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <ScheduleIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={course.schedule_info}
                          secondary="Schedule"
                        />
                      </ListItem>
                    )}
                    
                    {course.assignments && course.assignments.length > 0 && (
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <AssignmentIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${course.assignments.length} assignment${course.assignments.length !== 1 ? 's' : ''}`}
                        />
                      </ListItem>
                    )}
                    
                    {course.quizzes && course.quizzes.length > 0 && (
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <QuizIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${course.quizzes.length} quiz${course.quizzes.length !== 1 ? 'zes' : ''}`}
                        />
                      </ListItem>
                    )}
                  </List>
                  
                  <Box mt={2}>
                    <Chip
                      label={`${course.current_enrollment}/${course.max_capacity} enrolled`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<ExitIcon />}
                    onClick={() => handleDropCourse(course._id, course.course_name)}
                  >
                    Drop Course
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Drop Course Confirmation Dialog */}
      <Dialog
        open={dropConfirmOpen}
        onClose={cancelDropCourse}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Drop Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to drop <strong>{courseToDropName}</strong>? 
            This action cannot be undone and you may lose access to course materials 
            and assignments.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDropCourse}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDropCourse} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Drop Course
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentMyCoursesPage; 