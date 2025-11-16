import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Episode, Project } from '../types';
import {
  CreateEpisodeInput,
  UpdateEpisodeInput,
} from '../validators/episode.validator';
import {
  checkProjectOwnership,
  checkCollaboratorAccess,
  checkEditAccess,
  requireProjectAccess,
  requireProjectPermission,
} from '../utils/accessControl';
import { buildUpdateQuery, keysToSnakeCase } from '../utils/queryBuilder';
import {
  requireStorageQuota,
  updateStorageUsage,
  validateFileSize,
} from '../utils/storage';
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
} from '../utils/s3';

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
  const isOwner = await checkProjectOwnership(projectId, req.userId);
  const hasEditAccess = await checkEditAccess(projectId, req.userId);

  if (!isOwner && !hasEditAccess) {
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

  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const isCollaborator = await checkCollaboratorAccess(episode.project_id, req.userId);

  if (!isOwner && !isCollaborator) {
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

  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasEditAccess = await checkEditAccess(episode.project_id, req.userId);

  if (!isOwner && !hasEditAccess) {
    throw new ApiError(403, 'Access denied to edit this episode');
  }

  // Convert camelCase to snake_case for database columns
  const dbUpdates = keysToSnakeCase(updates);

  // Build dynamic update query
  const { query: updateQuery, params } = buildUpdateQuery(
    'episodes',
    dbUpdates,
    'id = $1',
    [id]
  );

  const result = await query<Episode>(updateQuery, params);

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

  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasEditAccess = await checkEditAccess(episode.project_id, req.userId);

  if (!isOwner && !hasEditAccess) {
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
  const { contentType = 'audio/mpeg', fileName } = req.body;

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

  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasEditAccess = await checkEditAccess(episode.project_id, req.userId);

  if (!isOwner && !hasEditAccess) {
    throw new ApiError(403, 'Access denied to upload to this episode');
  }

  // Generate pre-signed S3 URL
  const result = await generatePresignedUploadUrl(
    req.userId,
    contentType,
    episode.project_id,
    episode.id,
    fileName
  );

  res.status(200).json({
    success: true,
    data: result,
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

  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasEditAccess = await checkEditAccess(episode.project_id, req.userId);

  if (!isOwner && !hasEditAccess) {
    throw new ApiError(403, 'Access denied');
  }

  // Validate file size (max 500MB)
  validateFileSize(audioFileSizeBytes);

  // Check if user has enough storage quota
  await requireStorageQuota(req.userId, audioFileSizeBytes);

  // Update episode with file info
  const result = await query<Episode>(
    `UPDATE episodes
     SET audio_file_url = $1, audio_file_size_bytes = $2, status = 'ready'
     WHERE id = $3
     RETURNING *`,
    [audioFileUrl, audioFileSizeBytes, id]
  );

  // Update user storage usage
  await updateStorageUsage(req.userId, audioFileSizeBytes);

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};
