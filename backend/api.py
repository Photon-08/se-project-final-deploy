# backend/api.py
from flask import jsonify, logging, request, current_app
from flask_restful import Api, Resource, fields, marshal_with, reqparse
from flask_security import auth_required, current_user, roles_required
from backend.model import * 
from datetime import datetime
from backend.ai.course_content_assistant import CourseContentAssistant
from backend.ai.programming_assistant import ProgrammingAssistant
from backend.ai.assignment_helper import AssignmentHelper
from backend.ai.study_planner import StudyPlanner
from backend.ai.grading_assistant import GradingAssistant
from backend.ai.feedback_review import analyze_sentiment
import os
import pytz
IST = pytz.timezone('Asia/Kolkata')  # Define IST timezone


api = Api(prefix='/api')

# Admin can Add , Edit and Update course info | Like course name , credit , assign instructor
class Admin_Course_API(Resource):
    
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('course_name', type=str, required=True, help="Course name is required")
    post_parser.add_argument('credits', type=int, required=True, help="Credits are required")
    #post_parser.add_argument('instructor_id', type=int, required=True, help="Instructor ID is required")

    @auth_required("token")
    @roles_required("admin")
    def post(self):
        args = self.post_parser.parse_args()
        course_name = args['course_name']
        credits = args['credits']

        existing_course = Course.query.filter_by(course_name=course_name).first()
        if existing_course:
            return {
                "message": f"Course '{course_name}' already exists."
            }, 400

        new_course = Course(
            course_name=course_name,
            credits=credits #,
            #instructor_id = args['instructor_id']
        )

        # try:
        db.session.add(new_course)
        db.session.commit()
        return {
            "message": "Course added successfully",
            "course": {
                "id": new_course.id,
                "course_name": new_course.course_name,
                "credits": new_course.credits
            }
        }, 201
        # except Exception as e:
        #     db.session.rollback()
        #     return {"message": f"Error creating course: {str(e)}"}, 500


    get_parser = reqparse.RequestParser()


    # @auth_required("token") 
    # @roles_required("admin")
    def get(self):
        courses = Course.query.all()

        all_courses = []
        for course in courses:
            all_courses.append({
                "id": course.id,
                "course_name": course.course_name,
                "instructor_id": course.instructor_id,
                "credits": course.credits
            })

        if len(all_courses) > 0:
            return all_courses, 200
        else:
            return {"message": "No courses found"}, 404

    

    put_parser = reqparse.RequestParser()
    put_parser.add_argument('id', type=int, required=True, help="Course ID is required")
    put_parser.add_argument('course_name', type=str, required=False, help="Course name is optional")
    put_parser.add_argument('credits', type=int, required=False, help="Credits are optional")
    put_parser.add_argument('instructor_id', type=int, required=False, help="Instructor ID is optional")

    # @auth_required("token") 
    # @roles_required("admin")
    def put(self):
        args = self.put_parser.parse_args()
        course_id = args['id']
        course = Course.query.get(course_id)

        if not course:
            return {"message": f"Course with ID {course_id} not found."}, 404

        if args['course_name']:
            course.course_name = args['course_name']
        if args['credits'] is not None:
            course.credits = args['credits']
        if args.get('instructor_id') is not None:
            instructor_id = args['instructor_id']
            
            instructor = User.query.filter_by(id=instructor_id).first()
            if not instructor:
                return {"message": f"Instructor with ID {instructor_id} not found."}, 404
            
            if 'instructor' not in [role.name for role in instructor.roles]:
                return {"message": "User is not an instructor"}, 400

            course.instructor_id = instructor_id

        db.session.commit()

        # Assign instructor to instructor table
        return {
            "message": "Course updated successfully",
            "course": {
                "id": course.id,
                "course_name": course.course_name,
                "credits": course.credits,
                "instructor_id": course.instructor_id
            }
        }, 200
    

