import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, User } from '../types';
import { UpdateUserInput } from '../validators/user.validator';

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

  const { fullName, avatarUrl } = req.body as UpdateUserInput;

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (fullName !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(fullName);
  }

  if (avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(avatarUrl);
  }

  if (updates.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  values.push(req.userId);

  const result = await query<User>(
    `UPDATE users
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, full_name, avatar_url, oauth_provider, oauth_id,
               subscription_tier, storage_quota_bytes, storage_used_bytes,
               created_at, updated_at, last_login_at, is_active, email_verified`,
    values
  );

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

  // Get user storage info
  const userResult = await query<User>(
    `SELECT storage_quota_bytes, storage_used_bytes
     FROM users WHERE id = $1`,
    [req.userId]
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const user = userResult.rows[0];

  // Get storage usage by project
  const projectsResult = await query<{
    project_id: string;
    project_name: string;
    total_size: number;
  }>(
    `SELECT p.id as project_id, p.name as project_name,
            COALESCE(SUM(e.audio_file_size_bytes), 0) as total_size
     FROM projects p
     LEFT JOIN episodes e ON e.project_id = p.id AND e.deleted_at IS NULL
     WHERE p.user_id = $1 AND p.deleted_at IS NULL
     GROUP BY p.id, p.name
     ORDER BY total_size DESC`,
    [req.userId]
  );

  res.status(200).json({
    success: true,
    data: {
      used: user.storage_used_bytes,
      quota: user.storage_quota_bytes,
      usagePercentage: (user.storage_used_bytes / user.storage_quota_bytes) * 100,
      usageByProject: projectsResult.rows,
    },
  });
};
