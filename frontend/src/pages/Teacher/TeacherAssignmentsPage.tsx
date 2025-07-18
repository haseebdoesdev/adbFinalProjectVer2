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
  Badge
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Grade as GradeIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { Course } from '../../types/course';
import * as teacherService from '../../services/teacherService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatsCard from '../../components/common/StatsCard';

const TeacherAssignmentsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [assignments, setAssignments] = useState<teacherService.Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<teacherService.Assignment | null>(null);
  const [submissions, setSubmissions] = useState<teacherService.AssignmentSubmission[]>([]);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<teacherService.AssignmentSubmission | null>(null);
  const [gradingData, setGradingData] = useState({
    score: '',
    feedback: ''
  });
  const [isGrading, setIsGrading] = useState(false);
  const [editAssignment, setEditAssignment] = useState({
    title: '',
    description: '',
    assignment_type: 'Homework',
    total_points: 100,
    due_date: '',
    instructions: ''
  });
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    assignment_type: 'Homework',
    total_points: 100,
    due_date: '',
    instructions: ''
  });

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

  // Fetch assignments when course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchAssignments();
    }
  }, [selectedCourse]);

  const fetchAssignments = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      const assignmentsData = await teacherService.getCourseAssignments(selectedCourse);
      setAssignments(assignmentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedCourse) return;

    // Client-side validation
    if (!newAssignment.title.trim()) {
      setError('Assignment title is required');
      return;
    }
    
    if (!newAssignment.due_date) {
      setError('Due date is required');
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      const assignmentData = {
        ...newAssignment,
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim(),
        instructions: newAssignment.instructions.trim()
      };
      
      await teacherService.createAssignment(selectedCourse, assignmentData);
      setCreateDialogOpen(false);
      setNewAssignment({
        title: '',
        description: '',
        assignment_type: 'Homework',
        total_points: 100,
        due_date: '',
        instructions: ''
      });
      await fetchAssignments(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to create assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create assignment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewSubmissions = async (assignment: teacherService.Assignment) => {
    try {
      setSelectedAssignment(assignment);
      setIsLoading(true);
      const submissionsData = await teacherService.getAssignmentSubmissions(assignment._id);
      setSubmissions(submissionsData);
      setSubmissionsDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAssignment = (assignment: teacherService.Assignment) => {
    setSelectedAssignment(assignment);
    setEditAssignment({
      title: assignment.title,
      description: assignment.description,
      assignment_type: assignment.assignment_type,
      total_points: assignment.total_points,
      due_date: assignment.due_date.slice(0, 16), // Format for datetime-local input
      instructions: assignment.instructions
    });
    setEditDialogOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    // Client-side validation
    if (!editAssignment.title.trim()) {
      setError('Assignment title is required');
      return;
    }
    
    if (!editAssignment.due_date) {
      setError('Due date is required');
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      const assignmentData = {
        ...editAssignment,
        title: editAssignment.title.trim(),
        description: editAssignment.description.trim(),
        instructions: editAssignment.instructions.trim()
      };
      
      await teacherService.updateAssignment(selectedAssignment._id, assignmentData);
      setEditDialogOpen(false);
      await fetchAssignments(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update assignment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignment: teacherService.Assignment) => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      try {
        await teacherService.deleteAssignment(assignment._id);
        await fetchAssignments(); // Refresh the list
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete assignment');
      }
    }
  };

  const handleOpenGradingDialog = (submission: teacherService.AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setGradingData({
      score: submission.score?.toString() || '',
      feedback: submission.feedback || ''
    });
    setGradingDialogOpen(true);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !selectedAssignment) return;

    // Client-side validation
    const score = parseFloat(gradingData.score);
    if (isNaN(score) || score < 0 || score > selectedAssignment.total_points) {
      setError(`Score must be between 0 and ${selectedAssignment.total_points}`);
      return;
    }

    try {
      setError(null);
      setIsGrading(true);
      
      await teacherService.gradeAssignmentSubmission(
        selectedSubmission._id,
        score,
        gradingData.feedback
      );

      // Update the submission in the local state
      setSubmissions(prev => prev.map(sub => 
        sub._id === selectedSubmission._id 
          ? { 
              ...sub, 
              score: score, 
              feedback: gradingData.feedback, 
              status: 'graded',
              graded_date: new Date().toISOString()
            }
          : sub
      ));

      // Refresh assignments to update stats
      await fetchAssignments();

      setGradingDialogOpen(false);
      setGradingData({ score: '', feedback: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to grade submission');
    } finally {
      setIsGrading(false);
    }
  };

  // Handle keyboard shortcuts for grading dialog
  const handleGradingKeyPress = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter' && gradingData.score && !isGrading) {
      event.preventDefault();
      handleGradeSubmission();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setGradingDialogOpen(false);
    }
  };

  const handleBulkGradeSubmissions = async () => {
    // TODO: Implement bulk grading functionality
    console.log('Bulk grading not yet implemented');
  };

  const selectedCourseData = courses.find(c => c._id === selectedCourse);

  const getAssignmentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'homework': return 'primary';
      case 'project': return 'secondary';
      case 'exam': return 'error';
      case 'quiz': return 'warning';
      default: return 'default';
    }
  };

  const getTotalStats = () => {
    return {
      total_assignments: assignments.length,
      total_submissions: assignments.reduce((sum, a) => sum + (a.submission_stats?.total_submissions || 0), 0),
      pending_grading: assignments.reduce((sum, a) => sum + (a.submission_stats?.pending_grading || 0), 0),
      avg_points: assignments.length > 0 ? Math.round(assignments.reduce((sum, a) => sum + a.total_points, 0) / assignments.length) : 0
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
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                width: 48,
                height: 48,
                mr: 2
              }}
            >
              <AssignmentIcon />
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
                Assignment Management
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Create and manage assignments for your courses
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
            Create Assignment
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
            title="Total Assignments"
            value={stats.total_assignments}
            icon={<AssignmentIcon />}
            color="#6366f1"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Total Submissions"
            value={stats.total_submissions}
            icon={<PeopleIcon />}
            color="#10b981"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Pending Grading"
            value={stats.pending_grading}
            icon={<GradeIcon />}
            color="#f59e0b"
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <StatsCard
            title="Avg Points"
            value={stats.avg_points}
            icon={<ScheduleIcon />}
            color="#ec4899"
          />
        </Grid>
      </Grid>

      {/* Assignments Table */}
      {selectedCourse && (
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            {assignments.length === 0 ? (
              <Box textAlign="center" py={8}>
                <AssignmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 3 }} />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  No assignments created yet
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Create your first assignment for {selectedCourseData?.course_name}
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Create Assignment
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Assignment</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Submissions</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grading</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {assignment.title}
                            </Typography>
                            {assignment.description && (
                              <Typography variant="caption" color="text.secondary">
                                {assignment.description.length > 50 
                                  ? assignment.description.substring(0, 50) + '...'
                                  : assignment.description
                                }
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={assignment.assignment_type}
                            color={getAssignmentTypeColor(assignment.assignment_type) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{assignment.total_points}</TableCell>
                        <TableCell>
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            badgeContent={assignment.submission_stats?.total_submissions || 0}
                            color="primary"
                          >
                            <PeopleIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            badgeContent={assignment.submission_stats?.pending_grading || 0}
                            color="error"
                          >
                            <GradeIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Submissions">
                              <IconButton size="small" color="primary" onClick={() => handleViewSubmissions(assignment)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Assignment">
                              <IconButton size="small" color="secondary" onClick={() => handleEditAssignment(assignment)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Assignment">
                              <IconButton size="small" color="error" onClick={() => handleDeleteAssignment(assignment)}>
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

      {/* Create Assignment Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Assignment Title"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Assignment Type</InputLabel>
              <Select
                value={newAssignment.assignment_type}
                label="Assignment Type"
                onChange={(e) => setNewAssignment({...newAssignment, assignment_type: e.target.value})}
              >
                <MenuItem value="Homework">Homework</MenuItem>
                <MenuItem value="Project">Project</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Total Points"
              type="number"
              value={newAssignment.total_points}
              onChange={(e) => setNewAssignment({...newAssignment, total_points: Number(e.target.value)})}
              fullWidth
              required
            />
            
            <TextField
              label="Due Date"
              type="datetime-local"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Instructions"
              value={newAssignment.instructions}
              onChange={(e) => setNewAssignment({...newAssignment, instructions: e.target.value})}
              fullWidth
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateAssignment}
            variant="contained"
            disabled={!newAssignment.title || !newAssignment.due_date || isCreating}
            startIcon={isCreating ? undefined : undefined}
          >
            {isCreating ? 'Creating...' : 'Create Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Assignment Title"
              value={editAssignment.title}
              onChange={(e) => setEditAssignment({...editAssignment, title: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={editAssignment.description}
              onChange={(e) => setEditAssignment({...editAssignment, description: e.target.value})}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Assignment Type</InputLabel>
              <Select
                value={editAssignment.assignment_type}
                label="Assignment Type"
                onChange={(e) => setEditAssignment({...editAssignment, assignment_type: e.target.value})}
              >
                <MenuItem value="Homework">Homework</MenuItem>
                <MenuItem value="Project">Project</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Total Points"
              type="number"
              value={editAssignment.total_points}
              onChange={(e) => setEditAssignment({...editAssignment, total_points: Number(e.target.value)})}
              fullWidth
              required
            />
            
            <TextField
              label="Due Date"
              type="datetime-local"
              value={editAssignment.due_date}
              onChange={(e) => setEditAssignment({...editAssignment, due_date: e.target.value})}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Instructions"
              value={editAssignment.instructions}
              onChange={(e) => setEditAssignment({...editAssignment, instructions: e.target.value})}
              fullWidth
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateAssignment}
            variant="contained"
            disabled={!editAssignment.title || !editAssignment.due_date || isCreating}
          >
            {isCreating ? 'Updating...' : 'Update Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog 
        open={submissionsDialogOpen} 
        onClose={() => setSubmissionsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Assignment Submissions - {selectedAssignment?.title}
        </DialogTitle>
        <DialogContent>
          {submissions.length === 0 ? (
            <Box textAlign="center" py={4}>
              <PeopleIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No submissions yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students haven't submitted their work for this assignment yet.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Submissions Summary */}
              <Card variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
                <Grid container spacing={3}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="primary">
                        {submissions.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Submissions
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="success.main">
                        {submissions.filter(s => s.status === 'graded').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Graded
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="warning.main">
                        {submissions.filter(s => s.status !== 'graded').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="info.main">
                        {submissions.filter(s => s.score !== undefined).length > 0 ? 
                          Math.round(submissions.filter(s => s.score !== undefined)
                            .reduce((sum, s) => sum + (s.score || 0), 0) / 
                            submissions.filter(s => s.score !== undefined).length) 
                          : '--'
                        }%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Score
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Card>

              {/* Bulk Actions */}
              <Box sx={{ mb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={handleBulkGradeSubmissions}
                  startIcon={<GradeIcon />}
                  disabled={submissions.filter(s => s.status !== 'graded').length === 0}
                >
                  Bulk Grade ({submissions.filter(s => s.status !== 'graded').length} pending)
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Submitted</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                              {submission.student.name.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {submission.student.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {submission.student.student_id_str} • {submission.student.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {new Date(submission.submission_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(submission.submission_date).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {submission.score !== undefined ? (
                            <Box>
                              <Chip 
                                label={`${submission.score}/${selectedAssignment?.total_points}`}
                                color="success"
                                size="small"
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {Math.round((submission.score / (selectedAssignment?.total_points || 100)) * 100)}%
                              </Typography>
                            </Box>
                          ) : (
                            <Chip 
                              label="Not graded"
                              color="warning"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={submission.status === 'graded' ? 'Graded' : 'Submitted'}
                            color={submission.status === 'graded' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleOpenGradingDialog(submission)}
                              startIcon={<GradeIcon />}
                            >
                              {submission.score !== undefined ? 'Edit Grade' : 'Grade'}
                            </Button>
                            <Button 
                              size="small" 
                              variant="text"
                              onClick={() => handleOpenGradingDialog(submission)}
                              startIcon={<ViewIcon />}
                            >
                              View
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog 
        open={gradingDialogOpen} 
        onClose={() => setGradingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Grade Submission - {selectedSubmission?.student.name}
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              {/* Student Information */}
              <Card variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>Student Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{selectedSubmission.student.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Student ID</Typography>
                    <Typography variant="body1">{selectedSubmission.student.student_id_str}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1">{selectedSubmission.student.email}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Submitted</Typography>
                    <Typography variant="body1">
                      {new Date(selectedSubmission.submission_date).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Assignment Content */}
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Submission Content</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>Content</Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50', 
                    borderRadius: 1, 
                    maxHeight: 200, 
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                >
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedSubmission.content || 'No text content provided'}
                  </Typography>
                </Box>

                {/* Attachments */}
                {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Attachments ({selectedSubmission.attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedSubmission.attachments.map((attachment, index) => (
                        <Chip 
                          key={index}
                          label={attachment.split('/').pop() || `Attachment ${index + 1}`}
                          size="small"
                          variant="outlined"
                          onClick={() => window.open(`/api/student/uploads/assignments/${attachment.split('/').pop()}`, '_blank')}
                          clickable
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>

              {/* Grading Section */}
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Grading</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label={`Score (out of ${selectedAssignment?.total_points || 100})`}
                      type="number"
                      value={gradingData.score}
                      onChange={(e) => setGradingData({...gradingData, score: e.target.value})}
                      fullWidth
                      required
                      inputProps={{ 
                        min: 0, 
                        max: selectedAssignment?.total_points || 100,
                        step: 0.5
                      }}
                      helperText={`Enter a score between 0 and ${selectedAssignment?.total_points || 100}`}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    {/* Score percentage display */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Percentage</Typography>
                      <Typography variant="h4" color="primary">
                        {gradingData.score && selectedAssignment ? 
                          `${Math.round((parseFloat(gradingData.score) / selectedAssignment.total_points) * 100)}%` 
                          : '--'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <TextField
                  label="Feedback (Optional)"
                  value={gradingData.feedback}
                  onChange={(e) => setGradingData({...gradingData, feedback: e.target.value})}
                  fullWidth
                  multiline
                  rows={4}
                  sx={{ mt: 2 }}
                  placeholder="Provide constructive feedback for the student..."
                />

                {/* Current Grade Display */}
                {selectedSubmission.score !== undefined && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="primary.dark">
                      Current Grade: {selectedSubmission.score}/{selectedAssignment?.total_points} 
                      ({Math.round((selectedSubmission.score / (selectedAssignment?.total_points || 100)) * 100)}%)
                    </Typography>
                    {selectedSubmission.feedback && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Previous Feedback: {selectedSubmission.feedback}
                      </Typography>
                    )}
                  </Box>
                )}
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setGradingDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGradeSubmission}
            variant="contained"
            disabled={!gradingData.score || isGrading}
            startIcon={isGrading ? undefined : <GradeIcon />}
          >
            {isGrading ? 'Grading...' : (selectedSubmission?.score !== undefined ? 'Update Grade' : 'Grade Submission')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherAssignmentsPage; 