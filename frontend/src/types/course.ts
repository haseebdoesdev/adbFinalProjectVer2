export interface CourseFeedback {
    student_id: string; // ObjectId as string
    rating: number;
    comment?: string;
    date_posted: string; // ISO date string
}

export interface Course {
    _id: string; // ObjectId as string, non-optional after fetching
    course_code: string;
    course_name: string;
    description?: string;
    teacher_id?: string | null; // ObjectId as string, can be null if unassigned
    credits: number;
    department: string;
    max_capacity: number;
    current_enrollment: number;
    semester: string;
    year: number;
    schedule_info?: string;
    assignments?: string[]; // Array of ObjectId strings (or expanded objects later)
    quizzes?: string[];     // Array of ObjectId strings (or expanded objects later)
    feedback?: CourseFeedback[];
    created_at?: string; // ISO date string
    updated_at?: string; // ISO date string
    
    // Optional fields that might be populated by API (like in teacher view)
    enrolled_student_count?: number;
    teacher_info?: {
        name: string;
        email?: string;
    } | null;
}

// For creating/updating courses, some fields might be optional or different
export type CourseCreationPayload = Omit<Course, '_id' | 'current_enrollment' | 'created_at' | 'updated_at' | 'feedback' | 'teacher_info' | 'enrolled_student_count' | 'assignments' | 'quizzes'> & {
    teacher_id?: string | null; // Allow explicitly setting teacher_id to null or a string ID
};

export type CourseUpdatePayload = Partial<CourseCreationPayload>; 