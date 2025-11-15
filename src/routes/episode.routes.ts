import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadLimiter } from '../middleware/rateLimiter';
import * as episodeController from '../controllers/episode.controller';
import {
  createEpisodeSchema,
  updateEpisodeSchema,
} from '../validators/episode.validator';

const router = Router();

/**
 * @route   POST /api/v1/projects/:projectId/episodes
 * @desc    Create new episode
 * @access  Private
 */
router.post(
  '/:projectId/episodes',
  authenticate,
  validate(createEpisodeSchema),
  asyncHandler(episodeController.createEpisode)
);

/**
 * @route   GET /api/v1/episodes/:id
 * @desc    Get episode details
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(episodeController.getEpisode));

/**
 * @route   PUT /api/v1/episodes/:id
 * @desc    Update episode
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validate(updateEpisodeSchema),
  asyncHandler(episodeController.updateEpisode)
);

/**
 * @route   DELETE /api/v1/episodes/:id
 * @desc    Delete episode
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(episodeController.deleteEpisode));

/**
 * @route   POST /api/v1/episodes/:id/upload-url
 * @desc    Get pre-signed URL for file upload
 * @access  Private
 */
router.post(
  '/:id/upload-url',
  uploadLimiter,
  authenticate,
  asyncHandler(episodeController.getUploadUrl)
);

/**
 * @route   POST /api/v1/episodes/:id/upload-complete
 * @desc    Notify that audio file upload is complete
 * @access  Private
 */
router.post(
  '/:id/upload-complete',
  uploadLimiter,
  authenticate,
  asyncHandler(episodeController.completeUpload)
);

export default router;
