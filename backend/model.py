from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from datetime import datetime as dt

db = SQLAlchemy()

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)
    fs_uniquifier = db.Column(db.String, nullable=False)
    last_login_at = db.Column(db.DateTime, default=dt.now, onupdate=dt.now)
    roles = db.relationship('Role', secondary='user_roles', backref=db.backref('users', lazy='dynamic'))

class UserRoles(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))

class Instructor(db.Model):
    __tablename__ = 'instructor'
    id = db.Column(db.Integer, primary_key=True)
    #name = db.Column(db.String(100), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)

    
# Can we do one thing , Adding inst to course table , inside that API , commit Instructor table

class Course(db.Model):
    __tablename__ = 'course'
    id = db.Column(db.Integer, primary_key=True)
    course_name = db.Column(db.String(100), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('instructor.instructor_id'), nullable=True)
    credits = db.Column(db.Integer)
    assignments = db.relationship('Assignment', backref='course', lazy=True)

class CourseContent(db.Model):
    __tablename__ = 'course_content'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    lecture_no = db.Column(db.String(50), nullable=False)
    lecture_url = db.Column(db.String(255))
    instructor_id = db.Column(db.Integer, db.ForeignKey('instructor.instructor_id'), nullable=True)

class CourseOpted(db.Model):
    __tablename__ = 'course_opted'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=True)
    term = db.Column(db.String(50), nullable=True)
    status = db.Column(db.Boolean, default=True)

class Assignment(db.Model):
    __tablename__ = 'assignment'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    max_marks = db.Column(db.Float, nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    assignment_type = db.Column(db.String(20), nullable=False)  # 'subjective' or 'objective'
    status = db.Column(db.String(20), nullable=False)  # 'draft' or 'published'
    created_at = db.Column(db.DateTime, default=dt.now)
    assignment_content = db.Column(db.Text,)# nullable=False)
    assignment_options = db.Column(db.Text)#, nullable=False)
    assignment_correct_answer = db.Column(db.Text,)# nullable=False)

class AssignmentSubmission(db.Model):
    __tablename__ = 'assignment_submission'
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignment.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    submission_content = db.Column(db.Text, nullable=False)
    submitted_at = db.Column(db.DateTime, nullable=False)
    marks = db.Column(db.Float)
    feedback = db.Column(db.Text)
    graded_at = db.Column(db.DateTime)
    graded_by = db.Column(db.Integer, db.ForeignKey('user.id'))

class Announcement(db.Model):
    __tablename__ = 'announcement'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=dt.now)
    updated_at = db.Column(db.DateTime, default=dt.now, onupdate=dt.now)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    priority = db.Column(db.String(20), default='normal')  # 'high', 'normal', 'low'

class CourseResource(db.Model):
    __tablename__ = 'course_resource'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)  # 'document', 'video', 'link'
    resource_url = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=dt.now)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Discussion(db.Model):
    __tablename__ = 'discussion'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=dt.now)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_closed = db.Column(db.Boolean, default=False)

class DiscussionReply(db.Model):
    __tablename__ = 'discussion_reply'
    id = db.Column(db.Integer, primary_key=True)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussion.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=dt.now)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class CourseProgress(db.Model):
    __tablename__ = 'course_progress'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('course_content.id'), nullable=False)
    completed_at = db.Column(db.DateTime, default=dt.now)
    progress_percentage = db.Column(db.Float, default=0.0)
