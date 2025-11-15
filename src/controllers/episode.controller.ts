import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Episode, Project } from '../types';
import {
  CreateEpisodeInput,
  UpdateEpisodeInput,
} from '../validators/episode.validator';

export const createEpisode = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { projectId } = req.params;
  const { title, description, durationSeconds, templateId } = req.body as CreateEpisodeInput;

  // Check if project exists and user has access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  // Check if user is owner or collaborator with edit permission
  const hasAccess =
    project.user_id === req.userId ||
    (await checkEditAccess(projectId, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this project');
  }

  // Create episode
  const result = await query<Episode>(
    `INSERT INTO episodes (project_id, title, description, duration_seconds, template_id, status)
     VALUES ($1, $2, $3, $4, $5, 'draft')
     RETURNING *`,
    [projectId, title, description || null, durationSeconds || null, templateId || null]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
};

export const getEpisode = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Get episode
  const result = await query<Episode>(
    'SELECT * FROM episodes WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = result.rows[0];

  // Check project access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [episode.project_id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasAccess =
    project.user_id === req.userId ||
    (await checkProjectAccess(episode.project_id, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this episode');
  }

  res.status(200).json({
    success: true,
    data: episode,
  });
};

export const updateEpisode = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const updates = req.body as UpdateEpisodeInput;

  // Get episode
  const episodeResult = await query<Episode>(
    'SELECT * FROM episodes WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check edit access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [episode.project_id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasEditAccess =
    project.user_id === req.userId ||
    (await checkEditAccess(episode.project_id, req.userId));

  if (!hasEditAccess) {
    throw new ApiError(403, 'Access denied to edit this episode');
  }

  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    updateFields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.durationSeconds !== undefined) {
    updateFields.push(`duration_seconds = $${paramIndex++}`);
    values.push(updates.durationSeconds);
  }

  if (updates.status !== undefined) {
    updateFields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updateFields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  values.push(id);

  const result = await query<Episode>(
    `UPDATE episodes
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

export const deleteEpisode = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Get episode
  const episodeResult = await query<Episode>(
    'SELECT * FROM episodes WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check edit access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [episode.project_id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasEditAccess =
    project.user_id === req.userId ||
    (await checkEditAccess(episode.project_id, req.userId));

  if (!hasEditAccess) {
    throw new ApiError(403, 'Access denied to delete this episode');
  }

  // Soft delete
  await query('UPDATE episodes SET deleted_at = NOW() WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Episode deleted successfully',
  });
};

export const getUploadUrl = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Get episode
  const episodeResult = await query<Episode>(
    'SELECT * FROM episodes WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check edit access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [episode.project_id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasEditAccess =
    project.user_id === req.userId ||
    (await checkEditAccess(episode.project_id, req.userId));

  if (!hasEditAccess) {
    throw new ApiError(403, 'Access denied to upload to this episode');
  }

  // TODO: Generate pre-signed S3 URL
  // For now, return a placeholder URL
  const uploadUrl = `https://s3.amazonaws.com/podcast-studio/${episode.id}/audio.mp3?signature=placeholder`;

  res.status(200).json({
    success: true,
    data: {
      uploadUrl,
      expiresIn: 900, // 15 minutes
    },
  });
};

export const completeUpload = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { audioFileUrl, audioFileSizeBytes } = req.body;

  // Get episode
  const episodeResult = await query<Episode>(
    'SELECT * FROM episodes WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check edit access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1',
    [episode.project_id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasEditAccess =
    project.user_id === req.userId ||
    (await checkEditAccess(episode.project_id, req.userId));

  if (!hasEditAccess) {
    throw new ApiError(403, 'Access denied');
  }

  // Update episode with file info
  const result = await query<Episode>(
    `UPDATE episodes
     SET audio_file_url = $1, audio_file_size_bytes = $2, status = 'ready'
     WHERE id = $3
     RETURNING *`,
    [audioFileUrl, audioFileSizeBytes, id]
  );

  // Update user storage usage
  await query(
    `UPDATE users
     SET storage_used_bytes = storage_used_bytes + $1
     WHERE id = $2`,
    [audioFileSizeBytes, req.userId]
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

// Helper functions
const checkProjectAccess = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const result = await query(
    `SELECT id FROM project_collaborators
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  return result.rows.length > 0;
};

const checkEditAccess = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const result = await query(
    `SELECT id FROM project_collaborators
     WHERE project_id = $1 AND user_id = $2
     AND permission_level IN ('edit')`,
    [projectId, userId]
  );

  return result.rows.length > 0;
};
