import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as studentService from '../../services/studentService';

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
      id={`grades-tabpanel-${index}`}
      aria-labelledby={`grades-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentGradesPage: React.FC = () => {
  const { user } = useAuth();
  const [gradesData, setGradesData] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allGrades = await studentService.getAllCourseGrades();
        setGradesData(allGrades);
      } catch (err: any) {
        console.error('Error fetching grades:', err);
        setError(err.message || 'Failed to fetch grades');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrades();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'inherit';
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const getChipGradeColor = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'default';
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const getLetterGrade = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'N/A';
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 65) return 'D';
    return 'F';
  };

  const calculateOverallStats = () => {
    const coursesWithGrades = gradesData.filter(course => 
      course.final_percentage !== null && course.final_percentage !== undefined
    );
    
    if (coursesWithGrades.length === 0) {
      return { gpa: 0, totalCredits: 0, completedCredits: 0 };
    }

    let totalPoints = 0;
    let totalCredits = 0;
    let completedCredits = 0;

    gradesData.forEach(course => {
      const credits = course.course?.credits || 0;
      totalCredits += credits;
      
      if (course.final_percentage !== null && course.final_percentage !== undefined) {
        const gradePoints = getGradePoints(course.final_percentage);
        totalPoints += gradePoints * credits;
        completedCredits += credits;
      }
    });

    const gpa = completedCredits > 0 ? totalPoints / completedCredits : 0;
    
    return { gpa, totalCredits, completedCredits };
  };

  const getGradePoints = (percentage: number) => {
    if (percentage >= 97) return 4.0;
    if (percentage >= 93) return 4.0;
    if (percentage >= 90) return 3.7;
    if (percentage >= 87) return 3.3;
    if (percentage >= 83) return 3.0;
    if (percentage >= 80) return 2.7;
    if (percentage >= 77) return 2.3;
    if (percentage >= 73) return 2.0;
    if (percentage >= 70) return 1.7;
    if (percentage >= 67) return 1.3;
    if (percentage >= 65) return 1.0;
    return 0.0;
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingSpinner variant="page" message="Loading grades..." />
      </Container>
    );
  }

  const stats = calculateOverallStats();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          My Grades
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your academic performance across all courses
        </Typography>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Overall Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {stats.gpa.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall GPA
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {stats.completedCredits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Credits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <GradeIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {stats.totalCredits}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Credits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {gradesData.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Courses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="grades tabs">
          <Tab label="Course Overview" />
          <Tab label="Detailed Breakdown" />
        </Tabs>
      </Box>

      {/* Course Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        {gradesData.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <GradeIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No grades available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your grades will appear here once assignments and quizzes are graded.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell align="center">Credits</TableCell>
                  <TableCell align="center">Assignments</TableCell>
                  <TableCell align="center">Quizzes</TableCell>
                  <TableCell align="center">Final Grade</TableCell>
                  <TableCell align="center">Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradesData.map((courseGrade) => (
                  <TableRow key={courseGrade.course_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">
                          {courseGrade.course_code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courseGrade.course_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {courseGrade.course?.credits || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <AssignmentIcon fontSize="small" />
                        <Typography variant="body2">
                          {courseGrade.assignments?.length || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <QuizIcon fontSize="small" />
                        <Typography variant="body2">
                          {courseGrade.quizzes?.length || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {courseGrade.final_grade ? (
                        <Chip 
                          label={courseGrade.final_grade}
                          color={getChipGradeColor(courseGrade.final_percentage)}
                          size="small"
                        />
                      ) : (
                        <Chip 
                          label={getLetterGrade(courseGrade.final_percentage)}
                          color={getChipGradeColor(courseGrade.final_percentage)}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {courseGrade.final_percentage !== null && courseGrade.final_percentage !== undefined ? (
                        <Box>
                          <Typography variant="body2">
                            {courseGrade.final_percentage.toFixed(1)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={courseGrade.final_percentage} 
                            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                            color={getGradeColor(courseGrade.final_percentage)}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Detailed Breakdown Tab */}
      <TabPanel value={tabValue} index={1}>
        {gradesData.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <GradeIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No detailed grades available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed breakdowns will appear here once work is graded.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Box>
            {gradesData.map((courseGrade) => (
              <Accordion key={courseGrade.course_id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    <SchoolIcon color="primary" />
                    <Box flex={1}>
                      <Typography variant="h6">
                        {courseGrade.course_code} - {courseGrade.course_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {courseGrade.course?.credits || 0} credits
                      </Typography>
                    </Box>
                    {courseGrade.final_percentage !== null && courseGrade.final_percentage !== undefined && (
                      <Chip 
                        label={`${courseGrade.final_percentage.toFixed(1)}%`}
                        color={getChipGradeColor(courseGrade.final_percentage)}
                        size="small"
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {/* Assignments */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Assignments ({courseGrade.assignments?.length || 0})
                          </Typography>
                          {courseGrade.assignments && courseGrade.assignments.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Assignment</TableCell>
                                    <TableCell align="center">Score</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {courseGrade.assignments.map((assignment: any, index: number) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {assignment.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Due: {formatDate(assignment.due_date)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        {assignment.score !== null && assignment.score !== undefined ? (
                                          <Typography variant="body2">
                                            {assignment.score}/{assignment.total_points}
                                          </Typography>
                                        ) : (
                                          <Typography variant="body2" color="text.secondary">
                                            Not graded
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Chip 
                                          label={assignment.status || 'Not submitted'}
                                          size="small"
                                          color={assignment.status === 'submitted' ? 'success' : 'default'}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No assignments yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Quizzes */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Quizzes ({courseGrade.quizzes?.length || 0})
                          </Typography>
                          {courseGrade.quizzes && courseGrade.quizzes.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Quiz</TableCell>
                                    <TableCell align="center">Score</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {courseGrade.quizzes.map((quiz: any, index: number) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {quiz.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Due: {formatDate(quiz.due_date)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        {quiz.score !== null && quiz.score !== undefined ? (
                                          <Typography variant="body2">
                                            {quiz.score}/{quiz.total_points}
                                          </Typography>
                                        ) : (
                                          <Typography variant="body2" color="text.secondary">
                                            Not taken
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell align="center">
                                        <Chip 
                                          label={quiz.status || 'Not taken'}
                                          size="small"
                                          color={quiz.status === 'submitted' ? 'success' : 'default'}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No quizzes yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Grade Components */}
                  {courseGrade.components && courseGrade.components.length > 0 && (
                    <Box mt={3}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Grade Breakdown
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Component</TableCell>
                              <TableCell align="center">Points Earned</TableCell>
                              <TableCell align="center">Total Points</TableCell>
                              <TableCell align="center">Weight</TableCell>
                              <TableCell align="center">Percentage</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {courseGrade.components.map((component: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{component.name}</TableCell>
                                <TableCell align="center">{component.points_earned}</TableCell>
                                <TableCell align="center">{component.total_points}</TableCell>
                                <TableCell align="center">{(component.weight * 100).toFixed(0)}%</TableCell>
                                <TableCell align="center">
                                  {((component.points_earned / component.total_points) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </TabPanel>
    </Container>
  );
};

export default StudentGradesPage; 