const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('../backend/routes/authRoutes');
const adminRoutes = require('../backend/routes/adminRoutes');
const teacherRoutes = require('../backend/routes/teacherRoutes');
const studentRoutes = require('../backend/routes/studentRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// Serve static public folder for local fallback
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'API topilmadi' });
  }
});

module.exports = app;
