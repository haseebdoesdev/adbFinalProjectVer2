import api from './api';

// Types for admin reports
export interface SystemStats {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_admins: number;
  total_courses: number;
  total_enrollments: number;
  total_assignments: number;
  total_submissions: number;
  total_grades: number;
  active_users: number;
  new_users_this_month: number;
  new_enrollments_this_month: number;
}

export interface EnrollmentTrend {
  period: string;
  enrollments: number;
  new_users: number;
  completed_assignments: number;
}

export interface CoursePerformance {
  _id: string;
  course_code: string;
  course_name: string;
  department: string;
  total_enrollments: number;
  active_enrollments: number;
  completion_rate: number;
  average_grade: number;
  total_assignments: number;
  submitted_assignments: number;
}

export interface DepartmentStats {
  _id: string;
  total_courses: number;
  total_students: number;
  total_teachers: number;
  avg_enrollment_per_course: number;
  completion_rate: number;
  avg_grade: number;
}

export interface RecentActivity {
  _id: string;
  action: string;
  user_name: string;
  user_role: string;
  target: string;
  timestamp: string;
  details?: string;
}

export interface StudentPerformance {
  _id: string;
  student_name: string;
  email: string;
  total_enrollments: number;
  completed_assignments: number;
  average_grade: number;
  last_activity: string;
}

export interface TeacherPerformance {
  _id: string;
  teacher_name: string;
  email: string;
  total_courses: number;
  total_students: number;
  total_assignments: number;
  avg_grade: number;
}

export interface ComprehensiveReport {
  system_stats: SystemStats;
  enrollment_trends: EnrollmentTrend[];
  course_performance: CoursePerformance[];
  department_stats: DepartmentStats[];
  recent_activities: RecentActivity[];
  top_students: StudentPerformance[];
  teacher_performance: TeacherPerformance[];
  grade_distribution: Array<{ grade_range: string; count: number; percentage: number }>;
  assignment_completion_rates: Array<{ course_code: string; completion_rate: number }>;
}

// Admin service functions
export const getSystemStats = async (): Promise<SystemStats> => {
  const response = await api.get('/admin/reports/system-stats');
  return response.data;
};

export const getComprehensiveReport = async (period: string = 'month', department?: string): Promise<ComprehensiveReport> => {
  const params: any = { period };
  if (department && department !== 'all') {
    params.department = department;
  }
  
  const response = await api.get('/admin/reports/comprehensive', { params });
  return response.data;
};

export const getEnrollmentTrends = async (period: string = 'month'): Promise<EnrollmentTrend[]> => {
  const response = await api.get('/admin/reports/enrollment-trends', { params: { period } });
  return response.data;
};

export const getCoursePerformance = async (department?: string): Promise<CoursePerformance[]> => {
  const params = department && department !== 'all' ? { department } : {};
  const response = await api.get('/admin/reports/course-performance', { params });
  return response.data;
};

export const getDepartmentStats = async (): Promise<DepartmentStats[]> => {
  const response = await api.get('/admin/reports/department-stats');
  return response.data;
};

export const getRecentActivities = async (limit: number = 20): Promise<RecentActivity[]> => {
  const response = await api.get('/admin/reports/recent-activities', { params: { limit } });
  return response.data;
};

export const getTopStudents = async (limit: number = 10): Promise<StudentPerformance[]> => {
  const response = await api.get('/admin/reports/top-students', { params: { limit } });
  return response.data;
};

export const getTeacherPerformance = async (): Promise<TeacherPerformance[]> => {
  const response = await api.get('/admin/reports/teacher-performance');
  return response.data;
};

export const exportReport = async (reportType: string, period: string = 'month', format: string = 'pdf'): Promise<Blob> => {
  const response = await api.get(`/admin/reports/export/${reportType}`, {
    params: { period, format },
    responseType: 'blob'
  });
  return response.data;
};

export const getGradeDistribution = async (department?: string): Promise<Array<{ grade_range: string; count: number; percentage: number }>> => {
  const params = department && department !== 'all' ? { department } : {};
  const response = await api.get('/admin/reports/grade-distribution', { params });
  return response.data;
};

export const getAssignmentCompletionRates = async (): Promise<Array<{ course_code: string; completion_rate: number }>> => {
  const response = await api.get('/admin/reports/assignment-completion');
  return response.data;
}; 