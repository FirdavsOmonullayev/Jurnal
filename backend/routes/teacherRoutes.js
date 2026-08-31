const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

router.get('/dashboard', teacherController.getDashboard);
router.post('/assignments', teacherController.createAssignment);
router.delete('/assignments/:assignmentId', teacherController.deleteAssignment);
router.get('/assignments/:assignmentId/group/:groupId', teacherController.getAssignmentDetail);
router.post('/grade', teacherController.gradeSubmission);

module.exports = router;