# Course Registration 
class Course_Registration_API(Resource):
    
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('course_ids', type=list, required=True, help="List of course IDs to register for", location='json')

    @auth_required("token")
    def post(self):
        args = self.post_parser.parse_args()
        course_ids = args['course_ids']
        current_student = current_user

        term = "May 2025"  # term

        # Check if the user is already registered for 4 courses
        existing_courses_count = CourseOpted.query.filter_by(user_id=current_student.id, term=term).count()

        if existing_courses_count >= 4:
            return {"message": "You can register for a maximum of 4 courses per term."}, 400

        # Loop through each course in the provided list
        for course_id in course_ids:
            # Check if the user has already registered for this course in any previous terms
            existing_registration = CourseOpted.query.filter_by(user_id=current_student.id, course_id=course_id).first()
            if existing_registration:
                return {"message": f"You are already registered for course ID {course_id} in a previous term."}, 400

            # If the user has not registered for this course in a previous term, register them
            new_registration = CourseOpted(
                user_id=current_student.id,
                course_id=course_id,
                term=term,
                status=True  # Assuming the registration status is active
            )

            # Add the new registration to the session
            db.session.add(new_registration)

        # Commit the session after adding all the registrations
        db.session.commit()

        return {"message": "Courses registered successfully."}, 201
    

# Displays couses on the User_Dahboard
class User_Course_API(Resource):

    @auth_required("token")
    @roles_required("student")
    def get(self):
        current_student = current_user
        registrations = db.session.query(CourseOpted, Course).join(Course, CourseOpted.course_id == Course.id) \
            .filter(CourseOpted.user_id == current_student.id, CourseOpted.status == True).all()

        if not registrations:
            return jsonify({"message": "You are not registered for any courses."}), 404

        courses = []
        for registration, course in registrations:
            course_data = {
                "course_id": course.id,
                "course_name": course.course_name,
                "credits": course.credits,
                "term": registration.term
            }
            courses.append(course_data)

        if len(courses) > 0:
            return courses, 200
        else:
            return {"message": "No courses found"}, 404

class Course_Details_API(Resource):
    
    def get(self, course_id):
        course = Course.query.get(course_id)
        print(course_id)
        if not course:
            return {"message": "Course not found."}, 404

        # Get course content
        course_content = CourseContent.query.filter_by(course_id=course_id).all()

        # Get instructor info
        instructor = Instructor.query.filter_by(course_id=course_id).first()
        if instructor:
            instructor_name = User.query.get(instructor.instructor_id).name
        else:
            instructor_name = "Unknown"

        # Get assignments for the course
        assignments = Assignment.query.filter_by(course_id=course_id).all()

        # Organize assignments by week
        assignment_content_by_week = {}
        for assignment in assignments:
            questions = assignment.assignment_content.split(',') if assignment.assignment_content else []
            options = assignment.assignment_options.split(',') if assignment.assignment_options else []
            correct_answers = assignment.assignment_correct_answer.split(',') if assignment.assignment_correct_answer else []
            
            grouped_options = []
            for i in range(0, len(options), 4):
                group = options[i:i+4]
                while len(group) < 4:
                    group.append("")
                grouped_options.append(group)
            
            title_parts = assignment.title.split()[-1].split('.')
            week_no = int(title_parts[0])
            assignment_no = int(title_parts[1])
            
            assignment_data = {
                'id': assignment.id,
                'title': assignment.title,
                'description': assignment.description,
                'due_date': assignment.due_date.isoformat() if assignment.due_date else None,
                'max_marks': assignment.max_marks,
                'status': assignment.status,
                'questions': questions,
                'options': grouped_options,
                'correct_answers': correct_answers,
                'assignment_no': assignment_no
            }

            if week_no not in assignment_content_by_week:
                assignment_content_by_week[week_no] = []
            assignment_content_by_week[week_no].append(assignment_data)

        structured_assignments = [
            {"week": week_no, "assignments": sorted(assignment_content_by_week[week_no], key=lambda x: x["assignment_no"])}
            for week_no in sorted(assignment_content_by_week.keys())
        ]

        # Organize course content by week
        content_by_week = {}
        for content in course_content:
            week_no, lecture_no = map(int, content.lecture_no.split('.'))
            if week_no not in content_by_week:
                content_by_week[week_no] = []
            content_by_week[week_no].append({
                "lecture_no": lecture_no,
                "lecture_url": content.lecture_url
            })

        structured_content = [
            {"week": week_no, "lectures": sorted(content_by_week[week_no], key=lambda x: x["lecture_no"])}
            for week_no in sorted(content_by_week.keys())
        ]

        return {
            "course": {
                "course_name": course.course_name,
                "credits": course.credits,
            },
            "instructor_name": instructor_name,
            "content": structured_content,
            "assignments": structured_assignments

        }, 200


