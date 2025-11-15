import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Project } from '../types';

interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  permission_level: string;
  invited_by: string;
  invited_at: Date;
  accepted_at: Date | null;
}

interface InviteCollaboratorInput {
  email: string;
  permissionLevel: 'view' | 'comment' | 'edit';
}

interface UpdateCollaboratorInput {
  permissionLevel: 'view' | 'comment' | 'edit';
}

export const inviteCollaborator = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { email, permissionLevel } = req.body as InviteCollaboratorInput;

  // Check project ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can invite collaborators');
  }

  // Find user by email
  const userResult = await query(
    'SELECT id, email, full_name FROM users WHERE email = $1',
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(404, 'User with this email not found');
  }

  const invitedUser = userResult.rows[0];

  // Check if user is already a collaborator
  const existingCollaboratorResult = await query<Collaborator>(
    'SELECT * FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [id, invitedUser.id]
  );

  if (existingCollaboratorResult.rows.length > 0) {
    throw new ApiError(400, 'User is already a collaborator on this project');
  }

  // Check if trying to add owner as collaborator
  if (invitedUser.id === req.userId) {
    throw new ApiError(400, 'Cannot add yourself as a collaborator');
  }

  // Create collaborator invitation
  const result = await query<Collaborator>(
    `INSERT INTO project_collaborators (project_id, user_id, permission_level, invited_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, invitedUser.id, permissionLevel, req.userId]
  );

  const collaborator = result.rows[0];

  // TODO: Send email invitation

  res.status(201).json({
    success: true,
    data: {
      ...collaborator,
      user: {
        id: invitedUser.id,
        email: invitedUser.email,
        full_name: invitedUser.full_name,
      },
    },
  });
};

export const getProjectCollaborators = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if user has access to the project
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projectResult.rows[0];

  // Check access
  const hasAccess =
    project.user_id === req.userId ||
    (await checkCollaboratorAccess(id, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this project');
  }

  // Get collaborators
  const result = await query(
    `SELECT pc.*, u.email, u.full_name, u.avatar_url
     FROM project_collaborators pc
     JOIN users u ON u.id = pc.user_id
     WHERE pc.project_id = $1
     ORDER BY pc.invited_at DESC`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
};

export const updateCollaboratorPermission = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id, userId } = req.params;
  const { permissionLevel } = req.body as UpdateCollaboratorInput;

  // Check project ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can update collaborator permissions');
  }

  // Check if collaborator exists
  const collaboratorResult = await query<Collaborator>(
    'SELECT * FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (collaboratorResult.rows.length === 0) {
    throw new ApiError(404, 'Collaborator not found');
  }

  // Update permission
  const result = await query<Collaborator>(
    `UPDATE project_collaborators
     SET permission_level = $1
     WHERE project_id = $2 AND user_id = $3
     RETURNING *`,
    [permissionLevel, id, userId]
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const removeCollaborator = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id, userId } = req.params;

  // Check project ownership
  const projectResult = await query<Project>(
    'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (projectResult.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  if (projectResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'Only project owner can remove collaborators');
  }

  // Check if collaborator exists
  const collaboratorResult = await query<Collaborator>(
    'SELECT * FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (collaboratorResult.rows.length === 0) {
    throw new ApiError(404, 'Collaborator not found');
  }

  // Remove collaborator
  await query(
    'DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [id, userId]
  );

  res.status(200).json({
    success: true,
    message: 'Collaborator removed successfully',
  });
};

export const getMyCollaborations = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Get projects where user is a collaborator
  const result = await query(
    `SELECT p.*, pc.permission_level, pc.invited_at, u.full_name as owner_name, u.email as owner_email
     FROM project_collaborators pc
     JOIN projects p ON p.id = pc.project_id
     JOIN users u ON u.id = p.user_id
     WHERE pc.user_id = $1 AND p.deleted_at IS NULL
     ORDER BY pc.invited_at DESC`,
    [req.userId]
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
};

export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if invitation exists
  const collaboratorResult = await query<Collaborator>(
    'SELECT * FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [id, req.userId]
  );

  if (collaboratorResult.rows.length === 0) {
    throw new ApiError(404, 'Invitation not found');
  }

  if (collaboratorResult.rows[0].accepted_at) {
    throw new ApiError(400, 'Invitation already accepted');
  }

  // Accept invitation
  const result = await query<Collaborator>(
    `UPDATE project_collaborators
     SET accepted_at = NOW()
     WHERE project_id = $1 AND user_id = $2
     RETURNING *`,
    [id, req.userId]
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

// Helper function
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
