import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError } from '../types';

interface Template {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  config: Record<string, unknown>;
  is_default: boolean;
  is_public: boolean;
  is_featured: boolean;
  download_count: number;
  average_rating: number | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateTemplateInput {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  config: Record<string, unknown>;
  isPublic?: boolean;
}

interface UpdateTemplateInput {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  config?: Record<string, unknown>;
  isPublic?: boolean;
}

interface ListTemplatesQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  category?: string;
  featured?: boolean;
  search?: string;
}

export const listTemplates = async (req: AuthRequest, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'download_count',
    category,
    featured,
    search,
  } = req.query as unknown as ListTemplatesQuery;

  const offset = (page - 1) * limit;

  const conditions: string[] = ['is_public = true'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`category = $${paramIndex++}`);
    values.push(category);
  }

  if (featured !== undefined) {
    conditions.push(`is_featured = $${paramIndex++}`);
    values.push(featured);
  }

  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Map sortBy to actual column names
  const columnMap: Record<string, string> = {
    downloads: 'download_count',
    rating: 'average_rating',
    createdAt: 'created_at',
    name: 'name',
  };

  const orderByColumn = columnMap[sortBy] || 'download_count';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM templates ${whereClause}`,
    values
  );

  const total = parseInt(countResult.rows[0].count, 10);

  // Get templates
  values.push(limit, offset);
  const result = await query<Template>(
    `SELECT t.*, u.full_name as creator_name, u.avatar_url as creator_avatar
     FROM templates t
     LEFT JOIN users u ON u.id = t.creator_id
     ${whereClause}
     ORDER BY ${orderByColumn} DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    values
  );

  res.status(200).json({
    success: true,
    data: {
      templates: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  });
};

export const getTemplate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query<Template>(
    `SELECT t.*, u.full_name as creator_name, u.avatar_url as creator_avatar, u.email as creator_email
     FROM templates t
     LEFT JOIN users u ON u.id = t.creator_id
     WHERE t.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Template not found');
  }

  const template = result.rows[0];

  // Check if user has access (public templates or own templates)
  if (!template.is_public && template.creator_id !== req.userId) {
    throw new ApiError(403, 'Access denied to this template');
  }

  // Get ratings summary
  const ratingsResult = await query(
    `SELECT
       COUNT(*) as total_ratings,
       AVG(rating) as average_rating
     FROM template_ratings
     WHERE template_id = $1`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: {
      template,
      ratings: {
        total: parseInt(ratingsResult.rows[0].total_ratings, 10),
        average: ratingsResult.rows[0].average_rating
          ? parseFloat(ratingsResult.rows[0].average_rating)
          : null,
      },
    },
  });
};

export const createTemplate = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { name, description, icon, category, config, isPublic } =
    req.body as CreateTemplateInput;

  const result = await query<Template>(
    `INSERT INTO templates (creator_id, name, description, icon, category, config, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      req.userId,
      name,
      description || null,
      icon || null,
      category || null,
      JSON.stringify(config),
      isPublic || false,
    ]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
};

export const updateTemplate = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const updates = req.body as UpdateTemplateInput;

  // Check ownership
  const templateResult = await query<Template>(
    'SELECT * FROM templates WHERE id = $1',
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new ApiError(404, 'Template not found');
  }

  if (templateResult.rows[0].creator_id !== req.userId) {
    throw new ApiError(403, 'Only template creator can update the template');
  }

  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.icon !== undefined) {
    updateFields.push(`icon = $${paramIndex++}`);
    values.push(updates.icon);
  }

  if (updates.category !== undefined) {
    updateFields.push(`category = $${paramIndex++}`);
    values.push(updates.category);
  }

  if (updates.config !== undefined) {
    updateFields.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(updates.config));
  }

  if (updates.isPublic !== undefined) {
    updateFields.push(`is_public = $${paramIndex++}`);
    values.push(updates.isPublic);
  }

  if (updateFields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  updateFields.push('updated_at = NOW()');
  values.push(id);

  const result = await query<Template>(
    `UPDATE templates
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check ownership
  const templateResult = await query<Template>(
    'SELECT * FROM templates WHERE id = $1',
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new ApiError(404, 'Template not found');
  }

  if (templateResult.rows[0].creator_id !== req.userId) {
    throw new ApiError(403, 'Only template creator can delete the template');
  }

  // Hard delete (we can change this to soft delete if needed)
  await query('DELETE FROM templates WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Template deleted successfully',
  });
};

export const incrementDownloadCount = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if template exists and is public
  const templateResult = await query<Template>(
    'SELECT * FROM templates WHERE id = $1',
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new ApiError(404, 'Template not found');
  }

  if (!templateResult.rows[0].is_public) {
    throw new ApiError(403, 'Template is not public');
  }

  // Increment download count
  await query(
    'UPDATE templates SET download_count = download_count + 1 WHERE id = $1',
    [id]
  );

  res.status(200).json({
    success: true,
    message: 'Download count incremented',
  });
};

export const getMyTemplates = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { page = 1, limit = 20 } = req.query as unknown as ListTemplatesQuery;
  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) FROM templates WHERE creator_id = $1',
    [req.userId]
  );

  const total = parseInt(countResult.rows[0].count, 10);

  // Get user's templates
  const result = await query<Template>(
    `SELECT * FROM templates
     WHERE creator_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.userId, limit, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      templates: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  });
};