class Instructor_Assigned_Course_API(Resource):
    
    @auth_required("token")
    def get(self):
        instructor = current_user  # Get the current logged-in instructor

        # Fetch all courses assigned to the instructor
        courses = Course.query.filter_by(instructor_id=instructor.id).all()

        if not courses:
            return {"message": "You are not assigned to any courses."}, 404

        # Format the response
        all_courses = [
            {
                "course_id": course.id,
                "course_name": course.course_name,
                "instructor_id": course.instructor_id,
                "credits": course.credits
            }
            for course in courses
        ]
        print(all_courses)
        return all_courses, 200


# Get | Post -> Course_Content
class Instructor_Course_Content_API(Resource):
    # @auth_required("token")
    def get(self, course_id):
        current_instructor = current_user
        course = Course.query.filter_by(id=course_id, instructor_id=current_instructor.id).first()

        if not course:
            return {"message": "Course not found or you are not authorized."}, 404

        course_content = CourseContent.query.filter_by(course_id=course_id).all()

        content_by_week = {}
        for content in course_content:
            week_no, lecture_no = map(int, content.lecture_no.split('.'))
            if week_no not in content_by_week:
                content_by_week[week_no] = []
            content_by_week[week_no].append({
                "lecture_no": lecture_no,
                "lecture_url": content.lecture_url
            })

        structured_content = [
            {"week": week_no, "lectures": sorted(content_by_week[week_no], key=lambda x: x["lecture_no"])}
            for week_no in sorted(content_by_week.keys())
        ]

        return {"course_content": structured_content}, 200

    @auth_required("token")
    def post(self, course_id):
        current_instructor = current_user
        data = request.get_json()

        if not data or "content" not in data:
            return {"message": "Invalid or missing content data."}, 400

        course = Course.query.filter_by(id=course_id, instructor_id=current_instructor.id).first()

        if not course:
            return {"message": "Course not found or you are not authorized."}, 404

        # Clear existing content for the course
        CourseContent.query.filter_by(course_id=course_id).delete()

        content_list = data["content"]
        if not isinstance(content_list, list) or len(content_list) == 0:
            return {"message": "Content data should be a non-empty list."}, 400

        for entry in content_list:
            if "lecture_no" not in entry or "lecture_url" not in entry:
                return {"message": "Each content entry must include lecture_no and lecture_url."}, 400

            new_content = CourseContent(
                course_id=course_id,
                lecture_no=entry["lecture_no"],
                lecture_url=entry["lecture_url"],
                instructor_id=current_instructor.id
            )
            db.session.add(new_content)

        db.session.commit()
        return {"message": "Course content updated successfully!"}, 201
    

