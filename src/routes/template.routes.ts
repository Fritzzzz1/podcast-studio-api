import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as templateController from '../controllers/template.controller';
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
} from '../validators/template.validator';

const router = Router();

/**
 * @route   GET /api/v1/templates
 * @desc    Browse public templates
 * @access  Public
 */
router.get(
  '/',
  validate(listTemplatesSchema),
  asyncHandler(templateController.listTemplates)
);

/**
 * @route   GET /api/v1/templates/my
 * @desc    Get current user's templates
 * @access  Private
 */
router.get('/my', authenticate, asyncHandler(templateController.getMyTemplates));

/**
 * @route   GET /api/v1/templates/:id
 * @desc    Get template details
 * @access  Public
 */
router.get('/:id', asyncHandler(templateController.getTemplate));

/**
 * @route   POST /api/v1/templates
 * @desc    Create new template
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createTemplateSchema),
  asyncHandler(templateController.createTemplate)
);

/**
 * @route   PUT /api/v1/templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validate(updateTemplateSchema),
  asyncHandler(templateController.updateTemplate)
);

/**
 * @route   DELETE /api/v1/templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(templateController.deleteTemplate));

/**
 * @route   POST /api/v1/templates/:id/download
 * @desc    Increment download count for a template
 * @access  Public
 */
router.post('/:id/download', asyncHandler(templateController.incrementDownloadCount));

/**
 * @route   POST /api/v1/templates/:id/rate
 * @desc    Rate a template
 * @access  Private
 */
router.post('/:id/rate', authenticate, asyncHandler(templateController.rateTemplate));

/**
 * @route   GET /api/v1/templates/:id/ratings
 * @desc    Get template ratings
 * @access  Public
 */
router.get('/:id/ratings', asyncHandler(templateController.getTemplateRatings));

/**
 * @route   DELETE /api/v1/ratings/:id
 * @desc    Delete a rating
 * @access  Private
 */
router.delete('/ratings/:id', authenticate, asyncHandler(templateController.deleteRating));

export default router;
