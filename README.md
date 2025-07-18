# University Management System

A comprehensive, modern university management system featuring three distinct portals for Students, Teachers, and Administrators. Built with React, Flask, and MongoDB with enterprise-grade security and performance optimizations.

## 🚀 Features

### 🎓 Student Portal
- **Course Management**
  - Browse and enroll in available courses
  - Drop courses with transaction safety
  - View course details, schedules, and capacity
  - Real-time enrollment status tracking

- **Academic Progress**
  - View detailed grade reports for each course
  - Track assignment and quiz scores
  - Access comprehensive transcript generation (PDF)
  - Monitor semester-wise academic performance
  - Calculate GPA with academic standing indicators

- **Assignments & Quizzes**
  - Submit assignments with file attachments
  - Take timed quizzes with automatic grading
  - View submission history and feedback
  - Track due dates and completion status

- **Attendance Tracking**
  - View attendance records by course
  - Calculate attendance percentages
  - Monitor attendance trends over time

- **Course Feedback System**
  - Rate and review courses (1-5 scale)
  - Submit detailed course feedback
  - View aggregated course ratings

- **Calendar Integration**
  - Track assignment due dates
  - Monitor quiz schedules
  - View exam dates and academic events
  - Personal academic calendar

### 👨‍🏫 Teacher Portal
- **Course Management**
  - View assigned courses and student enrollment
  - Access detailed student rosters
  - Monitor course capacity and statistics

- **Assignment & Quiz Creation**
  - Create and publish assignments with detailed instructions
  - Design quizzes with multiple question types
  - Set due dates and grading criteria
  - Manage submission deadlines

- **Grading System**
  - Grade assignments with detailed feedback
- Bulk upload grades via CSV
  - Track grading progress and pending submissions
  - Generate grade reports for students

- **Attendance Management**
  - Record daily attendance for classes
  - View attendance statistics and trends
  - Generate attendance reports

- **Analytics & Reports**
  - View course performance analytics
  - Generate comprehensive teacher reports (PDF)
  - Monitor student engagement metrics
  - Access grade distribution analytics

### 👨‍💼 Admin Portal
- **User Management**
  - Add/remove users with role assignment
  - Manage student, teacher, and admin accounts
  - Dynamic role management and permissions

- **Course Administration**
  - Create and configure courses
  - Assign teachers to courses
  - Set course capacity and schedules
  - Manage course offerings by semester

- **System Analytics**
  - Comprehensive dashboard with system statistics
  - Generate administrative reports (PDF)
  - Monitor system usage and performance
  - Access advanced analytics for planning

- **Final Exam Scheduling**
  - Schedule and manage final examinations
  - Coordinate exam logistics
  - Generate exam schedules and notifications

## 🛠 Technical Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: MongoDB with advanced features
- **Authentication**: JWT with secure token management
- **Security**: Role-based access control, NoSQL injection prevention
- **Performance**: Database indexing, aggregation pipelines, sharding support
- **Concurrency**: Optimistic and pessimistic locking mechanisms
- **Reports**: PDF generation with ReportLab

### Frontend
- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Styling**: Modern, responsive design with smooth animations
- **State Management**: Context API with custom hooks
- **Routing**: React Router with protected routes
- **HTTP Client**: Axios with interceptors

### Database Architecture
- **Collections**: Users, Courses, Enrollments, Assignments, Quizzes, Submissions, Grades, Attendance, Calendar Events, Notifications
- **Indexes**: Optimized for query performance
- **Transactions**: ACID compliance for critical operations
- **Aggregation**: Complex queries with MongoDB pipelines
- **Security**: Data validation and sanitization

## 🔒 Security Features

- **Authentication**: Secure JWT implementation with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive sanitization against NoSQL injection
- **Password Security**: Bcrypt hashing with salt
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configured for secure cross-origin requests
- **Data Encryption**: Sensitive data protection

## 📊 Advanced Features

### Database Optimizations
- **Indexing**: Strategic indexes for all collections
- **Sharding**: Horizontal scaling configuration
- **Aggregation Pipelines**: Complex data processing
- **Connection Pooling**: Optimized database connections

### Concurrency Control
- **Optimistic Locking**: Version-based conflict resolution
- **Pessimistic Locking**: Distributed lock implementation
- **Transactions**: Multi-document ACID transactions
- **Race Condition Prevention**: Course enrollment safety

### Reporting System
- **PDF Generation**: Professional reports and transcripts
- **Charts & Analytics**: Visual data representation
- **Bulk Operations**: CSV import/export functionality
- **Automated Reports**: Scheduled report generation

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB 5.0+
- npm or yarn

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY="your-secret-key"
export MONGO_URI="mongodb://localhost:27017/university_ms"
export JWT_SECRET_KEY="your-jwt-secret"

