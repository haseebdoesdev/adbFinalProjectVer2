export interface GradeComponent {
  component_type: string;
  component_id?: string;
  name: string;
  points_earned: number;
  total_points: number;
  weight: number;
}

export interface StudentGrade {
  _id: string;
  student_id: string;
  course_id: string;
  components: GradeComponent[];
  final_grade?: string;
  final_percentage?: number;
  calculated_at?: string;
  student: {
    id: string;
    name: string;
    email: string;
    student_id_str: string;
    first_name: string;
    last_name: string;
  };
}

export interface BulkGradeEntry {
  student_id: string;
  component_name: string;
  points_earned: number;
  total_points: number;
}

export interface GradeStats {
  total_students: number;
  average_grade: number;
  highest_grade: number;
  lowest_grade: number;
  passing_rate: number;
} 