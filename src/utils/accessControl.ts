import { query } from '../db';
import { ApiError } from '../types';

export type PermissionLevel = 'view' | 'comment' | 'edit';

/**
 * Check if a user is the owner of a project
 */
export const checkProjectOwnership = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const result = await query(
    'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Check if a user has collaborator access to a project (any permission level)
 */
export const checkCollaboratorAccess = async (
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

/**
 * Check if a user has edit permission on a project (as collaborator)
 */
export const checkEditAccess = async (
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

/**
 * Check if a user has a specific permission level on a project
 * Permission hierarchy: edit > comment > view
 */
export const checkCollaboratorPermission = async (
  projectId: string,
  userId: string,
  requiredPermission: PermissionLevel
): Promise<boolean> => {
  const result = await query(
    `SELECT permission_level FROM project_collaborators
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const permission = result.rows[0].permission_level as PermissionLevel;

  // Permission hierarchy: edit > comment > view
  if (requiredPermission === 'view') {
    return true; // Anyone with access has view permission
  } else if (requiredPermission === 'comment') {
    return permission === 'comment' || permission === 'edit';
  } else if (requiredPermission === 'edit') {
    return permission === 'edit';
  }

  return false;
};

/**
 * Check if a user has any access to a project (owner or collaborator)
 */
export const checkProjectAccess = async (
  projectId: string,
  userId: string
): Promise<boolean> => {
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (isOwner) return true;

  return await checkCollaboratorAccess(projectId, userId);
};

/**
 * Require that a user is the owner of a project, throw error if not
 */
export const requireProjectOwnership = async (
  projectId: string,
  userId: string,
  errorMessage = 'Only project owner can perform this action'
): Promise<void> => {
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (!isOwner) {
    throw new ApiError(403, errorMessage);
  }
};

/**
 * Require that a user has access to a project (owner or collaborator), throw error if not
 */
export const requireProjectAccess = async (
  projectId: string,
  userId: string,
  errorMessage = 'Access denied'
): Promise<void> => {
  const hasAccess = await checkProjectAccess(projectId, userId);
  if (!hasAccess) {
    throw new ApiError(403, errorMessage);
  }
};

/**
 * Require that a user has a specific permission level on a project, throw error if not
 */
export const requireProjectPermission = async (
  projectId: string,
  userId: string,
  requiredPermission: PermissionLevel,
  errorMessage?: string
): Promise<void> => {
  // Check if user is owner first
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (isOwner) return;

  // Check collaborator permission
  const hasPermission = await checkCollaboratorPermission(
    projectId,
    userId,
    requiredPermission
  );

  if (!hasPermission) {
    const defaultMessage = `You need ${requiredPermission} permission to perform this action`;
    throw new ApiError(403, errorMessage || defaultMessage);
  }
};

/**
 * Get the permission level of a user on a project
 * Returns 'owner' if user is the project owner, otherwise returns their collaborator permission
 */
export const getProjectPermission = async (
  projectId: string,
  userId: string
): Promise<PermissionLevel | 'owner' | null> => {
  // Check if owner
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (isOwner) return 'owner';

  // Check collaborator permission
  const result = await query(
    `SELECT permission_level FROM project_collaborators
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].permission_level as PermissionLevel;
};
