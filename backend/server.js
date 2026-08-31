const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// Locate public directory (whether running from root or backend folder)
let publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  publicDir = path.join(__dirname, 'public');
}
if (!fs.existsSync(publicDir)) {
  publicDir = path.join(__dirname, '../frontend');
}

app.use(express.static(publicDir));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    res.status(404).json({ error: 'API topilmadi' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Server ishlamoqda: http://localhost:${PORT}`);
    console.log(`=================================`);
  });
}

module.exports = app;
