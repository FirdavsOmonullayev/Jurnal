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

// Locate public/frontend directory safely across all platforms & serverless environments
const possibleDirs = [
  path.join(process.cwd(), 'public'),
  path.join(__dirname, 'public'),
  path.join(__dirname, '../public'),
  path.join(process.cwd(), 'frontend'),
  path.join(__dirname, 'frontend'),
  path.join(__dirname, '../frontend')
];

let publicDir = possibleDirs.find(d => fs.existsSync(d)) || path.join(process.cwd(), 'public');

app.use(express.static(publicDir));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API topilmadi' });
  }
  
  // Check if specific static file was requested
  const filePath = path.join(publicDir, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }

  // Fallback to index.html
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(404).send('Index HTML not found');
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Server ishlamoqda: http://localhost:${PORT}`);
    console.log(`=================================`);
  });
}

module.exports = app;
