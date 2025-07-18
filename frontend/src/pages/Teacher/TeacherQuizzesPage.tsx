import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';
import { Course } from '../../types/course';
import * as teacherService from '../../services/teacherService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatsCard from '../../components/common/StatsCard';

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return 'Not set';
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

const TeacherQuizzesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [quizzes, setQuizzes] = useState<teacherService.Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<teacherService.Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    quiz_type: 'Practice',
    total_points: 100,
    time_limit: 60,
    start_date: '',
    due_date: '',
    is_published: true,
    questions: [] as any[]
  });
  const [editQuiz, setEditQuiz] = useState({
    title: '',
    description: '',
    quiz_type: 'Practice',
    total_points: 100,
    time_limit: 60,
    start_date: '',
    due_date: '',
    is_published: true,
    questions: [] as any[]
  });
  const [viewSubmissionsDialogOpen, setViewSubmissionsDialogOpen] = useState(false);
  const [quizSubmissions, setQuizSubmissions] = useState<teacherService.QuizSubmission[]>([]);

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const coursesData = await teacherService.getMyCourses();
        setCourses(coursesData);
        if (coursesData.length > 0) {
          setSelectedCourse(coursesData[0]._id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Fetch quizzes when course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchQuizzes();
    }
  }, [selectedCourse]);

  const fetchQuizzes = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      const quizzesData = await teacherService.getCourseQuizzes(selectedCourse);
      setQuizzes(quizzesData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedCourse) return;

    // Client-side validation
    if (!newQuiz.title.trim()) {
      setError('Quiz title is required');
      return;
    }
    
    if (!newQuiz.start_date || !newQuiz.due_date) {
      setError('Start date and due date are required');
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      const quizData = {
        ...newQuiz,
        title: newQuiz.title.trim(),
        description: newQuiz.description.trim(),
        questions: [] // Start with empty questions array
      };
      
      await teacherService.createQuiz(selectedCourse, quizData);
      setCreateDialogOpen(false);
      setNewQuiz({
        title: '',
        description: '',
        quiz_type: 'Practice',
        total_points: 100,
        time_limit: 60,
        start_date: '',
        due_date: '',
        is_published: true,
        questions: []
      });
      await fetchQuizzes(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to create quiz:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create quiz');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditQuiz = (quiz: teacherService.Quiz) => {
    // Helper function to format date for datetime-local input
    const formatDateForInput = (dateString: string): string => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        // Format as YYYY-MM-DDTHH:MM for datetime-local input
        return date.toISOString().slice(0, 16);
      } catch (error) {
        return '';
      }
    };

    setSelectedQuiz(quiz);
    setEditQuiz({
      title: quiz.title,
      description: quiz.description,
      quiz_type: 'Practice', // Default since it's not in the interface
      total_points: quiz.total_points || 100,
      time_limit: quiz.time_limit,
      start_date: formatDateForInput(quiz.start_date),
      due_date: formatDateForInput(quiz.end_date),
      is_published: quiz.is_published,
      questions: quiz.questions
    });
    setEditDialogOpen(true);
  };

  const handleDeleteQuiz = async (quiz: teacherService.Quiz) => {
    if (!window.confirm(`Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await teacherService.deleteQuiz(quiz._id);
      await fetchQuizzes(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete quiz');
    }
  };

  const handleViewSubmissions = async (quiz: teacherService.Quiz) => {
    try {
      setError(null);
      setSelectedQuiz(quiz);
      const submissions = await teacherService.getQuizSubmissions(quiz._id);
      setQuizSubmissions(submissions);
      setViewSubmissionsDialogOpen(true);
    } catch (err: any) {
      console.error('Failed to fetch quiz submissions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch quiz submissions');
    }
  };

  const handleUpdateQuiz = async () => {
    if (!selectedQuiz) return;

    // Client-side validation
    if (!editQuiz.title.trim()) {
      setError('Quiz title is required');
      return;
    }
    
    if (!editQuiz.start_date || !editQuiz.due_date) {
      setError('Start date and due date are required');
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      const quizData = {
        title: editQuiz.title.trim(),
        description: editQuiz.description.trim(),
        quiz_type: editQuiz.quiz_type,
        total_points: editQuiz.total_points,
        time_limit: editQuiz.time_limit,
        start_date: editQuiz.start_date,
        due_date: editQuiz.due_date,
        is_published: editQuiz.is_published,
        questions: editQuiz.questions
      };
      
      await teacherService.updateQuiz(selectedQuiz._id, quizData);
      setEditDialogOpen(false);
      setSelectedQuiz(null);
      await fetchQuizzes(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update quiz:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update quiz');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  const getQuizTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'practice': return 'primary';
      case 'exam': return 'error';
      case 'assessment': return 'warning';
      default: return 'default';
    }
  };

  const getTotalStats = () => {
    return {
      total_quizzes: quizzes.length,
      published_quizzes: quizzes.filter(q => q.is_published).length,
      avg_questions: quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.questions.length, 0) / quizzes.length) : 0,
      avg_time_limit: quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.time_limit, 0) / quizzes.length) : 0
    };
  };

  const stats = getTotalStats();

  if (isLoading && courses.length === 0) {
    return <LoadingSpinner variant="page" message="Loading courses..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                width: 48,
                height: 48,
                mr: 2
              }}
            >
              <QuizIcon />
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
                Quiz Management
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Create and manage quizzes for your courses
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedCourse}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Create Quiz
          </Button>
        </Box>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Course Selection and Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourse}
              label="Select Course"
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.course_code} - {course.course_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Total Quizzes"
            value={stats.total_quizzes}
            icon={<QuizIcon />}
            color="#3b82f6"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Published"
            value={stats.published_quizzes}
            icon={<PeopleIcon />}
            color="#10b981"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Avg Questions"
            value={stats.avg_questions}
            icon={<QuestionIcon />}
            color="#f59e0b"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Avg Time (min)"
            value={stats.avg_time_limit}
            icon={<TimerIcon />}
            color="#ec4899"
          />
        </Grid>
      </Grid>

      {/* Quizzes Table */}
      {selectedCourse && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            {quizzes.length === 0 ? (
              <Box textAlign="center" py={8}>
                <QuizIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 3 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No quizzes created yet
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Create your first quiz for {selectedCourseData?.course_name}
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Create Quiz
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Quiz</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Questions</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Time Limit</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quizzes.map((quiz) => (
                      <TableRow key={quiz._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {quiz.title}
                            </Typography>
                            {quiz.description && (
                              <Typography variant="caption" color="text.secondary">
                                {quiz.description.length > 50 
                                  ? quiz.description.substring(0, 50) + '...'
                                  : quiz.description
                                }
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            badgeContent={quiz.questions.length}
                            color="primary"
                          >
                            <QuestionIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>{quiz.time_limit} min</TableCell>
                        <TableCell>
                          {formatDate(quiz.start_date)}
                        </TableCell>
                        <TableCell>
                          {formatDate(quiz.end_date)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={quiz.is_published ? 'Published' : 'Draft'}
                            color={quiz.is_published ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Results">
                              <IconButton size="small" color="primary" onClick={() => handleViewSubmissions(quiz)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Quiz">
                              <IconButton size="small" color="secondary" onClick={() => handleEditQuiz(quiz)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Quiz">
                              <IconButton size="small" color="error" onClick={() => handleDeleteQuiz(quiz)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Quiz Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Quiz</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Quiz Title"
              value={newQuiz.title}
              onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={newQuiz.description}
              onChange={(e) => setNewQuiz({...newQuiz, description: e.target.value})}
              fullWidth
              multiline
              rows={3}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Total Points"
                  type="number"
                  value={newQuiz.total_points}
                  onChange={(e) => setNewQuiz({...newQuiz, total_points: Number(e.target.value)})}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Time Limit (minutes)"
                  type="number"
                  value={newQuiz.time_limit}
                  onChange={(e) => setNewQuiz({...newQuiz, time_limit: Number(e.target.value)})}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={newQuiz.start_date}
                  onChange={(e) => setNewQuiz({...newQuiz, start_date: e.target.value})}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Due Date"
                  type="datetime-local"
                  value={newQuiz.due_date}
                  onChange={(e) => setNewQuiz({...newQuiz, due_date: e.target.value})}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={newQuiz.is_published}
                  onChange={(e) => setNewQuiz({...newQuiz, is_published: e.target.checked})}
                />
              }
              label="Publish immediately"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateQuiz}
            variant="contained"
            disabled={!newQuiz.title || !newQuiz.start_date || !newQuiz.due_date || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Quiz'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Quiz Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Quiz</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Quiz Title"
              value={editQuiz.title}
              onChange={(e) => setEditQuiz({...editQuiz, title: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={editQuiz.description}
              onChange={(e) => setEditQuiz({...editQuiz, description: e.target.value})}
              fullWidth
              multiline
              rows={3}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Total Points"
                  type="number"
                  value={editQuiz.total_points}
                  onChange={(e) => setEditQuiz({...editQuiz, total_points: Number(e.target.value)})}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Time Limit (minutes)"
                  type="number"
                  value={editQuiz.time_limit}
                  onChange={(e) => setEditQuiz({...editQuiz, time_limit: Number(e.target.value)})}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  value={editQuiz.start_date}
                  onChange={(e) => setEditQuiz({...editQuiz, start_date: e.target.value})}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Due Date"
                  type="datetime-local"
                  value={editQuiz.due_date}
                  onChange={(e) => setEditQuiz({...editQuiz, due_date: e.target.value})}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <FormControlLabel
              control={
                <Switch 
                  checked={editQuiz.is_published}
                  onChange={(e) => setEditQuiz({...editQuiz, is_published: e.target.checked})}
                />
              }
              label="Published"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateQuiz}
            variant="contained"
            disabled={!editQuiz.title || !editQuiz.start_date || !editQuiz.due_date || isCreating}
          >
            {isCreating ? 'Updating...' : 'Update Quiz'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog 
        open={viewSubmissionsDialogOpen} 
        onClose={() => setViewSubmissionsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Quiz Submissions: {selectedQuiz?.title}
        </DialogTitle>
        <DialogContent>
          {quizSubmissions.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No submissions found for this quiz.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Submission Date</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Time Taken</TableCell>
                    <TableCell>Attempt</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizSubmissions.map((submission) => (
                    <TableRow key={submission._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {submission.student.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {submission.student.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{submission.student.student_id_str}</TableCell>
                      <TableCell>{formatDate(submission.submission_date)}</TableCell>
                      <TableCell>
                        {submission.score !== undefined ? (
                          <Chip
                            label={`${submission.score}/${selectedQuiz?.total_points || 100}`}
                            color={submission.score >= (selectedQuiz?.total_points || 100) * 0.7 ? 'success' : 'default'}
                            size="small"
                          />
                        ) : (
                          <Chip label="Not graded" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{submission.time_taken} min</TableCell>
                      <TableCell>{submission.attempt_number}</TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status}
                          color={submission.status === 'completed' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewSubmissionsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherQuizzesPage; 