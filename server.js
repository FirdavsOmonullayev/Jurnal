const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./backend/routes/authRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');
const teacherRoutes = require('./backend/routes/teacherRoutes');
const studentRoutes = require('./backend/routes/studentRoutes');

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

// Serve static frontend files from root directory
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
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
