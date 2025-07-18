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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';
import * as studentService from '../../services/studentService';

const StudentAvailableCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<studentService.AvailableCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<studentService.AvailableCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  // Get unique departments and semesters for filtering
  const departments = Array.from(new Set(courses.map(course => course.department))).sort();
  const semesters = Array.from(new Set(courses.map(course => `${course.semester} ${course.year}`))).sort();

  const fetchAvailableCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This endpoint should return courses the student can enroll in
      const response = await studentService.getAvailableCourses();
      setCourses(response);
      setFilteredCourses(response);
    } catch (err: any) {
      console.error('Error fetching available courses:', err);
      setError(err.message || 'Failed to fetch available courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  // Filter courses based on search and filters
  useEffect(() => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(course => course.department === selectedDepartment);
    }

    if (selectedSemester) {
      filtered = filtered.filter(course => 
        `${course.semester} ${course.year}` === selectedSemester
      );
    }

    setFilteredCourses(filtered);
  }, [courses, searchTerm, selectedDepartment, selectedSemester]);

  const handleEnrollInCourse = async (courseId: string, courseName: string) => {
    if (!user) return;
    
    setEnrollingCourseId(courseId);
    setError(null);
    setSuccessMessage(null);

    try {
      await studentService.enrollInCourse(courseId);
      setSuccessMessage(`Successfully enrolled in ${courseName}!`);
      // Refresh the available courses list
      await fetchAvailableCourses();
    } catch (err: any) {
      console.error('Error enrolling in course:', err);
      setError(err.message || 'Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const getAvailabilityStatus = (course: studentService.AvailableCourse) => {
    const spotsLeft = course.max_capacity - course.current_enrollment;
    if (spotsLeft <= 0) return { color: 'error' as const, text: 'Full' };
    if (spotsLeft <= 5) return { color: 'warning' as const, text: `${spotsLeft} spots left` };
    return { color: 'success' as const, text: `${spotsLeft} spots available` };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedSemester('');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading available courses..." />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Available Courses
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse and enroll in courses that fit your academic interests and schedule.
      </Typography>

      <ErrorAlert error={error} onClose={() => setError(null)} />
      
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Filters */}
      <Box mb={4}>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex={1} minWidth="300px">
            <TextField
              fullWidth
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Department"
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Semester</InputLabel>
            <Select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              label="Semester"
            >
              <MenuItem value="">All Semesters</MenuItem>
              {semesters.map(sem => (
                <MenuItem key={sem} value={sem}>{sem}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{ minWidth: 100 }}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Course List */}
      {filteredCourses.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No courses found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {courses.length === 0 
              ? "There are no available courses at the moment."
              : "Try adjusting your search criteria to find courses."
            }
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={3}>
          {filteredCourses.map(course => {
            const availability = getAvailabilityStatus(course);
            const isEnrolling = enrollingCourseId === course._id;
            const isFull = course.current_enrollment >= course.max_capacity;
            
            return (
              <Box key={course._id} sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' } }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {course.course_code}
                      </Typography>
                      <Chip
                        label={availability.text}
                        color={availability.color}
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
                    
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <SchoolIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {course.department} • {course.credits} credit{course.credits !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {course.teacher_info?.name || 'TBA'}
                      </Typography>
                    </Box>
                    
                    {course.schedule_info && (
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {course.schedule_info}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box mt={2}>
                      <Chip
                        label={`${course.semester} ${course.year}`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleEnrollInCourse(course._id, course.course_name)}
                      disabled={isEnrolling || isFull}
                      startIcon={isEnrolling ? <CircularProgress size={20} /> : null}
                    >
                      {isEnrolling 
                        ? 'Enrolling...' 
                        : isFull 
                          ? 'Course Full' 
                          : 'Enroll'
                      }
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default StudentAvailableCoursesPage; 