const express = require('express');
const cors = require('cors');

const authRoutes = require('../backend/routes/authRoutes');
const adminRoutes = require('../backend/routes/adminRoutes');
const teacherRoutes = require('../backend/routes/teacherRoutes');
const studentRoutes = require('../backend/routes/studentRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

app.all('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint topilmadi' });
});

module.exports = app;