# Assignment Management
class Instructor_Assignment_API(Resource):
    @auth_required('token')
    def get(self, course_id):
        try:
            # Fetch all assignments for the course
            assignments = Assignment.query.filter_by(course_id=course_id).all()
            
            # Organize assignments by week
            content_by_week = {}
            for assignment in assignments:
                # Parse the comma-separated data
                questions = assignment.assignment_content.split(',') if assignment.assignment_content else []
                options = assignment.assignment_options.split(',') if assignment.assignment_options else []
                correct_answers = assignment.assignment_correct_answer.split(',') if assignment.assignment_correct_answer else []
                
                # Group options in sets of 4
                grouped_options = []
                for i in range(0, len(options), 4):
                    group = options[i:i+4]
                    # Pad with empty strings if less than 4 options
                    while len(group) < 4:
                        group.append("")
                    grouped_options.append(group)
                
                # Extract week and assignment number from the assignment title
                title_parts = assignment.title.split()[-1].split('.')
                week_no = int(title_parts[0])
                assignment_no = int(title_parts[1])
                
                assignment_data = {
                    'id': assignment.id,
                    'title': assignment.title,
                    'description': assignment.description,
                    'due_date': assignment.due_date.isoformat() if assignment.due_date else None,
                    'max_marks': assignment.max_marks,
                    'status': assignment.status,
                    'questions': questions,
                    'options': grouped_options,
                    'correct_answers': correct_answers,
                    'assignment_no': assignment_no
                }

                if week_no not in content_by_week:
                    content_by_week[week_no] = []
                content_by_week[week_no].append(assignment_data)

            # Structure and sort assignments by week and assignment number
            structured_content = [
                {"week": week_no, "assignments": sorted(content_by_week[week_no], key=lambda x: x["assignment_no"])}
                for week_no in sorted(content_by_week.keys())
            ]
            #print(structured_content)
            return jsonify({
                'status': 'success',
                'assignments': structured_content
            })
            
        except Exception as e:
            return jsonify({'status': 'error','message': str(e)}), 500

    @auth_required('token')
    def post(self, course_id):
        try:
            data = request.get_json()
            
            if not data or 'assignments' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid data format'
                }), 400
            
            # Process each assignment
            for assignment_data in data['assignments']:
                # Check if assignment already exists by title and course_id
                assignment_title = assignment_data.get('title')
                
                if assignment_title:
                    assignment = Assignment.query.filter_by(course_id=course_id, title=assignment_title).first()
                    if assignment:
                        # Update existing assignment
                        assignment.description = assignment_data.get('description', '')
                        
                        # Parse due date
                        due_date_str = assignment_data.get('due_date')
                        if due_date_str:
                            try:
                                assignment.due_date = datetime.fromisoformat(due_date_str)
                            except ValueError:
                                return jsonify({
                                    'status': 'error',
                                    'message': f'Invalid date format for {assignment.title}'
                                }), 400
                        
                        assignment.max_marks = assignment_data.get('max_marks', 0)
                        assignment.status = assignment_data.get('status', 'draft')
                        
                        # Process questions, options, and answers
                        questions = assignment_data.get('questions', [])
                        options = []
                        for option_group in assignment_data.get('options', []):
                            options.extend(option_group)
                        correct_answers = assignment_data.get('correct_answers', [])
                        
                        # Replace existing questions, options, and answers
                        assignment.assignment_content = ','.join(questions) if questions else None
                        assignment.assignment_options = ','.join(options) if options else None
                        assignment.assignment_correct_answer = ','.join(correct_answers) if correct_answers else None
                    else:
                        # Create new assignment
                        assignment = Assignment(
                            course_id=course_id,
                            title=assignment_title,
                            description=assignment_data.get('description', ''),
                            due_date=datetime.fromisoformat(assignment_data.get('due_date')) if assignment_data.get('due_date') else None,
                            max_marks=assignment_data.get('max_marks', 0),
                            status=assignment_data.get('status', 'draft'),
                            assignment_type='objective',  # Default to objective type
                            assignment_content=','.join(assignment_data.get('questions', [])) if assignment_data.get('questions', []) else None,
                            assignment_options=','.join([opt for group in assignment_data.get('options', []) for opt in group]) if assignment_data.get('options', []) else None,
                            assignment_correct_answer=','.join(assignment_data.get('correct_answers', [])) if assignment_data.get('correct_answers', []) else None
                        )
                        db.session.add(assignment)
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Assignment title is required'
                    }), 400
            
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Assignments updated successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error','message': str(e)}), 500



# Assignment Grading
class Assignment_Grading_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('submission_id', type=int, required=True, help="Submission ID is required")
    post_parser.add_argument('marks', type=float, required=True, help="Marks are required")
    post_parser.add_argument('feedback', type=str, required=True, help="Feedback is required")

    @auth_required("token")
    @roles_required("instructor")
    def post(self):
        args = self.post_parser.parse_args()
        submission = AssignmentSubmission.query.get(args['submission_id'])
        
        if not submission:
            return {"message": "Submission not found"}, 404

        # Get the assignment and its course
        assignment = Assignment.query.get(submission.assignment_id)
        if not assignment:
            return {"message": "Assignment not found"}, 404

        # Get the course and verify instructor
        course = Course.query.get(assignment.course_id)
        if not course or course.instructor_id != current_user.id:
            return {"message": "You are not authorized to grade this submission"}, 403

        # Verify marks are within range
        if args['marks'] > assignment.max_marks:
            return {"message": f"Marks cannot exceed maximum marks ({assignment.max_marks})"}, 400

        submission.marks = args['marks']
        submission.feedback = args['feedback']
        submission.graded_at = datetime.now()
        submission.graded_by = current_user.id

        db.session.commit()

        return {"message": "Submission graded successfully"}, 200

