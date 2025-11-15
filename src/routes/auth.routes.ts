import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import * as authController from '../controllers/auth.controller';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Create new user account
 * @access  Public
 */
router.post('/signup', validate(signupSchema), asyncHandler(authController.signup));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/password
 * @access  Public
 */
router.post('/login', validate(loginSchema), asyncHandler(authController.login));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', asyncHandler(authController.logout));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

export default router;
