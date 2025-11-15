import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as userController from '../controllers/user.controller';
import { updateUserSchema } from '../validators/user.validator';

const router = Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(userController.getCurrentUser));

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  validate(updateUserSchema),
  asyncHandler(userController.updateCurrentUser)
);

/**
 * @route   GET /api/v1/users/me/storage
 * @desc    Get storage usage
 * @access  Private
 */
router.get('/me/storage', authenticate, asyncHandler(userController.getStorageUsage));

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get public user profile
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(userController.getUserById));

export default router;
