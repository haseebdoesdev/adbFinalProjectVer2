import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School,
  Person,
  Lock,
  Email,
  Badge,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'student' | 'teacher' | 'admin' | '';
  first_name: string;
  last_name: string;
  student_id_str?: string;
  teacher_id_str?: string;
  major?: string;
  department?: string;
}

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    first_name: '',
    last_name: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const steps = ['Account Info', 'Role & Details', 'Verification'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };

  const handleRoleChange = (e: any) => {
    const role = e.target.value;
    setFormData(prev => ({
      ...prev,
      role,
      // Clear role-specific fields when role changes
      student_id_str: role === 'student' ? prev.student_id_str : undefined,
      teacher_id_str: role === 'teacher' ? prev.teacher_id_str : undefined,
      major: role === 'student' ? prev.major : undefined,
      department: role === 'teacher' ? prev.department : undefined,
    }));
  };

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};
    
    if (step === 0) {
      // Basic account information
      if (!formData.username.trim()) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }
      
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Email is invalid';
      }
      
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (step === 1) {
      // Role and personal details
      if (!formData.role) {
        errors.role = 'Please select a role';
      }
      
      if (!formData.first_name.trim()) {
        errors.first_name = 'First name is required';
      }
      
      if (!formData.last_name.trim()) {
        errors.last_name = 'Last name is required';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    
    if (!validateStep(1)) {
      return;
    }
    
    try {
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'student' | 'teacher' | 'admin',
        first_name: formData.first_name,
        last_name: formData.last_name,
      };
      
      await register(registrationData);
      navigate('/'); // Will redirect based on user role
        } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setActiveStep(0); // Go back to first step to show error
        }
    };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required error={!!fieldErrors.role}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={handleRoleChange}
                startAdornment={
                  <InputAdornment position="start">
                    <Badge color="action" />
                  </InputAdornment>
                }
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
              {fieldErrors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                  {fieldErrors.role}
                </Typography>
              )}
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                required
                fullWidth
                id="first_name"
                label="First Name"
                name="first_name"
                autoComplete="given-name"
                value={formData.first_name}
                onChange={handleChange}
                error={!!fieldErrors.first_name}
                helperText={fieldErrors.first_name}
              />
              
              <TextField
                required
                fullWidth
                id="last_name"
                label="Last Name"
                name="last_name"
                autoComplete="family-name"
                value={formData.last_name}
                onChange={handleChange}
                error={!!fieldErrors.last_name}
                helperText={fieldErrors.last_name}
              />
            </Box>
            
            {formData.role === 'student' && (
              <>
                <TextField
                  fullWidth
                  id="student_id_str"
                  label="Student ID (Optional)"
                  name="student_id_str"
                  value={formData.student_id_str || ''}
                  onChange={handleChange}
                  helperText="Leave blank if not assigned yet"
                />
                <TextField
                  fullWidth
                  id="major"
                  label="Major (Optional)"
                  name="major"
                  value={formData.major || ''}
                  onChange={handleChange}
                />
              </>
            )}
            
            {formData.role === 'teacher' && (
              <>
                <TextField
                  fullWidth
                  id="teacher_id_str"
                  label="Teacher ID (Optional)"
                  name="teacher_id_str"
                  value={formData.teacher_id_str || ''}
                  onChange={handleChange}
                  helperText="Leave blank if not assigned yet"
                />
                <TextField
                  fullWidth
                  id="department"
                  label="Department (Optional)"
                  name="department"
                  value={formData.department || ''}
                  onChange={handleChange}
                />
              </>
            )}
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Ready to Register!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please review your information and click "Create Account" to complete registration.
            </Typography>
            
            <Paper elevation={2} sx={{ p: 3, textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
              <Typography variant="h6" gutterBottom>Registration Summary</Typography>
              <Typography><strong>Username:</strong> {formData.username}</Typography>
              <Typography><strong>Email:</strong> {formData.email}</Typography>
              <Typography><strong>Role:</strong> {formData.role}</Typography>
              <Typography><strong>Name:</strong> {formData.first_name} {formData.last_name}</Typography>
              {formData.role === 'student' && formData.major && (
                <Typography><strong>Major:</strong> {formData.major}</Typography>
              )}
              {formData.role === 'teacher' && formData.department && (
                <Typography><strong>Department:</strong> {formData.department}</Typography>
              )}
            </Paper>
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  mb: 2,
                }}
              >
                <School sx={{ fontSize: 40 }} />
              </Box>
              <Typography component="h1" variant="h4" fontWeight="bold" gutterBottom>
                Join University MS
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Create your account to access the University Management System
              </Typography>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            {/* Form Content */}
            <Box component="form" onSubmit={handleSubmit}>
              {renderStepContent(activeStep)}
              
              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  variant="outlined"
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    endIcon={<ArrowForward />}
                    variant="contained"
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  style={{ 
                    color: 'inherit',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
    );
};

export default RegisterPage; 