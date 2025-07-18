from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Any, Optional
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from bson import ObjectId
from extensions import mongo

class PDFGenerator:
    """Utility class for generating various PDF reports."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Set up custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.darkgreen,
            borderWidth=1,
            borderColor=colors.lightgrey,
            borderPadding=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))
    
    def generate_transcript(self, student_id: ObjectId, output_path: Optional[str] = None) -> BytesIO:
        """Generate student transcript PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer if not output_path else output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Get student data
        student = mongo.db.users.find_one({"_id": student_id, "role": "student"})
        if not student:
            raise ValueError("Student not found")
        
        # Get enrollment data with grades
        enrollments = list(mongo.db.enrollments.aggregate([
            {"$match": {"student_id": student_id}},
            {"$lookup": {
                "from": "courses",
                "localField": "course_id",
                "foreignField": "_id",
                "as": "course"
            }},
            {"$unwind": "$course"},
            {"$lookup": {
                "from": "grades",
                "let": {"student_id": "$student_id", "course_id": "$course_id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$student_id", "$$student_id"]},
                                {"$eq": ["$course_id", "$$course_id"]}
                            ]
                        }
                    }}
                ],
                "as": "grade_info"
            }},
            {"$sort": {"course.year": 1, "course.semester": 1}}
        ]))
        
        # Build PDF content
        story = []
        
        # Header
        story.append(Paragraph("UNIVERSITY MANAGEMENT SYSTEM", self.styles['CustomTitle']))
        story.append(Paragraph("Official Academic Transcript", self.styles['Heading2']))
        story.append(Spacer(1, 20))
        
        # Student Information
        student_info = [
            ['Student Name:', f"{student.get('first_name', '')} {student.get('last_name', '')}"],
            ['Student ID:', student.get('student_id_str', 'N/A')],
            ['Email:', student.get('email', '')],
            ['Major:', student.get('major', 'Undeclared')],
            ['Generated On:', datetime.now().strftime('%B %d, %Y')]
        ]
        
        student_table = Table(student_info, colWidths=[2*inch, 4*inch])
        student_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(student_table)
        story.append(Spacer(1, 20))
        
        # Academic Record
        story.append(Paragraph("Academic Record", self.styles['SectionHeader']))
        
        # Group by semester/year
        semesters = {}
        total_credits = 0
        total_points = 0
        
        for enrollment in enrollments:
            course = enrollment['course']
            grade_info = enrollment.get('grade_info', [])
            grade = grade_info[0] if grade_info else {}
            
            semester_key = f"{course['semester']} {course['year']}"
            if semester_key not in semesters:
                semesters[semester_key] = []
            
            grade_letter = grade.get('final_grade', 'IP')  # IP = In Progress
            grade_points = self._letter_to_points(grade_letter)
            credits = course.get('credits', 0)
            
            if grade_letter not in ['IP', 'W', 'I']:  # Only count completed courses
                total_credits += credits
                total_points += grade_points * credits
            
            semesters[semester_key].append({
                'course_code': course['course_code'],
                'course_name': course['course_name'],
                'credits': credits,
                'grade': grade_letter
            })
        
        # Create semester tables
        for semester, courses in semesters.items():
            story.append(Paragraph(semester, self.styles['Heading3']))
            
            course_data = [['Course Code', 'Course Name', 'Credits', 'Grade']]
            semester_credits = 0
            
            for course in courses:
                course_data.append([
                    course['course_code'],
                    course['course_name'][:40] + '...' if len(course['course_name']) > 40 else course['course_name'],
                    str(course['credits']),
                    course['grade']
                ])
                if course['grade'] not in ['IP', 'W', 'I']:
                    semester_credits += course['credits']
            
            course_data.append(['', 'Semester Credits:', str(semester_credits), ''])
            
            course_table = Table(course_data, colWidths=[1*inch, 3*inch, 0.8*inch, 0.8*inch])
            course_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            story.append(course_table)
            story.append(Spacer(1, 15))
        
        # GPA Calculation
        gpa = total_points / total_credits if total_credits > 0 else 0.0
        
        summary_data = [
            ['Total Credits Completed:', str(total_credits)],
            ['Cumulative GPA:', f"{gpa:.2f}"],
            ['Academic Standing:', self._get_academic_standing(gpa)]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightblue),
        ]))
        story.append(summary_table)
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            "This is an official transcript. Any alterations will void this document.",
            self.styles['Footer']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_grade_report(self, student_id: ObjectId, course_id: ObjectId) -> BytesIO:
        """Generate detailed grade report for a student in a specific course."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Get data
        student = mongo.db.users.find_one({"_id": student_id})
        course = mongo.db.courses.find_one({"_id": course_id})
        grades = mongo.db.grades.find_one({"student_id": student_id, "course_id": course_id})
        
        story = []
        
        # Header
        story.append(Paragraph("Grade Report", self.styles['CustomTitle']))
        story.append(Spacer(1, 20))
        
        # Student and Course Info
        info_data = [
            ['Student:', f"{student.get('first_name', '')} {student.get('last_name', '')}"],
            ['Course:', f"{course['course_code']} - {course['course_name']}"],
            ['Semester:', f"{course['semester']} {course['year']}"],
            ['Instructor:', self._get_teacher_name(course.get('teacher_id'))]
        ]
        
        info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Grade Breakdown
        if grades and grades.get('components'):
            story.append(Paragraph("Grade Breakdown", self.styles['SectionHeader']))
            
            grade_data = [['Component', 'Points Earned', 'Total Points', 'Percentage']]
            total_earned = 0
            total_possible = 0
            
            for component in grades['components']:
                percentage = (component['points_earned'] / component['total_points'] * 100) if component['total_points'] > 0 else 0
                grade_data.append([
                    component['name'],
                    f"{component['points_earned']:.1f}",
                    f"{component['total_points']:.1f}",
                    f"{percentage:.1f}%"
                ])
                total_earned += component['points_earned']
                total_possible += component['total_points']
            
            overall_percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0
            grade_data.append([
                'TOTAL',
                f"{total_earned:.1f}",
                f"{total_possible:.1f}",
                f"{overall_percentage:.1f}%"
            ])
            
            grade_table = Table(grade_data, colWidths=[2*inch, 1*inch, 1*inch, 1*inch])
            grade_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(grade_table)
            
            story.append(Spacer(1, 20))
            story.append(Paragraph(
                f"Final Grade: {grades.get('final_grade', 'Not Assigned')}",
                self.styles['Heading3']
            ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_teacher_analytics(self, teacher_id: ObjectId) -> BytesIO:
        """Generate analytics report for a teacher."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get teacher and course data
        teacher = mongo.db.users.find_one({"_id": teacher_id})
        courses = list(mongo.db.courses.find({"teacher_id": teacher_id}))
        
        story = []
        
        # Header
        story.append(Paragraph("Teacher Analytics Report", self.styles['CustomTitle']))
        story.append(Paragraph(
            f"Instructor: {teacher.get('first_name', '')} {teacher.get('last_name', '')}",
            self.styles['Heading2']
        ))
        story.append(Spacer(1, 20))
        
        # Course Summary
        story.append(Paragraph("Course Summary", self.styles['SectionHeader']))
        
        course_data = [['Course Code', 'Course Name', 'Enrolled', 'Capacity', 'Assignments', 'Quizzes']]
        
        for course in courses:
            enrolled_count = mongo.db.enrollments.count_documents({
                "course_id": course['_id'],
                "status": "enrolled"
            })
            
            assignment_count = mongo.db.assignments.count_documents({
                "course_id": course['_id']
            })
            
            quiz_count = mongo.db.quizzes.count_documents({
                "course_id": course['_id']
            })
            
            course_data.append([
                course['course_code'],
                course['course_name'][:30] + '...' if len(course['course_name']) > 30 else course['course_name'],
                str(enrolled_count),
                str(course.get('max_capacity', 'N/A')),
                str(assignment_count),
                str(quiz_count)
            ])
        
        course_table = Table(course_data, colWidths=[1*inch, 2.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
        course_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(course_table)
        
        # Add performance charts if data exists
        if courses:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Performance Analytics", self.styles['SectionHeader']))
            
            # Generate and embed charts
            chart_buffer = self._generate_teacher_charts(teacher_id, courses)
            if chart_buffer:
                chart_image = Image(chart_buffer, width=6*inch, height=4*inch)
                story.append(chart_image)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_admin_summary(self, start_date: datetime, end_date: datetime) -> BytesIO:
        """Generate comprehensive admin summary report."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        story = []
        
        # Header
        story.append(Paragraph("University Management System", self.styles['CustomTitle']))
        story.append(Paragraph("Administrative Summary Report", self.styles['Heading2']))
        story.append(Paragraph(
            f"Period: {start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 20))
        
        # System Statistics
        stats = self._get_system_statistics()
        
        story.append(Paragraph("System Statistics", self.styles['SectionHeader']))
        
        stats_data = [
            ['Total Students:', str(stats['students'])],
            ['Total Teachers:', str(stats['teachers'])],
            ['Total Courses:', str(stats['courses'])],
            ['Active Enrollments:', str(stats['active_enrollments'])],
            ['Total Assignments:', str(stats['assignments'])],
            ['Total Quizzes:', str(stats['quizzes'])]
        ]
        
        stats_table = Table(stats_data, colWidths=[2*inch, 1.5*inch])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightblue),
        ]))
        story.append(stats_table)
        
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            f"Report generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['Footer']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _letter_to_points(self, letter_grade: str) -> float:
        """Convert letter grade to grade points."""
        grade_points = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0, 'W': 0.0, 'I': 0.0, 'IP': 0.0
        }
        return grade_points.get(letter_grade, 0.0)
    
    def _get_academic_standing(self, gpa: float) -> str:
        """Determine academic standing based on GPA."""
        if gpa >= 3.5:
            return "Dean's List"
        elif gpa >= 3.0:
            return "Good Standing"
        elif gpa >= 2.0:
            return "Satisfactory"
        else:
            return "Academic Probation"
    
    def _get_teacher_name(self, teacher_id: ObjectId) -> str:
        """Get teacher name from ID."""
        if not teacher_id:
            return "Not Assigned"
        
        teacher = mongo.db.users.find_one({"_id": teacher_id})
        if teacher:
            return f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip()
        return "Unknown"
    
    def _generate_teacher_charts(self, teacher_id: ObjectId, courses: List[Dict]) -> Optional[BytesIO]:
        """Generate performance charts for teacher analytics."""
        try:
            fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 8))
            
            # Course enrollment chart
            course_names = [course['course_code'] for course in courses]
            enrollments = []
            for course in courses:
                count = mongo.db.enrollments.count_documents({
                    "course_id": course['_id'],
                    "status": "enrolled"
                })
                enrollments.append(count)
            
            ax1.bar(course_names, enrollments)
            ax1.set_title('Course Enrollments')
            ax1.set_ylabel('Number of Students')
            
            # Assignment/Quiz distribution
            assignments = [mongo.db.assignments.count_documents({"course_id": course['_id']}) for course in courses]
            quizzes = [mongo.db.quizzes.count_documents({"course_id": course['_id']}) for course in courses]
            
            x = range(len(course_names))
            width = 0.35
            ax2.bar([i - width/2 for i in x], assignments, width, label='Assignments')
            ax2.bar([i + width/2 for i in x], quizzes, width, label='Quizzes')
            ax2.set_title('Assignments vs Quizzes')
            ax2.set_xticks(x)
            ax2.set_xticklabels(course_names)
            ax2.legend()
            
            # Grade distribution (placeholder)
            grades = ['A', 'B', 'C', 'D', 'F']
            grade_counts = [15, 25, 20, 8, 2]  # Mock data
            ax3.pie(grade_counts, labels=grades, autopct='%1.1f%%')
            ax3.set_title('Grade Distribution')
            
            # Attendance trend (placeholder)
            weeks = list(range(1, 16))
            attendance = [95 - i * 0.5 for i in weeks]  # Mock declining attendance
            ax4.plot(weeks, attendance)
            ax4.set_title('Average Attendance Trend')
            ax4.set_xlabel('Week')
            ax4.set_ylabel('Attendance %')
            
            plt.tight_layout()
            
            chart_buffer = BytesIO()
            plt.savefig(chart_buffer, format='png', dpi=150, bbox_inches='tight')
            chart_buffer.seek(0)
            plt.close()
            
            return chart_buffer
            
        except Exception as e:
            print(f"Error generating charts: {e}")
            return None
    
    def _get_system_statistics(self) -> Dict[str, int]:
        """Get system-wide statistics."""
        return {
            'students': mongo.db.users.count_documents({"role": "student"}),
            'teachers': mongo.db.users.count_documents({"role": "teacher"}),
            'courses': mongo.db.courses.count_documents({}),
            'active_enrollments': mongo.db.enrollments.count_documents({"status": "enrolled"}),
            'assignments': mongo.db.assignments.count_documents({}),
            'quizzes': mongo.db.quizzes.count_documents({})
        } 