class Announcement_API(Resource):
    """
    API Resource for managing course announcements.
    
    Endpoints:
        POST /announcements - Create a new announcement
        GET /announcements?course_id=<id> - Get announcements for a course
        PUT /announcements - Update an announcement
        DELETE /announcements/<announcement_id> - Delete an announcement
    
    Authorization:
        - POST/PUT/DELETE requires instructor role
        - GET requires course enrollment or instructor role
    """
    
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('course_id', type=int, required=True, 
                           help="Course ID is required")
    post_parser.add_argument('title', type=str, required=True, 
                           help="Announcement title is required")
    post_parser.add_argument('content', type=str, required=True, 
                           help="Announcement content is required")
    post_parser.add_argument('priority', type=str, required=False, 
                           default='normal', 
                           choices=['high', 'normal', 'low'],
                           help="Priority must be one of: high, normal, low")

    put_parser = reqparse.RequestParser()
    put_parser.add_argument('announcement_id', type=int, required=True, 
                          help="Announcement ID is required")
    put_parser.add_argument('title', type=str, required=False)
    put_parser.add_argument('content', type=str, required=False)
    put_parser.add_argument('priority', type=str, required=False, 
                          choices=['high', 'normal', 'low'])

    @auth_required("token")
    @roles_required("instructor")
    def post(self):
        """Create a new announcement for a course."""
        args = self.post_parser.parse_args()
        
        # Verify instructor is assigned to the course
        course = Course.query.get(args['course_id'])
        if not course or course.instructor_id != current_user.id:
            return {"message": "Not authorized to create announcements for this course"}, 403

        try:
            announcement = Announcement(
                course_id=args['course_id'],
                title=args['title'],
                content=args['content'],
                priority=args['priority'],
                created_by=current_user.id
            )
            
            db.session.add(announcement)
            db.session.commit()

            return {
                "message": "Announcement created successfully",
                "announcement": {
                    "id": announcement.id,
                    "title": announcement.title,
                    "created_at": announcement.created_at.strftime('%Y-%m-%d %H:%M:%S')
                }
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error creating announcement: {str(e)}"}, 500

    @auth_required("token")
    def get(self):
        """Get announcements for a course."""
        course_id = request.args.get('course_id', type=int)
        if not course_id:
            return {"message": "Course ID is required"}, 400

        try:
            # Check if user is enrolled in the course or is the instructor
            if 'student' in [role.name for role in current_user.roles]:
                enrollment = CourseOpted.query.filter_by(
                    user_id=current_user.id,
                    course_id=course_id,
                    status=True
                ).first()
                if not enrollment:
                    return {"message": "Not enrolled in this course"}, 403

            announcements = Announcement.query.filter_by(course_id=course_id)\
                .order_by(Announcement.created_at.desc()).all()

            return {
                "announcements": [{
                    "id": ann.id,
                    "title": ann.title,
                    "content": ann.content,
                    "priority": ann.priority,
                    "created_at": ann.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    "created_by": User.query.get(ann.created_by).name
                } for ann in announcements]
            }, 200
        except Exception as e:
            return {"message": f"Error fetching announcements: {str(e)}"}, 500

    @auth_required("token")
    @roles_required("instructor")
    def put(self):
        """Update an existing announcement."""
        args = self.put_parser.parse_args()
        
        try:
            announcement = Announcement.query.get(args['announcement_id'])
            if not announcement:
                return {"message": "Announcement not found"}, 404

            # Verify instructor owns the announcement
            course = Course.query.get(announcement.course_id)
            if not course or course.instructor_id != current_user.id:
                return {"message": "Not authorized to update this announcement"}, 403

            if args['title']:
                announcement.title = args['title']
            if args['content']:
                announcement.content = args['content']
            if args['priority']:
                announcement.priority = args['priority']

            db.session.commit()
            return {"message": "Announcement updated successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error updating announcement: {str(e)}"}, 500

    @auth_required("token")
    @roles_required("instructor")
    def delete(self, announcement_id):
        """Delete an announcement."""
        try:
            announcement = Announcement.query.get(announcement_id)
            if not announcement:
                return {"message": "Announcement not found"}, 404

            # Verify instructor owns the announcement
            course = Course.query.get(announcement.course_id)
            if not course or course.instructor_id != current_user.id:
                return {"message": "Not authorized to delete this announcement"}, 403

            db.session.delete(announcement)
            db.session.commit()
            return {"message": "Announcement deleted successfully"}, 200
        except Exception as e:
            db.session.rollback()
            return {"message": f"Error deleting announcement: {str(e)}"}, 500

class AI_Course_Content_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('question', type=str, required=True, 
                           help="Question is required")

    @auth_required("token")
    @roles_required("student")
    def post(self, course_id):
        args = self.post_parser.parse_args()
        
        # Verify enrollment
        enrollment = CourseOpted.query.filter_by(
            user_id=current_user.id,
            course_id=course_id,
            status=True
        ).first()
        
        if not enrollment:
            return {"message": "Not enrolled in this course"}, 403

        try:
            # Create directories if they don't exist
            course_dir = f"backend/ai/course_materials/{course_id}"
            os.makedirs(course_dir, exist_ok=True)
            os.makedirs("tmp/lancedb", exist_ok=True)

            # Check if directory has PDFs
            if not any(f.endswith('.pdf') for f in os.listdir(course_dir)):
                return {
                    "message": "No course materials available yet",
                    "error": "No PDF files found in course directory"
                }, 404

            # Pass the current user's ID to the CourseContentAssistant
            assistant = CourseContentAssistant(course_id, current_user.id)
            response = assistant.get_response(args['question'])
            #print(response)
            
            if response["status"] == "success":
                return {
                    "message": "Response generated successfully",
                    "response": response["response"]
                }, 200
                
            else:
                return {
                    "message": "Error generating response",
                    "error": response["message"]
                }, 500
                
        except Exception as e:
            current_app.logger.error(f"Course Content Assistant error: {str(e)}")
            return {
                "message": "Error processing request",
                "error": str(e)
            }, 500

class AI_Programming_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('question', type=str, required=True, 
                           help="Question is required")

    @auth_required("token")
    @roles_required("student")
    def post(self):
        args = self.post_parser.parse_args()
        # Pass the user_id to the ProgrammingAssistant
        assistant = ProgrammingAssistant(current_user.id)
        response = assistant.get_response(args['question'])
        return response

class AI_Assignment_Helper_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('question', type=str, required=True, 
                           help="Question is required")

    @auth_required("token")
    @roles_required("student")
    def post(self, course_id, assignment_id):
        args = self.post_parser.parse_args()
        
        # Verify student is enrolled in the course
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return {"message": "Assignment not found"}, 404
            
        # Verify assignment belongs to course
        if assignment.course_id != course_id:
            return {"message": "Assignment does not belong to this course"}, 400
            
        enrollment = CourseOpted.query.filter_by(
            user_id=current_user.id,
            course_id=course_id,
            status=True
        ).first()
        
        if not enrollment:
            return {"message": "Not enrolled in this course"}, 403

        try:
            # Pass the user_id to the AssignmentHelper
            assistant = AssignmentHelper(course_id, assignment_id, current_user.id)
            response = assistant.get_response(args['question'])
            return response
        except Exception as e:
            current_app.logger.error(f"Assignment Helper error: {str(e)}")
            return {
                "message": "Error processing request",
                "error": str(e)
            }, 500

class AI_Study_Planner_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('question', type=str, required=True, 
                           help="Question is required")

    @auth_required("token")
    @roles_required("student")
    def post(self, course_id):
        args = self.post_parser.parse_args()
        
        # Verify enrollment
        enrollment = CourseOpted.query.filter_by(
            user_id=current_user.id,
            course_id=course_id,
            status=True
        ).first()
        
        if not enrollment:
            return {"message": "Not enrolled in this course"}, 403

        # Pass the user_id to the StudyPlanner
        assistant = StudyPlanner(course_id, current_user.id)
        response = assistant.get_response(args['question'])
        return response

class AI_Grading_Assistant_API(Resource):
    post_parser = reqparse.RequestParser()
    post_parser.add_argument('student_response', type=str, required=True, 
                           help="Student's subjective response is required")
    post_parser.add_argument('rubric_name', type=str, required=False, 
                           help="Optional specific rubric name to use")

    @auth_required("token")
    @roles_required("instructor")
    def post(self, course_id):
        args = self.post_parser.parse_args()
        
        # Verify instructor is assigned to the course
        course = Course.query.filter_by(id=course_id, instructor_id=current_user.id).first()
        if not course:
            return {"message": "Not authorized to access grading for this course"}, 403

        try:
            # Create directories if they don't exist
            course_dir = f"backend/ai/course_materials/{course_id}"
            os.makedirs(course_dir, exist_ok=True)
            os.makedirs("tmp/lancedb", exist_ok=True)

            # Check if directory has PDFs (rubrics)
            if not any(f.endswith('rubric.pdf') for f in os.listdir(course_dir)):
                return {
                    "message": "No grading rubrics available",
                    "error": "No PDF files found in course directory"
                }, 404

            # Initialize the grading assistant with instructor's ID
            assistant = GradingAssistant(course_id, current_user.id)
            response = assistant.get_response(
                args['student_response'], 
                args.get('rubric_name')
            )
            
            if response["status"] == "success":
                return {
                    "message": "Analysis completed successfully",
                    "response": response["response"]
                }, 200
            else:
                return {
                    "message": "Error analyzing response",
                    "error": response["message"]
                }, 500
                
        except Exception as e:
            current_app.logger.error(f"Grading Assistant error: {str(e)}")
            return {
                "message": "Error processing request",
                "error": str(e)
            }, 500
        
        from flask import jsonify, request

from collections import Counter
import re

def generate_word_cloud(feedback_list):
    """Generate word frequency from feedback"""
    all_text = " ".join(feedback_list).lower()
    words = re.findall(r'\b[a-zA-Z]{3,}\b', all_text)  # Filter words with at least 3 letters
    word_freq = Counter(words).most_common(10)  # Get top 10 words
    return dict(word_freq)


class FeedbackAPI(Resource):
    def get(self, course_id):
        """Fetch all feedback for a specific course"""
        try:
            feedback_entries = Feedback.query.filter_by(course_id=course_id).all()
            
            structured_feedback = [
                {
                    "id": fb.id,
                    "student_id": fb.student_id,
                    "course_id": fb.course_id,
                    "feedback": fb.feedback,
                    "submitted_at": fb.submitted_at.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S") if fb.submitted_at else None
                }
                for fb in feedback_entries
            ]
            
            return jsonify({
                'status': 'success',
                'feedback': structured_feedback
            })

        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

    def post(self, course_id):
        """Submit feedback for a course"""
        try:
            data = request.get_json()

            if not data or 'student_id' not in data or 'feedback' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid data format. Required fields: student_id, feedback'
                }), 400

            # Get current IST time
            ist_now = datetime.now(IST)

            new_feedback = Feedback(
                student_id=data['student_id'],
                course_id=course_id,
                feedback=data['feedback'],
                submitted_at=ist_now  # Store IST time in the database
            )

            db.session.add(new_feedback)
            db.session.commit()

            return jsonify({
                'status': 'success',
                'message': 'Feedback submitted successfully'
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500



#for admin feedback review

class CourseSentiment(Resource):
    def get(self):
        """Fetches all feedback from the database and returns course-wise sentiment"""
        course_feedback = {}

        # Fetch all feedback entries with course details
        feedback_entries = db.session.query(Feedback.feedback, Course.course_name).join(Course, Feedback.course_id == Course.id).all()

        course_feedback_map = {}

        for feedback, course_name in feedback_entries:
            if course_name not in course_feedback_map:
                course_feedback_map[course_name] = []
            course_feedback_map[course_name].append(feedback)

        # Perform sentiment analysis for each course
        for course_name, feedbacks in course_feedback_map.items():
            course_feedback[course_name] = analyze_sentiment(feedbacks)

        return jsonify(course_feedback)
    

class CourseFeedbackAnalytics(Resource):
    def get(self, course_id):
        """Fetch feedback analytics for a specific course"""
        try:
            feedback_entries = Feedback.query.filter_by(course_id=course_id).all()
            
            if not feedback_entries:
                return jsonify({"status": "error", "message": "No feedback found for this course."}), 404
            
            feedback_texts = [fb.feedback for fb in feedback_entries]
            
            # Perform sentiment analysis for each feedback entry
            sentiment_results = analyze_sentiment(feedback_texts)
            print(sentiment_results)

            # Count positive, neutral, and negative feedback
            sentiment_counts = {
                "positive": sentiment_results.count("Positive"),
                "neutral": sentiment_results.count("Mixed"),
                "negative": sentiment_results.count("Negative"),
            }

            # Generate word cloud data
            word_freq = generate_word_cloud(feedback_texts)
            stop_word_list = ['the', 'and', 'or', 'is', 'are', 'to', 'in', 'on', 'of', 'for', 'with', 
                              'this', 'that', 'it', 'as', 'an', 'by', 'be', 'at', 'from', 'you', 'your', 
                              'we', 'our', 'us', 'they', 'them', 'he', 'she', 'his', 'her', 'their', 'a', 
                              'about', 'after', 'all', 'also', 'am',  'because', 
                              'been', 'but', 'can', 'could', 'do', 'does', 
                              'each', 'even', 'how', 'if', 'into', 'its', 'just', 
                              'like', 'may', 'more', 'no', 'not', 'now', 'only', 'other', 
                              'out', 'over', 'said', 'see', 'should', 'some', 'such', 'than', 'then', 
                              'there', 'these', 'thing', 'think', 'those', 'two', 'up', 'use', 'way', 'what', 
                              'when', 'which', 'who', 'will', 'would', 'year', 'you', 
                              'your']
            word_freq = {word: freq for word, freq in word_freq.items() if word not in stop_word_list}

            
            return jsonify({
                "status": "success",
                "course_id": course_id,
                "total_feedback": len(feedback_texts),
                "sentiment_counts": sentiment_counts,
                "word_cloud": word_freq
            })

        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500




api.add_resource(CourseFeedbackAnalytics, "/feedback-analytics/<int:course_id>")



api.add_resource(CourseSentiment, "/analyze-sentiment")



# Add resources to API
api.add_resource(Admin_Course_API, '/admin_course')                                 # Admin can Add, Edit and Update course info
api.add_resource(Course_Registration_API, '/course_registration')                   # User can register for the courses
api.add_resource(User_Course_API, '/user_course')                                  # Displays user Courses along with ID
api.add_resource(Course_Details_API, '/course_details/<int:course_id>')            # Get course content for a specific course
api.add_resource(Instructor_Assigned_Course_API, '/instructor_assigned_course')     # Returns the assigned courses to instructor dash
api.add_resource(Instructor_Course_Content_API, '/course_content/<int:course_id>')  # Course content management
api.add_resource(Instructor_Assignment_API, '/instructor_assignment/<int:course_id>') # Assignment management
                     # Assignment submission handling
api.add_resource(Assignment_Grading_API, '/grade_assignment')                      # Assignment grading
api.add_resource(Announcement_API, 
                 '/announcements',
                 '/announcements/<int:announcement_id>')                           # Announcement management
api.add_resource(AI_Course_Content_API, '/ai/course/<int:course_id>/content')
api.add_resource(AI_Programming_API, '/ai/programming')
api.add_resource(AI_Assignment_Helper_API, '/ai/assignment/<int:course_id>/<int:assignment_id>/help')
api.add_resource(AI_Study_Planner_API, '/ai/course/<int:course_id>/study')
api.add_resource(AI_Grading_Assistant_API, '/ai/grading/<int:course_id>/analyze')
api.add_resource(FeedbackAPI, '/feedback/<int:course_id>')                       # Course feedback management