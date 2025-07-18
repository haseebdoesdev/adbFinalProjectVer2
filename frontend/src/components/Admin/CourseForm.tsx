import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { Course, CourseCreationPayload } from '../../types/course';
import { User } from '../../types/user';
import * as courseService from '../../services/courseService';
import { handleApiError } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

interface CourseFormProps {
  course: Course | null; // null for creating new course
    onClose: (refresh?: boolean) => void;
  teachers: User[];
}

interface FormData {
  course_code: string;
  course_name: string;
  description: string;
  teacher_id: string;
  credits: string;
  department: string;
  max_capacity: string;
  semester: string;
  year: string;
  schedule_info: string;
}

const initialFormData: FormData = {
        course_code: '',
        course_name: '',
        description: '',
  teacher_id: '',
  credits: '3',
        department: '',
  max_capacity: '30',
  semester: 'Fall',
  year: new Date().getFullYear().toString(),
  schedule_info: ''
    };

const CourseForm: React.FC<CourseFormProps> = ({ course, onClose, teachers }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  const isEditing = !!course;

    useEffect(() => {
        if (course) {
            setFormData({
                course_code: course.course_code,
                course_name: course.course_name,
                description: course.description || '',
        teacher_id: course.teacher_id || '',
        credits: course.credits.toString(),
                department: course.department,
        max_capacity: course.max_capacity.toString(),
                semester: course.semester,
        year: course.year.toString(),
        schedule_info: course.schedule_info || ''
            });
        }
    }, [course]);

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.course_code.trim()) {
      errors.course_code = 'Course code is required';
    }
    if (!formData.course_name.trim()) {
      errors.course_name = 'Course name is required';
    }
    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }
    
    const credits = parseInt(formData.credits);
    if (isNaN(credits) || credits < 1 || credits > 6) {
      errors.credits = 'Credits must be between 1 and 6';
    }
    
    const maxCapacity = parseInt(formData.max_capacity);
    if (isNaN(maxCapacity) || maxCapacity < 1) {
      errors.max_capacity = 'Max capacity must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

        setIsLoading(true);
        setError(null);

    try {
      const courseData: CourseCreationPayload = {
        course_code: formData.course_code.trim(),
        course_name: formData.course_name.trim(),
        description: formData.description.trim(),
        teacher_id: formData.teacher_id || null,
        credits: parseInt(formData.credits),
        department: formData.department.trim(),
        max_capacity: parseInt(formData.max_capacity),
        semester: formData.semester,
        year: parseInt(formData.year),
        schedule_info: formData.schedule_info.trim()
      };

      if (isEditing && course) {
        await courseService.updateCourse(course._id, courseData);
            } else {
        await courseService.createCourse(courseData);
            }

      onClose(true); // Close with refresh
        } catch (err: any) {
      console.error('Error saving course:', err);
      setError(handleApiError(err));
    } finally {
        setIsLoading(false);
    }
    };
    
  const handleCancel = () => {
    onClose(false);
    };

    return (
    <Dialog open={true} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Course' : 'Create New Course'}
      </DialogTitle>
      
                <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box mb={2}>
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </Box>

          <Stack spacing={3}>
            <Box display="flex" gap={2}>
              <TextField
                label="Course Code"
                value={formData.course_code}
                onChange={handleInputChange('course_code')}
                error={!!formErrors.course_code}
                helperText={formErrors.course_code}
                fullWidth
                required
                placeholder="e.g., CS-101"
              />
              <TextField
                label="Department"
                value={formData.department}
                onChange={handleInputChange('department')}
                error={!!formErrors.department}
                helperText={formErrors.department}
                fullWidth
                required
                placeholder="e.g., Computer Science"
              />
            </Box>

            <TextField
              label="Course Name"
              value={formData.course_name}
              onChange={handleInputChange('course_name')}
              error={!!formErrors.course_name}
              helperText={formErrors.course_name}
              fullWidth
              required
              placeholder="e.g., Introduction to Programming"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              multiline
              rows={3}
              placeholder="Course description..."
            />

            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={formData.teacher_id}
                  onChange={handleInputChange('teacher_id')}
                  label="Teacher"
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {teachers.map(teacher => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.username} ({teacher.first_name} {teacher.last_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Credits"
                type="number"
                value={formData.credits}
                onChange={handleInputChange('credits')}
                error={!!formErrors.credits}
                helperText={formErrors.credits}
                fullWidth
                required
                inputProps={{ min: 1, max: 6 }}
              />
            </Box>

            <Box display="flex" gap={2}>
              <TextField
                label="Max Capacity"
                type="number"
                value={formData.max_capacity}
                onChange={handleInputChange('max_capacity')}
                error={!!formErrors.max_capacity}
                helperText={formErrors.max_capacity}
                fullWidth
                required
                inputProps={{ min: 1 }}
              />

              <FormControl fullWidth required>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={formData.semester}
                  onChange={handleInputChange('semester')}
                  label="Semester"
                >
                  <MenuItem value="Spring">Spring</MenuItem>
                  <MenuItem value="Summer">Summer</MenuItem>
                  <MenuItem value="Fall">Fall</MenuItem>
                  <MenuItem value="Winter">Winter</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Year"
              type="number"
              value={formData.year}
              onChange={handleInputChange('year')}
              fullWidth
              required
              inputProps={{ min: 2020, max: 2030 }}
            />

            <TextField
              label="Schedule Information"
              value={formData.schedule_info}
              onChange={handleInputChange('schedule_info')}
              fullWidth
              placeholder="e.g., Mon/Wed/Fri 10:00-11:00 AM"
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
            startIcon={isLoading ? <LoadingSpinner size={16} /> : null}
          >
            {isLoading 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Course' : 'Create Course')
            }
          </Button>
        </DialogActions>
                </form>
    </Dialog>
    );
};

export default CourseForm; 