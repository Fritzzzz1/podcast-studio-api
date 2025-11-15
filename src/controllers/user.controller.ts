import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, User } from '../types';
import { UpdateUserInput } from '../validators/user.validator';
import { buildUpdateQuery, keysToSnakeCase } from '../utils/queryBuilder';
import { getStorageInfo, getStorageUsageByProject } from '../utils/storage';

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const result = await query<User>(
    `SELECT id, email, full_name, avatar_url, oauth_provider, oauth_id,
            subscription_tier, storage_quota_bytes, storage_used_bytes,
            created_at, updated_at, last_login_at, is_active, email_verified
     FROM users WHERE id = $1`,
    [req.userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const updateCurrentUser = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const updates = req.body as UpdateUserInput;

  // Convert camelCase to snake_case for database columns
  const dbUpdates = keysToSnakeCase(updates as Record<string, unknown>);

  // Build the update query
  const { query: updateQuery, params } = buildUpdateQuery(
    'users',
    dbUpdates,
    'id = $1',
    [req.userId]
  );

  // Modify the query to specify the fields to return
  const queryWithReturning = updateQuery.replace(
    'RETURNING *',
    `RETURNING id, email, full_name, avatar_url, oauth_provider, oauth_id,
               subscription_tier, storage_quota_bytes, storage_used_bytes,
               created_at, updated_at, last_login_at, is_active, email_verified`
  );

  const result = await query<User>(queryWithReturning, params);

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query<User>(
    `SELECT id, email, full_name, avatar_url, subscription_tier,
            created_at, is_active
     FROM users WHERE id = $1 AND is_active = true`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const getStorageUsage = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Get user storage info using utility
  const storageInfo = await getStorageInfo(req.userId);

  // Get storage usage by project using utility
  const usageByProject = await getStorageUsageByProject(req.userId);

  res.status(200).json({
    success: true,
    data: {
      used: storageInfo.used,
      quota: storageInfo.quota,
      usagePercentage: storageInfo.usagePercentage,
      usageByProject: usageByProject.map((project) => ({
        project_id: project.projectId,
        project_name: project.projectName,
        total_size: project.storageBytes,
      })),
    },
  });
};
