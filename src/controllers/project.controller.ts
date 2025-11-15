import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Project, Episode } from '../types';
import {
  CreateProjectInput,
  UpdateProjectInput,
} from '../validators/project.validator';
import { checkCollaboratorAccess } from '../utils/accessControl';
import {
  buildUpdateQuery,
  keysToSnakeCase,
  sanitizeSortColumn,
  sanitizeSortDirection,
} from '../utils/queryBuilder';
import {
  parsePaginationParams,
  calculateOffset,
  executePaginatedQuery,
} from '../utils/pagination';

export const listProjects = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Parse and validate pagination parameters
  const { page, limit, sortBy = 'updatedAt', order = 'desc' } = parsePaginationParams(req.query, {
    page: 1,
    limit: 20,
    sortBy: 'updatedAt',
    order: 'desc',
  });

  const offset = calculateOffset(page, limit);

  // Map sortBy to actual column names
  const columnMap: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    name: 'name',
  };

  // Sanitize sort parameters
  const orderByColumn = sanitizeSortColumn(
    columnMap[sortBy] || sortBy,
    ['created_at', 'updated_at', 'name'],
    'updated_at'
  );
  const orderDirection = sanitizeSortDirection(order, 'DESC');

  // Execute paginated query
  const result = await executePaginatedQuery<Project>(
    `SELECT * FROM projects
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY ${orderByColumn} ${orderDirection}
     LIMIT $2 OFFSET $3`,
    [req.userId, limit, offset],
    'SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted_at IS NULL',
    [req.userId],
    page,
    limit
  );

  res.status(200).json({
    success: true,
    data: {
      projects: result.data,
      total: result.total,
      page: result.page,
      pages: result.pages,
      limit: result.limit,
    },
  });
};

export const createProject = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { name, description, coverImageUrl, category } = req.body as CreateProjectInput;

  const result = await query<Project>(
    `INSERT INTO projects (user_id, name, description, cover_image_url, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.userId, name, description || null, coverImageUrl || null, category || null]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
};

export const getProject = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Get project
  const projectResult = await query<Project>(
    `SELECT * FROM projects
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  // Check if user has access (owner or collaborator)
  const hasAccess =
    project.user_id === req.userId ||
    (await checkCollaboratorAccess(id, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this project');
  }

  // Get episodes
  const episodesResult = await query<Episode>(
    `SELECT * FROM episodes
     WHERE project_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [id]
  );

  // Get collaborators
  const collaboratorsResult = await query(
    `SELECT pc.*, u.email, u.full_name, u.avatar_url
     FROM project_collaborators pc
     JOIN users u ON u.id = pc.user_id
     WHERE pc.project_id = $1
     ORDER BY pc.invited_at DESC`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: {
      project,
      episodes: episodesResult.rows,
      collaborators: collaboratorsResult.rows,
    },
  });
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const updates = req.body as UpdateProjectInput;

  // Check ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can update the project');
  }

  // Convert camelCase to snake_case and build update query
  const snakeCaseUpdates = keysToSnakeCase(updates);
  const { query: updateQuery, params } = buildUpdateQuery(
    'projects',
    snakeCaseUpdates,
    'id = $1',
    [id]
  );

  const result = await query<Project>(updateQuery, params);

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can delete the project');
  }

  // Soft delete
  await query('UPDATE projects SET deleted_at = NOW() WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
  });
};

export const syncProject = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { project } = req.body;

  // Check ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can sync the project');
  }

  // Convert camelCase to snake_case and add last_synced_at
  const snakeCaseProject = keysToSnakeCase(project);
  const updatesWithSync = {
    ...snakeCaseProject,
    last_synced_at: 'NOW()',
  };

  // Build update query
  const { query: updateQuery, params } = buildUpdateQuery(
    'projects',
    updatesWithSync,
    'id = $1',
    [id]
  );

  // Replace NOW() placeholder with actual SQL function
  const finalQuery = updateQuery.replace("'NOW()'", 'NOW()');

  const updatedProject = await query<Project>(finalQuery, params);

  // Return the synced project
  res.status(200).json({
    success: true,
    data: {
      project: updatedProject.rows[0],
      syncedAt: new Date().toISOString(),
    },
  });
};

export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check ownership or collaborator access
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  const hasAccess =
    project.user_id === req.userId ||
    (await checkCollaboratorAccess(id, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this project');
  }

  res.status(200).json({
    success: true,
    data: {
      lastSyncedAt: project.last_synced_at,
      updatedAt: project.updated_at,
      needsSync: project.last_synced_at
        ? new Date(project.updated_at) > new Date(project.last_synced_at)
        : true,
    },
  });
};
