import apiClient from './api';

// Interfaces for student-specific data
export interface StudentDashboardStats {
  total_courses: number;
  total_credits: number;
  upcoming_assignments: number;
  upcoming_quizzes: number;
  average_grade?: number;
  completed_assignments?: number;
  completed_quizzes?: number;
}

export interface EnrolledCourse {
  _id: string;
  course_code: string;
  course_name: string;
  description?: string;
  credits: number;
  department: string;
  semester: string;
  year: string;
  max_capacity: number;
  current_enrollment: number;
  teacher_id: string;
  schedule_info?: string;
  assignments?: string[];
  quizzes?: string[];
  teacher_info?: {
    name: string;
    email: string;
  };
}

export interface AvailableCourse {
  _id: string;
  course_code: string;
  course_name: string;
  description?: string;
  credits: number;
  department: string;
  semester: string;
  year: string;
  max_capacity: number;
  current_enrollment: number;
  teacher_id: string;
  schedule_info?: string;
  teacher_info?: {
    name: string;
    email: string;
  };
}

export interface StudentAssignment {
  _id: string;
  title: string;
  description?: string;
  assignment_type: string;
  total_points: number;
  due_date: string;
  instructions?: string;
  attachments?: string[];
  course_id: string;
  teacher_id: string;
  is_published: boolean;
  created_date: string;
  submission_status: string;
  submission_date?: string;
  score?: number;
  feedback?: string;
  submitted_attachments?: string[];
}

export interface StudentQuiz {
  _id: string;
  title: string;
  description?: string;
  quiz_type: string;
  total_points: number;
  time_limit: number;
  due_date: string;
  start_date: string;
  end_date: string;
  questions: any[];
  course_id: string;
  teacher_id: string;
  is_published: boolean;
  attempts_allowed: number;
  submission?: {
    _id: string;
    answers: any[];
    submission_date: string;
    score?: number;
    time_taken: number;
    attempt_number: number;
    status: string;
  };
}

export interface StudentGrade {
  _id: string;
  student_id: string;
  course_id: string;
  components: {
    component_type: string;
    name: string;
    points_earned: number;
    total_points: number;
    weight: number;
  }[];
  final_grade?: string;
  final_percentage?: number;
  calculated_at: string;
}

export interface StudentAttendance {
  _id: string;
  course_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  recorded_by: string;
  recorded_at: string;
}

export interface CourseFeedback {
  _id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comments?: string;
  feedback_date: string;
  is_anonymous: boolean;
}

export interface StudentTranscript {
  student_info: {
    name: string;
    student_id: string;
    email: string;
    major?: string;
  };
  courses: {
    course_code: string;
    course_name: string;
    credits: number;
    semester: string;
    year: string;
    grade: string;
    points_earned: number;
    total_points: number;
  }[];
  summary: {
    total_credits: number;
    cumulative_gpa: number;
    completed_courses: number;
    in_progress_courses: number;
  };
}

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  type: 'assignment' | 'quiz' | 'exam' | 'class' | 'event';
  course_id?: string;
  course_code?: string;
}

// Dashboard functions
export const getDashboardStats = async (): Promise<StudentDashboardStats> => {
  const response = await apiClient.get('/student/dashboard/stats');
  return response.data;
};

// Course functions
export const getEnrolledCourses = async (limit?: number): Promise<EnrolledCourse[]> => {
  const url = limit ? `/student/courses/my?limit=${limit}` : '/student/courses/my';
  const response = await apiClient.get(url);
  return response.data;
};

export const getAvailableCourses = async (): Promise<AvailableCourse[]> => {
  const response = await apiClient.get('/student/courses/available');
  return response.data;
};

export const enrollInCourse = async (courseId: string): Promise<void> => {
  await apiClient.post(`/student/courses/enroll/${courseId}`);
};

export const dropCourse = async (courseId: string): Promise<void> => {
  await apiClient.post(`/student/courses/drop/${courseId}`);
};

// Assignment functions
export const getCourseAssignments = async (courseId: string): Promise<StudentAssignment[]> => {
  const response = await apiClient.get(`/student/courses/${courseId}/assignments`);
  return response.data;
};

export const uploadAssignmentAttachment = async (file: File): Promise<{
  file_url: string;
  filename: string;
  size: number;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/student/upload/assignment-attachment', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const submitAssignment = async (
  assignmentId: string,
  submission: {
    content: string;
    attachments?: string[];
  }
): Promise<void> => {
  await apiClient.post(`/student/assignments/${assignmentId}/submit`, submission);
};

export const getAssignmentSubmission = async (assignmentId: string): Promise<any> => {
  const response = await apiClient.get(`/student/assignments/${assignmentId}/submission`);
  return response.data;
};

