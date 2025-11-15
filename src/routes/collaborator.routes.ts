import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as collaboratorController from '../controllers/collaborator.controller';
import {
  inviteCollaboratorSchema,
  updateCollaboratorSchema,
} from '../validators/collaborator.validator';

const router = Router();

/**
 * @route   POST /api/v1/projects/:id/collaborators
 * @desc    Invite collaborator to project
 * @access  Private
 */
router.post(
  '/:id/collaborators',
  authenticate,
  validate(inviteCollaboratorSchema),
  asyncHandler(collaboratorController.inviteCollaborator)
);

/**
 * @route   GET /api/v1/projects/:id/collaborators
 * @desc    Get project collaborators
 * @access  Private
 */
router.get(
  '/:id/collaborators',
  authenticate,
  asyncHandler(collaboratorController.getProjectCollaborators)
);

/**
 * @route   PUT /api/v1/projects/:id/collaborators/:userId
 * @desc    Update collaborator permission
 * @access  Private
 */
router.put(
  '/:id/collaborators/:userId',
  authenticate,
  validate(updateCollaboratorSchema),
  asyncHandler(collaboratorController.updateCollaboratorPermission)
);

/**
 * @route   DELETE /api/v1/projects/:id/collaborators/:userId
 * @desc    Remove collaborator
 * @access  Private
 */
router.delete(
  '/:id/collaborators/:userId',
  authenticate,
  asyncHandler(collaboratorController.removeCollaborator)
);

/**
 * @route   GET /api/v1/collaborations
 * @desc    Get projects where user is a collaborator
 * @access  Private
 */
router.get(
  '/collaborations',
  authenticate,
  asyncHandler(collaboratorController.getMyCollaborations)
);

/**
 * @route   POST /api/v1/projects/:id/accept-invitation
 * @desc    Accept collaboration invitation
 * @access  Private
 */
router.post(
  '/:id/accept-invitation',
  authenticate,
  asyncHandler(collaboratorController.acceptInvitation)
);

export default router;
