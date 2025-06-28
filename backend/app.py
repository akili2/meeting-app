import eventlet
eventlet.monkey_patch()  # Doit être la première instruction
import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
import uuid
import datetime

# Initialisation de l'application
app = Flask(__name__)
app.config.from_object(Config)

# Extensions
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Modèles de données
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    meetings = db.relationship('Meeting', backref='host', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Meeting(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    participants = db.Column(db.Integer, default=0)

# Gestion des utilisateurs
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes d'authentification
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        return render_template('auth/login.html', error='Invalid username or password')
    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        if User.query.filter_by(username=username).first():
            return render_template('auth/register.html', error='Username already taken')
        
        if User.query.filter_by(email=email).first():
            return render_template('auth/register.html', error='Email already registered')
        
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        return redirect(url_for('dashboard'))
    
    return render_template('auth/register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

# Routes principales
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/dashboard')
@login_required
def dashboard():
    meetings = Meeting.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', meetings=meetings)

@app.route('/meeting/new', methods=['POST'])
@login_required
def create_meeting():
    title = request.form.get('title', 'My Meeting')
    meeting_id = str(uuid.uuid4())
    meeting = Meeting(id=meeting_id, title=title, user_id=current_user.id)
    db.session.add(meeting)
    db.session.commit()
    return jsonify({'meeting_id': meeting_id})

@app.route('/meeting/<meeting_id>')
@login_required
def join_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    return render_template('meeting.html', meeting=meeting, user=current_user)

# WebSocket handlers
@socketio.on('join')
def handle_join(data):
    meeting_id = data['meeting_id']
    join_room(meeting_id)
    meeting = Meeting.query.get(meeting_id)
    if meeting:
        meeting.participants += 1
        db.session.commit()
    emit('user_joined', {'username': current_user.username, 'participants': meeting.participants}, room=meeting_id)

@socketio.on('leave')
def handle_leave(data):
    meeting_id = data['meeting_id']
    leave_room(meeting_id)
    meeting = Meeting.query.get(meeting_id)
    if meeting:
        meeting.participants -= 1
        db.session.commit()
    emit('user_left', {'username': current_user.username, 'participants': meeting.participants}, room=meeting_id)

@socketio.on('signal')
def handle_signal(data):
    emit('signal', data, room=data['meeting_id'], include_self=False)

# Initialisation de la base de données
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    socketio.run(app, debug=True)