// Quiz functions
export const getCourseQuizzes = async (courseId: string): Promise<StudentQuiz[]> => {
  const response = await apiClient.get(`/student/courses/${courseId}/quizzes`);
  return response.data;
};

export const submitQuiz = async (
  quizId: string,
  submission: {
    answers: any[];
    time_taken: number;
  }
): Promise<void> => {
  await apiClient.post(`/student/quizzes/${quizId}/submit`, submission);
};

export const getQuizSubmission = async (quizId: string): Promise<any> => {
  const response = await apiClient.get(`/student/quizzes/${quizId}/submission`);
  return response.data;
};

// Grade functions
export const getCourseGrades = async (courseId: string): Promise<StudentGrade> => {
  const response = await apiClient.get(`/student/courses/${courseId}/grades`);
  return response.data;
};

export const getAllGrades = async (): Promise<StudentGrade[]> => {
  const response = await apiClient.get('/student/grades');
  return response.data;
};

export const getAllCourseGrades = async (): Promise<any[]> => {
  // Get all enrolled courses first
  const courses = await getEnrolledCourses();
  const allGrades = [];
  
  for (const course of courses) {
    try {
      const courseGrades = await getCourseGrades(course._id);
      allGrades.push({
        ...courseGrades,
        course_id: course._id,
        course_code: course.course_code,
        course_name: course.course_name
      });
    } catch (error) {
      console.error(`Error fetching grades for course ${course.course_code}:`, error);
      // Still include course info even if grades fetch fails
      allGrades.push({
        course: {
          course_code: course.course_code,
          course_name: course.course_name,
          credits: course.credits
        },
        course_id: course._id,
        course_code: course.course_code,
        course_name: course.course_name,
        assignments: [],
        quizzes: [],
        final_grade: null,
        final_percentage: null,
        components: []
      });
    }
  }
  
  return allGrades;
};

// Attendance functions
export const getCourseAttendance = async (courseId: string): Promise<StudentAttendance[]> => {
  const response = await apiClient.get(`/student/courses/${courseId}/attendance`);
  return response.data;
};

export const getAllAttendance = async (): Promise<StudentAttendance[]> => {
  const response = await apiClient.get('/student/attendance');
  return response.data;
};

// Feedback functions
export const submitCourseFeedback = async (
  courseId: string,
  feedback: {
    rating: number;
    comments?: string;
    is_anonymous?: boolean;
  }
): Promise<void> => {
  await apiClient.post(`/student/courses/${courseId}/feedback`, feedback);
};

export const getCourseFeedback = async (courseId: string): Promise<CourseFeedback[]> => {
  const response = await apiClient.get(`/student/courses/${courseId}/feedback`);
  return response.data;
};

// Transcript functions
export const getTranscript = async (): Promise<StudentTranscript> => {
  const response = await apiClient.get('/student/transcript');
  return response.data;
};

export const downloadTranscript = async (): Promise<Blob> => {
  const response = await apiClient.get('/student/transcript/pdf', {
    responseType: 'blob'
  });
  return response.data;
};

// Calendar functions
export const getStudentCalendar = async (): Promise<CalendarEvent[]> => {
  const response = await apiClient.get('/student/calendar');
  return response.data;
};

// Utility functions
export const getUpcomingAssignments = async (limit: number = 5): Promise<StudentAssignment[]> => {
  const response = await apiClient.get(`/student/assignments/upcoming?limit=${limit}`);
  return response.data;
};

export const getUpcomingQuizzes = async (limit: number = 5): Promise<StudentQuiz[]> => {
  const response = await apiClient.get(`/student/quizzes/upcoming?limit=${limit}`);
  return response.data;
};

export const getRecentGrades = async (limit: number = 10): Promise<any[]> => {
  const response = await apiClient.get(`/student/grades/recent?limit=${limit}`);
  return response.data;
};

export const searchCourses = async (query: string): Promise<AvailableCourse[]> => {
  const response = await apiClient.get(`/student/courses/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export default {
  // Dashboard
  getDashboardStats,
  
  // Courses
  getEnrolledCourses,
  getAvailableCourses,
  enrollInCourse,
  dropCourse,
  searchCourses,
  
  // Assignments
  getCourseAssignments,
  uploadAssignmentAttachment,
  submitAssignment,
  getAssignmentSubmission,
  getUpcomingAssignments,
  
  // Quizzes
  getCourseQuizzes,
  submitQuiz,
  getQuizSubmission,
  getUpcomingQuizzes,
  
  // Grades
  getCourseGrades,
  getAllGrades,
  getAllCourseGrades,
  getRecentGrades,
  
  // Attendance
  getCourseAttendance,
  getAllAttendance,
  
  // Feedback
  submitCourseFeedback,
  getCourseFeedback,
  
  // Transcript
  getTranscript,
  downloadTranscript,
  
  // Calendar
  getStudentCalendar
}; 