export interface User {
    _id: string; // MongoDB _id as string
    username: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    first_name?: string;
    last_name?: string;
    student_id_str?: string; 
    teacher_id_str?: string;
    major?: string;
    department?: string;
    date_joined?: string; // ISO date string
    is_active?: boolean;
    last_login?: string; // ISO date string
    enrolled_courses?: string[]; // Array of course IDs as strings
    courses_teaching?: string[]; // Array of course IDs as strings
}

export interface AuthResponse {
    access_token: string;
    role: 'student' | 'teacher' | 'admin';
    user: User; // Now required since backend returns it
}

export interface RegisterData {
    username: string;
    password: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    first_name?: string;
    last_name?: string;
} 