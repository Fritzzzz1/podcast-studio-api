import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as commentController from '../controllers/comment.controller';
import {
  createCommentSchema,
  replyCommentSchema,
  updateCommentSchema,
} from '../validators/comment.validator';

const router = Router();

/**
 * @route   GET /api/v1/episodes/:id/comments
 * @desc    Get episode comments
 * @access  Private
 */
router.get(
  '/:id/comments',
  authenticate,
  asyncHandler(commentController.getEpisodeComments)
);

/**
 * @route   POST /api/v1/episodes/:id/comments
 * @desc    Add comment to episode
 * @access  Private
 */
router.post(
  '/:id/comments',
  authenticate,
  validate(createCommentSchema),
  asyncHandler(commentController.addComment)
);

/**
 * @route   POST /api/v1/comments/:id/reply
 * @desc    Reply to a comment
 * @access  Private
 */
router.post(
  '/comments/:id/reply',
  authenticate,
  validate(replyCommentSchema),
  asyncHandler(commentController.replyToComment)
);

/**
 * @route   PUT /api/v1/comments/:id
 * @desc    Update comment
 * @access  Private
 */
router.put(
  '/comments/:id',
  authenticate,
  validate(updateCommentSchema),
  asyncHandler(commentController.updateComment)
);

/**
 * @route   DELETE /api/v1/comments/:id
 * @desc    Delete comment
 * @access  Private
 */
router.delete(
  '/comments/:id',
  authenticate,
  asyncHandler(commentController.deleteComment)
);

/**
 * @route   POST /api/v1/comments/:id/resolve
 * @desc    Toggle comment resolved status
 * @access  Private
 */
router.post(
  '/comments/:id/resolve',
  authenticate,
  asyncHandler(commentController.resolveComment)
);

export default router;
