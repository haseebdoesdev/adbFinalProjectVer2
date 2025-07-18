import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  Alert,
  Divider,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Send as SubmitIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Grade as GradeIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as studentService from '../../services/studentService';

interface LocationState {
  assignment?: studentService.StudentAssignment & {
    course_code?: string;
    course_name?: string;
  };
  courseCode?: string;
  courseName?: string;
}

interface UploadedFile {
  file: File;
  url: string;
  filename: string;
  size: number;
  uploading?: boolean;
  error?: string;
}

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [assignment, setAssignment] = useState<(studentService.StudentAssignment & {
    course_code?: string;
    course_name?: string;
  }) | null>(state?.assignment || null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!state?.assignment);
  const [error, setError] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useEffect(() => {
    if (!assignment && assignmentId) {
      // If we don't have assignment data from state, we'd need to fetch it
      // For now, we'll redirect back since the API doesn't have a single assignment endpoint
      navigate('/student/assignments');
    }
  }, [assignment, assignmentId, navigate]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOverdue = () => {
    if (!assignment) return false;
    return new Date() > new Date(assignment.due_date);
  };

  const canSubmit = () => {
    if (!assignment) return false;
    const submitted = assignment.submission_status === 'submitted' || assignment.submission_status === 'graded';
    return !submitted && (submissionContent.trim().length > 0 || attachments.length > 0);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Add file to list with uploading status
      const tempFile: UploadedFile = {
        file,
        url: '',
        filename: file.name,
        size: file.size,
        uploading: true
      };
      
      setAttachments(prev => [...prev, tempFile]);

      try {
        const response = await studentService.uploadAssignmentAttachment(file);
        
        // Update the file with uploaded URL
        setAttachments(prev => prev.map(f => 
          f.file === file ? {
            ...f,
            url: response.file_url,
            filename: response.filename,
            size: response.size,
            uploading: false
          } : f
        ));

      } catch (err: any) {
        console.error('File upload error:', err);
        
        // Update the file with error
        setAttachments(prev => prev.map(f => 
          f.file === file ? {
            ...f,
            uploading: false,
            error: err.message || 'Upload failed'
          } : f
        ));
      }
    }

    // Clear the input
    event.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!assignment || !assignmentId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get successfully uploaded attachment URLs
      const attachmentUrls = attachments
        .filter(att => att.url && !att.error)
        .map(att => att.url);

      await studentService.submitAssignment(assignmentId, {
        content: submissionContent,
        attachments: attachmentUrls
      });

      setSubmissionSuccess(true);
      setSubmitDialogOpen(false);
      
      // Update assignment status
      setAssignment(prev => prev ? {
        ...prev,
        submission_status: 'submitted',
        submission_date: new Date().toISOString(),
        submitted_attachments: attachmentUrls
      } : null);

    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChip = () => {
    if (!assignment) return null;

    if (assignment.submission_status === 'graded') {
      return <Chip label="Graded" color="success" icon={<CheckCircleIcon />} />;
    } else if (assignment.submission_status === 'submitted') {
      return <Chip label="Submitted" color="info" icon={<CheckCircleIcon />} />;
    } else if (isOverdue()) {
      return <Chip label="Overdue" color="error" icon={<WarningIcon />} />;
    } else {
      return <Chip label="Pending" color="default" icon={<ScheduleIcon />} />;
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading assignment..." />
      </Container>
    );
  }

  if (!assignment) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Assignment not found</Alert>
      </Container>
    );
  }

  const hasUploadingFiles = attachments.some(att => att.uploading);
  const hasFailedUploads = attachments.some(att => att.error);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/student/assignments')}
          sx={{ mb: 2 }}
        >
          Back to Assignments
        </Button>
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
          <Box flex={1}>
            <Typography variant="h4" component="h1">
              {assignment.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {state?.courseCode || assignment.course_code || 'Course'} - {state?.courseName || assignment.course_name || 'Course Name'}
            </Typography>
          </Box>
          {getStatusChip()}
        </Box>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {submissionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Assignment submitted successfully! Your instructor will review it soon.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Assignment Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assignment Details
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Due Date"
                    secondary={formatDate(assignment.due_date)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <GradeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Points"
                    secondary={assignment.total_points}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AssignmentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Assignment Type"
                    secondary={assignment.assignment_type.replace('_', ' ').toUpperCase()}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {assignment.description || 'No description provided for this assignment.'}
              </Typography>

              {assignment.instructions && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Instructions
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2">
                      {assignment.instructions}
                    </Typography>
                  </Paper>
                </>
              )}

              {/* Assignment Attachments */}
              {assignment.attachments && assignment.attachments.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Assignment Files
                  </Typography>
                  <List>
                    {assignment.attachments.map((attachment, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <FileIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={attachment.split('/').pop() || `Attachment ${index + 1}`}
                          secondary="Click to download"
                        />
                        <Button 
                          size="small" 
                          href={`/api/student${attachment}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>

          {/* Submission Section */}
          {assignment.submission_status !== 'submitted' && assignment.submission_status !== 'graded' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Submit Assignment
                </Typography>
                
                {isOverdue() && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This assignment is overdue. Late submissions may be penalized.
                  </Alert>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Your Submission"
                  placeholder="Enter your assignment content here..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                {/* File Upload Section */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Attachments (Optional)
                  </Typography>
                  
                  <input
                    accept="*/*"
                    style={{ display: 'none' }}
                    id="file-upload"
                    multiple
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      disabled={hasUploadingFiles}
                    >
                      Upload Files
                    </Button>
                  </label>
                  
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Maximum file size: 10MB per file
                  </Typography>
                </Box>

                {/* Uploaded Files List */}
                {attachments.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Uploaded Files:
                    </Typography>
                    <List>
                      {attachments.map((attachment, index) => (
                        <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                          <ListItemIcon>
                            <FileIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={attachment.filename}
                            secondary={
                              <Box>
                                <Typography variant="caption">
                                  {formatFileSize(attachment.size)}
                                </Typography>
                                {attachment.uploading && (
                                  <Box sx={{ mt: 1 }}>
                                    <LinearProgress />
                                    <Typography variant="caption" color="text.secondary">
                                      Uploading...
                                    </Typography>
                                  </Box>
                                )}
                                {attachment.error && (
                                  <Typography variant="caption" color="error" display="block">
                                    Error: {attachment.error}
                                  </Typography>
                                )}
                                {attachment.url && !attachment.error && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    Uploaded successfully
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <IconButton 
                            edge="end" 
                            onClick={() => handleRemoveAttachment(index)}
                            disabled={attachment.uploading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {hasFailedUploads && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Some files failed to upload. Please remove them and try again.
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SubmitIcon />}
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={!canSubmit() || hasUploadingFiles || hasFailedUploads}
                  size="large"
                >
                  Submit Assignment
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Submission Status */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Submission Status
              </Typography>
              
              <Box textAlign="center" py={2}>
                {getStatusChip()}
              </Box>

              {assignment.submission_date && (
                <Typography variant="body2" color="text.secondary" align="center">
                  Submitted on {formatDate(assignment.submission_date)}
                </Typography>
              )}

              {assignment.score !== null && assignment.score !== undefined && (
                <Box mt={2} textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {assignment.score}/{assignment.total_points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Score
                  </Typography>
                </Box>
              )}

              {assignment.feedback && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Instructor Feedback:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2">
                      {assignment.feedback}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Submitted Attachments */}
              {assignment.submitted_attachments && assignment.submitted_attachments.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Submitted Files:
                  </Typography>
                  <List dense>
                    {assignment.submitted_attachments.map((attachment, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <FileIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={attachment.split('/').pop() || `File ${index + 1}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assignment Info
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Created"
                    secondary={formatDate(assignment.created_date || assignment.due_date)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Course"
                    secondary={`${state?.courseCode || assignment.course_code || 'Course'} - ${state?.courseName || assignment.course_name || 'Course Name'}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit this assignment? Once submitted, you may not be able to make changes.
          </Typography>
          
          {attachments.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2">
                Files to be submitted ({attachments.filter(att => att.url && !att.error).length}):
              </Typography>
              <List dense>
                {attachments
                  .filter(att => att.url && !att.error)
                  .map((attachment, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon>
                        <FileIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.filename}
                        secondary={formatFileSize(attachment.size)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
          
          {isOverdue() && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This assignment is overdue. Late submissions may be penalized.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <SubmitIcon />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentAssignmentDetailPage; 