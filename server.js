const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'media-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'media-management',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'avi', 'mp3', 'wav'],
    resource_type: 'auto'
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediamanagement';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Media Schema (Updated for Cloudinary)
const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  cloudinaryId: { type: String, required: true },
  url: { type: String, required: true },
  secureUrl: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: String,
  fileSize: Number,
  format: String,
  resourceType: String,
  uploadedAt: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect(req.session.isAdmin ? '/admin.html' : '/home.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Combined Auth (Login + Signup)
app.post('/api/auth', async (req, res) => {
  try {
    const { username, password, action, isAdmin } = req.body;
    
    if (action === 'signup') {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ error: 'Username already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ 
        username, 
        password: hashedPassword, 
        isAdmin: isAdmin || false 
      });
      await user.save();
      
      req.session.userId = user._id;
      req.session.isAdmin = user.isAdmin;
      return res.json({ message: 'Account created', isAdmin: user.isAdmin });
    }
    
    if (action === 'login') {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
      
      req.session.userId = user._id;
      req.session.isAdmin = user.isAdmin;
      return res.json({ message: 'Login successful', isAdmin: user.isAdmin });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Check Auth
app.get('/api/check-auth', (req, res) => {
  res.json({ 
    authenticated: !!req.session.userId, 
    isAdmin: req.session.isAdmin || false 
  });
});

// Upload to Cloudinary (Admin only)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { title, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Cloudinary file info
    const media = new Media({
      title,
      description,
      cloudinaryId: req.file.filename, // Cloudinary public_id
      url: req.file.path, // Cloudinary URL
      secureUrl: req.file.path.replace('http://', 'https://'),
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      format: req.file.format,
      resourceType: req.file.resource_type
    });
    
    await media.save();
    res.json({ message: 'File uploaded to Cloudinary', media });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Media
app.get('/api/media', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ error: 'Login required' });
    }
    
    const media = await Media.find().sort({ uploadedAt: -1 });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Media (Admin only)
app.delete('/api/media/:id', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(media.cloudinaryId, {
      resource_type: media.resourceType || 'auto'
    });
    
    // Delete from database
    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: 'Media deleted from Cloudinary and database' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download/Get Media URL
app.get('/api/download/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(403).json({ error: 'Login required' });
    }
    
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Redirect to Cloudinary secure URL
    res.redirect(media.secureUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'}`);
});