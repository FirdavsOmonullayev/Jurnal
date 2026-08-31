const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getDashboard);
router.post('/teachers', adminController.addTeacher);
router.delete('/teachers/:teacherId', adminController.deleteTeacher);
router.post('/groups', adminController.addGroup);
router.delete('/groups/:groupId', adminController.deleteGroup);
router.post('/students', adminController.addStudent);
router.delete('/students/:studentId', adminController.deleteStudent);
router.get('/groups/:groupId', adminController.getGroupDetail);

module.exports = router;