// Template Ratings

interface TemplateRating {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: Date;
}

interface RateTemplateInput {
  rating: number;
  review?: string;
}

export const rateTemplate = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { rating, review } = req.body as RateTemplateInput;

  // Check if template exists and is public
  const templateResult = await query<Template>(
    'SELECT * FROM templates WHERE id = $1 AND is_public = true',
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new ApiError(404, 'Template not found or not public');
  }

  // Check if user already rated this template
  const existingRatingResult = await query<TemplateRating>(
    'SELECT * FROM template_ratings WHERE template_id = $1 AND user_id = $2',
    [id, req.userId]
  );

  let result;

  if (existingRatingResult.rows.length > 0) {
    // Update existing rating
    result = await query<TemplateRating>(
      `UPDATE template_ratings
       SET rating = $1, review = $2
       WHERE template_id = $3 AND user_id = $4
       RETURNING *`,
      [rating, review || null, id, req.userId]
    );
  } else {
    // Create new rating
    result = await query<TemplateRating>(
      `INSERT INTO template_ratings (template_id, user_id, rating, review)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.userId, rating, review || null]
    );
  }

  // Update template's average rating
  await updateTemplateAverageRating(id);

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const getTemplateRatings = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query as unknown as {
    page?: number;
    limit?: number;
  };
  const offset = (page - 1) * limit;

  // Check if template exists
  const templateResult = await query<Template>(
    'SELECT * FROM templates WHERE id = $1',
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new ApiError(404, 'Template not found');
  }

  // Get total count
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) FROM template_ratings WHERE template_id = $1',
    [id]
  );

  const total = parseInt(countResult.rows[0].count, 10);

  // Get ratings with user info
  const result = await query(
    `SELECT tr.*, u.full_name, u.avatar_url
     FROM template_ratings tr
     JOIN users u ON u.id = tr.user_id
     WHERE tr.template_id = $1
     ORDER BY tr.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );

  // Get average rating
  const avgResult = await query(
    `SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
     FROM template_ratings
     WHERE template_id = $1`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: {
      ratings: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      averageRating: avgResult.rows[0].average_rating
        ? parseFloat(avgResult.rows[0].average_rating)
        : null,
      totalRatings: parseInt(avgResult.rows[0].total_ratings, 10),
    },
  });
};

export const deleteRating = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if rating exists and belongs to user
  const ratingResult = await query<TemplateRating>(
    'SELECT * FROM template_ratings WHERE id = $1',
    [id]
  );

  if (ratingResult.rows.length === 0) {
    throw new ApiError(404, 'Rating not found');
  }

  if (ratingResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'You can only delete your own ratings');
  }

  const templateId = ratingResult.rows[0].template_id;

  // Delete rating
  await query('DELETE FROM template_ratings WHERE id = $1', [id]);

  // Update template's average rating
  await updateTemplateAverageRating(templateId);

  res.status(200).json({
    success: true,
    message: 'Rating deleted successfully',
  });
};

// Helper function to update template's average rating
const updateTemplateAverageRating = async (templateId: string) => {
  const avgResult = await query(
    `SELECT AVG(rating) as average_rating
     FROM template_ratings
     WHERE template_id = $1`,
    [templateId]
  );

  const averageRating = avgResult.rows[0].average_rating
    ? parseFloat(avgResult.rows[0].average_rating)
    : null;

  await query('UPDATE templates SET average_rating = $1 WHERE id = $2', [
    averageRating,
    templateId,
  ]);
};
