import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Project, Episode } from '../types';
import {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQuery,
} from '../validators/project.validator';

export const listProjects = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const {
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    order = 'desc',
  } = req.query as unknown as ListProjectsQuery;

  const offset = (page - 1) * limit;

  // Map sortBy to actual column names
  const columnMap: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    name: 'name',
  };

  const orderByColumn = columnMap[sortBy] || 'updated_at';
  const orderDirection = order === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted_at IS NULL',
    [req.userId]
  );

  const total = parseInt(countResult.rows[0].count, 10);

  // Get projects
  const result = await query<Project>(
    `SELECT * FROM projects
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY ${orderByColumn} ${orderDirection}
     LIMIT $2 OFFSET $3`,
    [req.userId, limit, offset]
  );

  res.status(200).json({
    success: true,
    data: {
      projects: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
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

  if (updates.coverImageUrl !== undefined) {
    updateFields.push(`cover_image_url = $${paramIndex++}`);
    values.push(updates.coverImageUrl);
  }

  if (updates.category !== undefined) {
    updateFields.push(`category = $${paramIndex++}`);
    values.push(updates.category);
  }

  if (updates.isPublic !== undefined) {
    updateFields.push(`is_public = $${paramIndex++}`);
    values.push(updates.isPublic);
  }

  if (updateFields.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  values.push(id);

  const result = await query<Project>(
    `UPDATE projects
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

  // Update project
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (project.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    values.push(project.name);
  }

  if (project.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    values.push(project.description);
  }

  if (project.coverImageUrl !== undefined) {
    updateFields.push(`cover_image_url = $${paramIndex++}`);
    values.push(project.coverImageUrl);
  }

  updateFields.push(`last_synced_at = NOW()`);
  values.push(id);

  const updatedProject = await query<Project>(
    `UPDATE projects
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

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

// Helper function to check collaborator access
const checkCollaboratorAccess = async (
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
