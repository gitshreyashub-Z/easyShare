import express from 'express';
import {
  register,
  verifySignupOtp,
  resendSignupOtp,
  login,
  getProfile,
  requestPasswordReset,
  verifyResetOtp,
  resetPasswordWithOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/register', register);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/resend-signup-otp', resendSignupOtp);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/profile', protect, getProfile);

export default router;
