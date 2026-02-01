from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from bson import ObjectId
import os
import gridfs
from datetime import datetime
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
CORS(app)

# MongoDB Atlas connection (Render.com compatible)
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/referraldb')

# Handle both mongodb:// and mongodb+srv://
if MONGO_URI.startswith('mongodb+srv://'):
    client = MongoClient(MONGO_URI)
else:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

try:
    client.admin.command('ping')
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")

db = client['referraldb']
fs = gridfs.GridFS(db)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Role-based referral mapping
REFERRAL_ROLES = {
    'admin': 'admin',
    'user': 'home'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'avi', 'mp3', 'zip'}

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        role = request.form['role']  # 'admin' or 'user'
        
        # Check if user exists
        if db.users.find_one({'username': username}):
            flash('Username already exists!')
            return render_template('signup.html')
        
        # Hash password (simple for demo, use bcrypt in production)
        user_id = db.users.insert_one({
            'username': username,
            'password': password,  # In production, hash this
            'role': role,
            'created_at': datetime.utcnow()
        }).inserted_id
        
        flash('Signup successful! Please login.')
        return redirect(url_for('login'))
    
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = db.users.find_one({'username': username, 'password': password})
        if user:
            session['user_id'] = str(user['_id'])
            session['username'] = username
            session['role'] = user['role']
            return redirect(url_for('referral'))
        else:
            flash('Invalid credentials!')
    
    return render_template('login.html')

@app.route('/referral')
def referral():
    if 'user_id' not in session:
        flash('Please login first!')
        return redirect(url_for('login'))
    
    role = session.get('role', 'user')
    redirect_url = REFERRAL_ROLES.get(role, 'home')
    return redirect(url_for(redirect_url))

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if 'user_id' not in session or session.get('role') != 'admin':
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file selected')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_id = fs.put(file, filename=filename, metadata={
                'uploaded_by': session['username'],
                'upload_date': datetime.utcnow()
            })
            
            db.files.insert_one({
                'file_id': file_id,
                'filename': filename,
                'uploaded_by': session['username'],
                'upload_date': datetime.utcnow()
            })
            flash('File uploaded successfully!')
    
    # Get all files
    files = []
    file_docs = db.files.find().sort('upload_date', -1)
    for doc in file_docs:
        file_info = fs.get(doc['file_id'])
        files.append({
            'id': str(doc['_id']),
            'filename': doc['filename'],
            'uploaded_by': doc['uploaded_by'],
            'upload_date': doc['upload_date'],
            'file_id': str(doc['file_id'])
        })
    
    return render_template('admin.html', files=files)

@app.route('/admin/delete/<file_id>')
def delete_file(file_id):
    if 'user_id' not in session or session.get('role') != 'admin':
        return redirect(url_for('login'))
    
    try:
        file_doc = db.files.find_one({'_id': ObjectId(file_id)})
        if file_doc:
            fs.delete(file_doc['file_id'])
            db.files.delete_one({'_id': ObjectId(file_id)})
            flash('File deleted successfully!')
    except:
        flash('Error deleting file')
    
    return redirect(url_for('admin'))

@app.route('/home')
def home():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Get all files
    files = []
    file_docs = db.files.find().sort('upload_date', -1)
    for doc in file_docs:
        file_info = fs.get(doc['file_id'])
        files.append({
            'filename': doc['filename'],
            'uploaded_by': doc['uploaded_by'],
            'upload_date': doc['upload_date'],
            'file_id': str(doc['file_id'])
        })
    
    return render_template('home.html', files=files)

@app.route('/download/<file_id>')
def download_file(file_id):
    try:
        file_obj = fs.get(ObjectId(file_id))
        return send_from_directory(
            '.', 
            file_obj.filename, 
            as_attachment=True,
            download_name=file_obj.filename,
            mimetype=file_obj.content_type or 'application/octet-stream'
        )
    except:
        flash('File not found')
        return redirect(url_for('home'))

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully!')
    return redirect(url_for('login'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