# Initialize database indexes
python -c "from utils.database import DatabaseUtils; DatabaseUtils.create_indexes()"

# Run the Flask server
python app.py
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Set environment variables
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start the development server
npm start
```

### Database Setup
```bash
# Start MongoDB service
mongod

# Optional: Import sample data
mongoimport --db university_ms --collection users --file sample_data/users.json
```

## 🎯 Usage

### Demo Credentials
The system comes with pre-configured demo accounts:

**Student Account**
- Username: `student1`
- Password: `password123`

**Teacher Account**
- Username: `teacher1`
- Password: `password123`

**Admin Account**
- Username: `admin1`
- Password: `password123`

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

#### Student APIs
- `GET /api/student/courses/available` - List available courses
- `POST /api/student/courses/enroll/{course_id}` - Enroll in course
- `GET /api/student/courses/my` - Get enrolled courses
- `GET /api/student/courses/{course_id}/assignments` - Course assignments
- `POST /api/student/assignments/{assignment_id}/submit` - Submit assignment
- `GET /api/student/transcript` - Generate transcript PDF

#### Teacher APIs
- `GET /api/teacher/courses/my` - Get taught courses
- `POST /api/teacher/courses/{course_id}/assignments` - Create assignment
- `GET /api/teacher/assignments/{assignment_id}/submissions` - View submissions
- `POST /api/teacher/submissions/{submission_id}/grade` - Grade submission
- `POST /api/teacher/courses/{course_id}/attendance` - Record attendance

#### Admin APIs
- `GET /api/admin/users` - List all users
- `POST /api/admin/courses` - Create course
- `PUT /api/admin/courses/{course_id}/assign-teacher` - Assign teacher
- `GET /api/admin/analytics` - System analytics

## 📱 User Interface

### Modern Design
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Material Design**: Consistent UI components and interactions
- **Dark/Light Theme**: User preference support
- **Accessibility**: WCAG 2.1 compliant interface
- **Progressive Web App**: PWA capabilities for offline access

### User Experience
- **Intuitive Navigation**: Role-based menu systems
- **Real-time Updates**: Live notifications and status updates
- **Smooth Animations**: Micro-interactions for better UX
- **Loading States**: Progress indicators for all operations
- **Error Handling**: User-friendly error messages and recovery

## 🔧 Development

### Project Structure
```
university-management-system/
├── backend/
│   ├── app.py                 # Flask application entry point
│   ├── config.py              # Configuration settings
│   ├── models.py              # Pydantic data models
│   ├── routes/                # API endpoints
│   │   ├── auth_routes.py     # Authentication APIs
│   │   ├── student_routes.py  # Student portal APIs
│   │   ├── teacher_routes.py  # Teacher portal APIs
│   │   └── admin_routes.py    # Admin portal APIs
│   └── utils/                 # Utility modules
│       ├── security.py        # Security functions
│       ├── database.py        # Database utilities
│       └── pdf_generator.py   # PDF generation
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   └── services/          # API services
│   └── public/                # Static assets
└── README.md
```

### Code Quality
- **Type Safety**: TypeScript for frontend, Pydantic for backend
- **Linting**: ESLint for JavaScript, Pylint for Python
- **Testing**: Jest for frontend, pytest for backend
- **Documentation**: Comprehensive inline documentation
- **Version Control**: Git with conventional commits

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**
   - Set production environment variables
   - Configure MongoDB replica set
   - Enable SSL/TLS encryption
   - Set up monitoring and logging

2. **Backend Deployment**
   - Use Gunicorn with multiple workers
   - Configure reverse proxy (Nginx)
   - Set up database connection pooling
   - Enable monitoring and health checks

3. **Frontend Deployment**
   - Build optimized production bundle
   - Configure CDN for static assets
   - Enable gzip compression
   - Set up error tracking

### Performance Optimizations
- **Caching**: Redis for session and query caching
- **Database**: Optimized indexes and aggregation pipelines
- **CDN**: Static asset delivery optimization
- **Load Balancing**: Multi-instance deployment support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Full-Stack Development**: Modern React + Flask architecture
- **Database Design**: MongoDB with advanced features
- **Security Implementation**: Enterprise-grade security measures
- **UI/UX Design**: Material Design principles
- **Documentation**: Comprehensive technical documentation

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation and API reference
- Review the demo implementation for examples

## 🎯 Future Enhancements

- **Mobile Applications**: Native iOS and Android apps
- **Real-time Chat**: Student-teacher communication system
- **Integration APIs**: Third-party system integrations
- **Advanced Analytics**: Machine learning insights
- **Blockchain Certificates**: Secure credential verification
- **Video Conferencing**: Integrated virtual classrooms

---

**Built with ❤️ for modern education management** 