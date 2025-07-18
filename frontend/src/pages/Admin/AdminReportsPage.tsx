import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  Psychology as PsychologyIcon,
  Grade as GradeIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  AccountCircle as AccountCircleIcon,
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/common/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import * as adminService from '../../services/adminService';

const AdminReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [systemStats, setSystemStats] = useState<adminService.SystemStats | null>(null);
  const [enrollmentTrends, setEnrollmentTrends] = useState<adminService.EnrollmentTrend[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<adminService.CoursePerformance[]>([]);
  const [departmentStats, setDepartmentStats] = useState<adminService.DepartmentStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<adminService.RecentActivity[]>([]);
  const [topStudents, setTopStudents] = useState<adminService.StudentPerformance[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<adminService.TeacherPerformance[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<Array<{ grade_range: string; count: number; percentage: number }>>([]);
  const [assignmentCompletion, setAssignmentCompletion] = useState<Array<{ course_code: string; completion_rate: number }>>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Fetch all data in parallel
      const [
        statsData,
        trendsData,
        performanceData,
        deptData,
        activitiesData,
        studentsData,
        teachersData,
        gradesData,
        completionData
      ] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getEnrollmentTrends(selectedPeriod),
        adminService.getCoursePerformance(selectedDepartment),
        adminService.getDepartmentStats(),
        adminService.getRecentActivities(20),
        adminService.getTopStudents(10),
        adminService.getTeacherPerformance(),
        adminService.getGradeDistribution(selectedDepartment),
        adminService.getAssignmentCompletionRates()
      ]);

      setSystemStats(statsData);
      setEnrollmentTrends(trendsData);
      setCoursePerformance(performanceData);
      setDepartmentStats(deptData);
      setRecentActivities(activitiesData);
      setTopStudents(studentsData);
      setTeacherPerformance(teachersData);
      setGradeDistribution(gradesData);
      setAssignmentCompletion(completionData);

    } catch (err: any) {
      console.error('Failed to fetch report data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch reports data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedDepartment]);

  const handleRefresh = () => {
    fetchReportData(true);
  };

  const handleExportReport = async () => {
    try {
      const blob = await adminService.exportReport('comprehensive', selectedPeriod, 'pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-report-${selectedPeriod}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export report');
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('Enrolled')) return <SchoolIcon color="primary" />;
    if (action.includes('Submitted')) return <AssignmentIcon color="success" />;
    if (action.includes('Created')) return <GradeIcon color="info" />;
    if (action.includes('Registered')) return <AccountCircleIcon color="secondary" />;
    return <AnalyticsIcon />;
  };

  const getGradeColor = (range: string) => {
    if (range.includes('A')) return '#10b981';
    if (range.includes('B')) return '#3b82f6';
    if (range.includes('C')) return '#f59e0b';
    if (range.includes('D')) return '#ef4444';
    return '#6b7280';
  };

  if (isLoading) {
    return <LoadingSpinner variant="page" message="Loading comprehensive reports..." />;
  }

  const maxTrendValue = Math.max(...enrollmentTrends.map(t => t.enrollments));

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                width: 48,
                height: 48,
                mr: 2
              }}
            >
              <AnalyticsIcon />
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
                Analytics & Reports
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                Comprehensive insights and analytics for data-driven decisions
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={selectedPeriod}
                label="Period"
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                label="Department"
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departmentStats.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Tooltip title="Refresh Data">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportReport}
              sx={{
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                }
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Users"
            value={systemStats?.total_users?.toLocaleString() || '0'}
            icon={<PeopleIcon />}
            color="#6366f1"
            trend="up"
            trendValue={`+${systemStats?.new_users_this_month || 0} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Active Enrollments"
            value={systemStats?.total_enrollments?.toLocaleString() || '0'}
            icon={<SchoolIcon />}
            color="#10b981"
            trend="up"
            trendValue={`+${systemStats?.new_enrollments_this_month || 0} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Courses"
            value={systemStats?.total_courses?.toLocaleString() || '0'}
            icon={<GradeIcon />}
            color="#f59e0b"
            trend="neutral"
            trendValue="Active courses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assignment Submissions"
            value={systemStats?.total_submissions?.toLocaleString() || '0'}
            icon={<AssignmentIcon />}
            color="#ec4899"
            trend="up"
            trendValue="Total submissions"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Enrollment Trends Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Enrollment Trends
                </Typography>
                <Chip 
                  label={`Last ${selectedPeriod === 'week' ? '12 Weeks' : selectedPeriod === 'month' ? '12 Months' : selectedPeriod === 'quarter' ? '4 Quarters' : '3 Years'}`} 
                  size="small" 
                  color="primary" 
                />
              </Box>
              
              {enrollmentTrends.length > 0 ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'end', gap: 2, px: 2 }}>
                  {enrollmentTrends.slice(-12).map((data, index) => (
                    <Box key={data.period} sx={{ flex: 1, textAlign: 'center' }}>
                      <Box
                        sx={{
                          height: `${(data.enrollments / maxTrendValue) * 100}%`,
                          background: `linear-gradient(135deg, #6366f1, #8b5cf6)`,
                          borderRadius: 1,
                          mb: 1,
                          minHeight: 20,
                          display: 'flex',
                          alignItems: 'end',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          pb: 1,
                          position: 'relative'
                        }}
                      >
                        {data.enrollments}
                        <Tooltip title={`New Users: ${data.new_users}, Completed Assignments: ${data.completed_assignments}`}>
                          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {data.period}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No enrollment data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Grade Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Grade Distribution
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {gradeDistribution.map((grade) => (
                  <Box key={grade.grade_range}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {grade.grade_range}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {grade.count} ({grade.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={grade.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getGradeColor(grade.grade_range)
                        }
                      }}
                    />
                  </Box>
                ))}
                {gradeDistribution.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No grade data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performing Courses */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Top Performing Courses
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {coursePerformance.slice(0, 5).map((course, index) => (
                  <Paper
                    key={course._id}
                    sx={{
                      p: 2,
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    <Avatar
                      sx={{
                        background: `linear-gradient(135deg, ${['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'][index]}, ${['#8b5cf6', '#f472b6', '#34d399', '#fbbf24', '#f87171'][index]})`,
                        width: 40,
                        height: 40,
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      {course.course_code.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {course.course_code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.course_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {course.department} • {course.active_enrollments} enrolled
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {course.average_grade.toFixed(1)}% avg
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {course.completion_rate.toFixed(1)}% completion
                      </Typography>
                    </Box>
                  </Paper>
                ))}
                {coursePerformance.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No course data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Statistics */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Department Overview
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {departmentStats.map((dept, index) => (
                  <Box key={dept._id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {dept._id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dept.total_students} students
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(dept.total_students / Math.max(...departmentStats.map(d => d.total_students))) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(135deg, ${['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6]}, ${['#8b5cf6', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#a78bfa'][index % 6]})`
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {dept.total_courses} courses • {dept.total_teachers} teachers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dept.avg_grade.toFixed(1)}% avg grade
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {departmentStats.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No department data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Students */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Top Performing Students
              </Typography>
              
              <List sx={{ p: 0 }}>
                {topStudents.map((student, index) => (
                  <ListItem
                    key={student._id}
                    sx={{
                      px: 0,
                      borderBottom: index < topStudents.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={student.student_name || 'Unknown Student'}
                      secondary={`${student.total_enrollments} courses • ${student.completed_assignments} assignments`}
                    />
                    <Chip
                      label={`${student.average_grade.toFixed(1)}%`}
                      size="small"
                      color={student.average_grade >= 90 ? 'success' : student.average_grade >= 80 ? 'primary' : 'default'}
                    />
                  </ListItem>
                ))}
                {topStudents.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No student data available
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Teacher Performance */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Teacher Performance
              </Typography>
              
              <List sx={{ p: 0 }}>
                {teacherPerformance.slice(0, 5).map((teacher, index) => (
                  <ListItem
                    key={teacher._id}
                    sx={{
                      px: 0,
                      borderBottom: index < Math.min(teacherPerformance.length, 5) - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                        {teacher.teacher_name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={teacher.teacher_name || 'Unknown Teacher'}
                      secondary={`${teacher.total_courses} courses • ${teacher.total_students} students • ${teacher.total_assignments} assignments`}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {teacher.avg_grade.toFixed(1)}% avg
                    </Typography>
                  </ListItem>
                ))}
                {teacherPerformance.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No teacher data available
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Recent System Activity
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Target</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities.map((activity, index) => (
                      <TableRow key={activity._id} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getActivityIcon(activity.action)}
                            <Chip 
                              label={activity.action} 
                              size="small" 
                              variant="outlined"
                              color={
                                activity.action.includes('Created') ? 'success' :
                                activity.action.includes('Enrolled') ? 'primary' :
                                activity.action.includes('Submitted') ? 'info' : 'default'
                              }
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {activity.user_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {activity.user_role}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{activity.target}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {activity.details}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentActivities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography color="text.secondary">
                            No recent activities found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Assignment Completion Rates */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Assignment Completion Rates by Course
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {assignmentCompletion.slice(0, 10).map((course, index) => (
                  <Box key={course.course_code}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {course.course_code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.completion_rate.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={course.completion_rate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: course.completion_rate >= 80 ? '#10b981' : 
                                         course.completion_rate >= 60 ? '#f59e0b' : '#ef4444'
                        }
                      }}
                    />
                  </Box>
                ))}
                {assignmentCompletion.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No assignment completion data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminReportsPage; 