import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProjectLimiter } from '../middleware/rateLimiter';
import * as projectController from '../controllers/project.controller';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../validators/project.validator';

const router = Router();

/**
 * @route   GET /api/v1/projects
 * @desc    List user's projects
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(projectController.listProjects));

/**
 * @route   POST /api/v1/projects
 * @desc    Create new project
 * @access  Private
 */
router.post(
  '/',
  createProjectLimiter,
  authenticate,
  validate(createProjectSchema),
  asyncHandler(projectController.createProject)
);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get project details
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(projectController.getProject));

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update project
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validate(updateProjectSchema),
  asyncHandler(projectController.updateProject)
);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Delete project (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(projectController.deleteProject));

export default router;
