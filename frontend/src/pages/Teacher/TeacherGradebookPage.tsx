import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Fab,
  LinearProgress,
  Avatar,
  Menu,
  MenuList,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Grade as GradeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Calculate as CalculateIcon,
  Person as PersonIcon,
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
  MoreVert as MoreVertIcon,
  FileUpload as FileUploadIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentGrade, GradeComponent, BulkGradeEntry, GradeStats } from '../../types/grade';
import { Course } from '../../types/course';
import { useAuth } from '../../contexts/AuthContext';
import * as teacherService from '../../services/teacherService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gradebook-tabpanel-${index}`}
      aria-labelledby={`gradebook-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherGradebookPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [gradeStats, setGradeStats] = useState<GradeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [addGradeDialog, setAddGradeDialog] = useState(false);
  const [editGradeDialog, setEditGradeDialog] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentGrade | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<GradeComponent | null>(null);

  // Form states
  const [gradeForm, setGradeForm] = useState({
    component_type: 'assignment',
    name: '',
    points_earned: 0,
    total_points: 100,
    weight: 1.0
  });

  // Bulk upload state
  const [bulkGrades, setBulkGrades] = useState('');
  const [bulkUploadFormat, setBulkUploadFormat] = useState('csv');

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (courseId) {
      fetchGradebookData();
    }
  }, [courseId]);

  const fetchGradebookData = async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [courseData, gradesData, statsData] = await Promise.all([
        teacherService.getMyCourses().then(courses => 
          courses.find(c => c._id === courseId)
        ),
        teacherService.getCourseGrades(courseId),
        teacherService.getCourseGradeStats(courseId).catch(() => null)
      ]);

      setCourse(courseData || null);
      setGrades(gradesData);
      setGradeStats(statsData);
    } catch (err: any) {
      console.error('Error fetching gradebook data:', err);
      setError(err.message || 'Failed to fetch gradebook data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGradeComponent = async () => {
    if (!courseId || !selectedStudent) return;

    try {
      await teacherService.addGradeComponent(
        courseId,
        selectedStudent.student_id,
        gradeForm
      );
      
      setAddGradeDialog(false);
      setGradeForm({
        component_type: 'assignment',
        name: '',
        points_earned: 0,
        total_points: 100,
        weight: 1.0
      });
      
      await fetchGradebookData();
    } catch (err: any) {
      setError(err.message || 'Failed to add grade component');
    }
  };

  const handleEditGradeComponent = async () => {
    if (!courseId || !selectedStudent || !selectedComponent) return;

    try {
      await teacherService.updateGradeComponent(
        courseId,
        selectedStudent.student_id,
        selectedComponent.component_id || '',
        gradeForm
      );
      
      setEditGradeDialog(false);
      await fetchGradebookData();
    } catch (err: any) {
      setError(err.message || 'Failed to update grade component');
    }
  };

  const handleDeleteGradeComponent = async (grade: StudentGrade, component: GradeComponent) => {
    if (!courseId || !component.component_id) return;

    if (window.confirm('Are you sure you want to delete this grade component?')) {
      try {
        await teacherService.deleteGradeComponent(
          courseId,
          grade.student_id,
          component.component_id
        );
        await fetchGradebookData();
      } catch (err: any) {
        setError(err.message || 'Failed to delete grade component');
      }
    }
  };

  const handleBulkUpload = async () => {
    if (!courseId || !bulkGrades.trim()) return;

    try {
      const lines = bulkGrades.trim().split('\n');
      const gradesData: BulkGradeEntry[] = [];

      // Skip header line if CSV format
      const startIndex = bulkUploadFormat === 'csv' ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(part => part.trim());
        if (parts.length >= 4) {
          gradesData.push({
            student_id: parts[0],
            component_name: parts[1],
            points_earned: parseFloat(parts[2]),
            total_points: parseFloat(parts[3])
          });
        }
      }

      await teacherService.bulkUploadGrades(courseId, gradesData);
      setBulkUploadDialog(false);
      setBulkGrades('');
      await fetchGradebookData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload grades');
    }
  };

  const handleCalculateFinalGrades = async () => {
    if (!courseId) return;

    try {
      await teacherService.calculateFinalGrades(courseId);
      await fetchGradebookData();
    } catch (err: any) {
      setError(err.message || 'Failed to calculate final grades');
    }
  };

  const handleExportGrades = async () => {
    if (!courseId) return;

    try {
      const blob = await teacherService.exportGradesToCSV(courseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course?.course_code}_grades.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export grades');
    }
  };

  const openAddDialog = (student: StudentGrade) => {
    setSelectedStudent(student);
    setGradeForm({
      component_type: 'assignment',
      name: '',
      points_earned: 0,
      total_points: 100,
      weight: 1.0
    });
    setAddGradeDialog(true);
  };

  const openEditDialog = (student: StudentGrade, component: GradeComponent) => {
    setSelectedStudent(student);
    setSelectedComponent(component);
    setGradeForm({
      component_type: component.component_type,
      name: component.name,
      points_earned: component.points_earned,
      total_points: component.total_points,
      weight: component.weight
    });
    setEditGradeDialog(true);
  };

  const calculateStudentPercentage = (grade: StudentGrade): number => {
    if (grade.components.length === 0) return 0;
    
    const totalWeightedPoints = grade.components.reduce((sum, comp) => 
      sum + (comp.points_earned / comp.total_points) * comp.weight, 0
    );
    const totalWeight = grade.components.reduce((sum, comp) => sum + comp.weight, 0);
    
    return totalWeight > 0 ? (totalWeightedPoints / totalWeight) * 100 : 0;
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 80) return '#8bc34a';
    if (percentage >= 70) return '#ffc107';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  };

  if (isLoading) {
    return <LoadingSpinner variant="page" message="Loading gradebook..." />;
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Course not found or you don't have permission to view this gradebook.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
                width: 48,
                height: 48
              }}
            >
              <GradeIcon />
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
                {course.course_code} - Gradebook
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                {course.course_name} • Manage student grades and assessments
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CalculateIcon />}
              onClick={handleCalculateFinalGrades}
              sx={{ borderRadius: 2 }}
            >
              Calculate Final Grades
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportGrades}
              sx={{ borderRadius: 2 }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setBulkUploadDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Bulk Upload
            </Button>
          </Box>
        </Box>

        {/* Grade Statistics */}
        {gradeStats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                  {gradeStats.total_students}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Students
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                  {gradeStats.average_grade.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Class Average
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                  {gradeStats.highest_grade.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Highest Grade
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                  {gradeStats.lowest_grade.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lowest Grade
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                  {gradeStats.passing_rate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Passing Rate
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Main Content */}
      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab
                label="Student Grades"
                icon={<PersonIcon />}
                iconPosition="start"
              />
              <Tab
                label="Grade Components"
                icon={<AssessmentIcon />}
                iconPosition="start"
              />
              <Tab
                label="Analytics"
                icon={<AnalyticsIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Student Grades Tab */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Components</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Current Grade</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Final Grade</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grades.map((grade) => {
                    const percentage = calculateStudentPercentage(grade);
                    return (
                      <TableRow key={grade._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {grade.student.first_name?.charAt(0)}{grade.student.last_name?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {grade.student.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {grade.student.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {grade.student.student_id_str || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${grade.components.length} components`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getGradeColor(percentage)
                              }}
                            />
                            <Typography sx={{ fontWeight: 600 }}>
                              {percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {grade.final_grade ? (
                            <Chip
                              label={grade.final_grade}
                              size="small"
                              sx={{
                                backgroundColor: getGradeColor(grade.final_percentage || 0),
                                color: 'white',
                                fontWeight: 600
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not calculated
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Add Grade Component">
                            <IconButton
                              size="small"
                              onClick={() => openAddDialog(grade)}
                              sx={{ color: 'primary.main' }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Grade Components Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mt: 2 }}>
              {grades.map((grade) => (
                <Card key={grade._id} sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      {grade.student.name}
                    </Typography>
                    {grade.components.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          No grade components yet
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => openAddDialog(grade)}
                          size="small"
                        >
                          Add First Component
                        </Button>
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Component</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Points Earned</TableCell>
                              <TableCell>Total Points</TableCell>
                              <TableCell>Percentage</TableCell>
                              <TableCell>Weight</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {grade.components.map((component, index) => (
                              <TableRow key={index}>
                                <TableCell>{component.name}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={component.component_type}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>{component.points_earned}</TableCell>
                                <TableCell>{component.total_points}</TableCell>
                                <TableCell>
                                  {((component.points_earned / component.total_points) * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell>{component.weight}</TableCell>
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditDialog(grade, component)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteGradeComponent(grade, component)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Grade Distribution
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {['A (90-100%)', 'B (80-89%)', 'C (70-79%)', 'D (60-69%)', 'F (0-59%)'].map((range, index) => {
                        const count = grades.filter(grade => {
                          const percentage = calculateStudentPercentage(grade);
                          return percentage >= (90 - index * 10) && percentage < (100 - index * 10);
                        }).length;
                        const percentage = grades.length > 0 ? (count / grades.length) * 100 : 0;
                        
                        return (
                          <Box key={range} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">{range}</Typography>
                              <Typography variant="body2">{count} students</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percentage}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Component Type Breakdown
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {['assignment', 'quiz', 'exam', 'project', 'participation'].map(type => {
                        const components = grades.flatMap(g => g.components.filter(c => c.component_type === type));
                        const count = components.length;
                        const avgScore = components.length > 0 
                          ? components.reduce((sum, c) => sum + (c.points_earned / c.total_points) * 100, 0) / components.length 
                          : 0;
                        
                        return (
                          <Box key={type} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {type}
                              </Typography>
                              <Typography variant="body2">
                                {count} components • {avgScore.toFixed(1)}% avg
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={avgScore}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Add Grade Dialog */}
      <Dialog open={addGradeDialog} onClose={() => setAddGradeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Grade Component - {selectedStudent?.student.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Component Type</InputLabel>
                <Select
                  value={gradeForm.component_type}
                  label="Component Type"
                  onChange={(e) => setGradeForm({ ...gradeForm, component_type: e.target.value })}
                >
                  <MenuItem value="assignment">Assignment</MenuItem>
                  <MenuItem value="quiz">Quiz</MenuItem>
                  <MenuItem value="exam">Exam</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                  <MenuItem value="participation">Participation</MenuItem>
                  <MenuItem value="manual">Manual Entry</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Component Name"
                value={gradeForm.name}
                onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Points Earned"
                type="number"
                value={gradeForm.points_earned}
                onChange={(e) => setGradeForm({ ...gradeForm, points_earned: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Total Points"
                type="number"
                value={gradeForm.total_points}
                onChange={(e) => setGradeForm({ ...gradeForm, total_points: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Weight"
                type="number"
                value={gradeForm.weight}
                onChange={(e) => setGradeForm({ ...gradeForm, weight: Number(e.target.value) })}
                helperText="Weight in final grade calculation (1.0 = normal weight)"
                inputProps={{ step: 0.1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddGradeDialog(false)}>Cancel</Button>
          <Button onClick={handleAddGradeComponent} variant="contained">
            Add Component
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Grade Dialog */}
      <Dialog open={editGradeDialog} onClose={() => setEditGradeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Grade Component - {selectedStudent?.student.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Component Type</InputLabel>
                <Select
                  value={gradeForm.component_type}
                  label="Component Type"
                  onChange={(e) => setGradeForm({ ...gradeForm, component_type: e.target.value })}
                >
                  <MenuItem value="assignment">Assignment</MenuItem>
                  <MenuItem value="quiz">Quiz</MenuItem>
                  <MenuItem value="exam">Exam</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                  <MenuItem value="participation">Participation</MenuItem>
                  <MenuItem value="manual">Manual Entry</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Component Name"
                value={gradeForm.name}
                onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Points Earned"
                type="number"
                value={gradeForm.points_earned}
                onChange={(e) => setGradeForm({ ...gradeForm, points_earned: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Total Points"
                type="number"
                value={gradeForm.total_points}
                onChange={(e) => setGradeForm({ ...gradeForm, total_points: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Weight"
                type="number"
                value={gradeForm.weight}
                onChange={(e) => setGradeForm({ ...gradeForm, weight: Number(e.target.value) })}
                helperText="Weight in final grade calculation (1.0 = normal weight)"
                inputProps={{ step: 0.1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGradeDialog(false)}>Cancel</Button>
          <Button onClick={handleEditGradeComponent} variant="contained">
            Update Component
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadDialog} onClose={() => setBulkUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Upload Grades</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload grades in CSV format: student_id, component_name, points_earned, total_points
              <br />
              Example: john.doe@email.com, Midterm Exam, 85, 100
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={10}
              label="Paste CSV Data"
              value={bulkGrades}
              onChange={(e) => setBulkGrades(e.target.value)}
              placeholder="student_id, component_name, points_earned, total_points"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkUploadDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkUpload} variant="contained" disabled={!bulkGrades.trim()}>
            Upload Grades
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherGradebookPage; 