import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Course } from '../../types/course';
import { User } from '../../types/user';
import * as courseService from '../../services/courseService';
import { handleApiError } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

interface AssignTeacherFormProps {
  course: Course;
  teachers: User[];
  onClose: (refresh?: boolean) => void;
}

const AssignTeacherForm: React.FC<AssignTeacherFormProps> = ({ 
  course, 
  teachers, 
  onClose 
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    course.teacher_id || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTeacher = teachers.find(t => t._id === course.teacher_id);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    setError(null);

    try {
      if (selectedTeacherId) {
        await courseService.assignTeacherToCourse(course._id, selectedTeacherId);
      } else {
        // If no teacher selected, we could call an unassign endpoint
        // For now, we'll assign to empty/null which the backend should handle
        await courseService.assignTeacherToCourse(course._id, '');
      }
      
      onClose(true); // Close with refresh
    } catch (err: any) {
      console.error('Error assigning teacher:', err);
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  const selectedTeacher = teachers.find(t => t._id === selectedTeacherId);

  return (
    <Dialog open={true} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        Assign Teacher to Course
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box mb={2}>
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </Box>

          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Course Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Code:</strong> {course.course_code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {course.course_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Department:</strong> {course.department}
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Current Assignment
            </Typography>
            {currentTeacher ? (
              <Alert severity="info">
                Currently assigned to: <strong>{currentTeacher.username}</strong> 
                ({currentTeacher.first_name} {currentTeacher.last_name})
              </Alert>
            ) : (
              <Alert severity="warning">
                No teacher currently assigned to this course
              </Alert>
            )}
          </Box>

          <FormControl fullWidth required>
            <InputLabel>Select Teacher</InputLabel>
            <Select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              label="Select Teacher"
            >
              <MenuItem value="">
                <em>Unassign Teacher</em>
              </MenuItem>
              {teachers.map(teacher => (
                <MenuItem key={teacher._id} value={teacher._id}>
                  {teacher.username} - {teacher.first_name} {teacher.last_name}
                  {teacher.department && ` (${teacher.department})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTeacher && selectedTeacher._id !== course.teacher_id && (
            <Box mt={2}>
              <Alert severity="success">
                Will assign to: <strong>{selectedTeacher.username}</strong> 
                ({selectedTeacher.first_name} {selectedTeacher.last_name})
              </Alert>
            </Box>
          )}

          {!selectedTeacherId && course.teacher_id && (
            <Box mt={2}>
              <Alert severity="warning">
                This will unassign the current teacher from the course
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading || selectedTeacherId === course.teacher_id}
            startIcon={isLoading ? <LoadingSpinner size={16} /> : null}
          >
            {isLoading 
              ? 'Assigning...' 
              : selectedTeacherId 
                ? 'Assign Teacher' 
                : 'Unassign Teacher'
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignTeacherForm; 