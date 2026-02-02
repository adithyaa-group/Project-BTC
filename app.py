from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConfigurationError
from bson import ObjectId
import os
import gridfs
from datetime import datetime
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'supersecretproductionkey987654321')
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
CORS(app)

# FORCE MongoDB Atlas connection for Render
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb+srv://Surya_1714:Surya@1234@projectbtc.2unlcca.mongodb.net/referraldb?retryWrites=true&w=majority')
print(f"🔗 MongoDB URI: {MONGO_URI[:50]}...")  # Debug log

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    client.admin.command('ping')
    print("✅ MongoDB connected successfully!")
except ServerSelectionTimeoutError:
    print("⚠️  MongoDB unavailable - using local fallback")
    client = MongoClient('mongodb://localhost:27017/referraldb')
except Exception as e:
    print(f"❌ MongoDB error: {e}")
    client = None

if client:
    db = client['referraldb']
    try:
        fs = gridfs.GridFS(db)
        print("✅ GridFS ready!")
    except:
        fs = None
        print("⚠️  GridFS unavailable")
else:
    db = None
    fs = None


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
        role = request.form['role']
        
        # ✅ SAFE DB CHECK
        if db is None:
            flash('Database unavailable. Please try again later.')
            return render_template('signup.html')
        
        # Check if user exists
        if db.users.find_one({'username': username}):
            flash('Username already exists!')
            return render_template('signup.html')
        
        # Create user
        user_id = db.users.insert_one({
            'username': username,
            'password': password,
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
        
        # ✅ SAFE DB CHECK
        if db is None:
            flash('Database unavailable. Please try again later.')
            return render_template('login.html')
        
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
    
    # ✅ SAFE FILE LISTING
    files = []
    if db:
        file_docs = db.files.find().sort('upload_date', -1)
        for doc in file_docs:
            try:
                files.append({
                    'filename': doc['filename'],
                    'uploaded_by': doc['uploaded_by'],
                    'upload_date': doc['upload_date'],
                    'file_id': str(doc['file_id'])
                })
            except:
                continue
    
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
