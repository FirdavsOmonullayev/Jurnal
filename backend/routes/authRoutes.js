const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/status', authController.getStatus);
router.post('/setup-admin', authController.setupAdmin);
router.post('/login', authController.login);

module.exports = router;
