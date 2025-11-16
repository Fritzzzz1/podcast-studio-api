/**
 * Utility functions for managing user storage quotas
 */

import { query } from '../db';
import { ApiError } from '../types';

export interface StorageInfo {
  used: number;
  quota: number;
  available: number;
  usagePercentage: number;
}

/**
 * Get user's storage usage and quota information
 *
 * @param userId - User ID
 * @returns Storage information
 */
export const getStorageInfo = async (userId: string): Promise<StorageInfo> => {
  const result = await query<{
    storage_used_bytes: string;
    storage_quota_bytes: string;
  }>('SELECT storage_used_bytes, storage_quota_bytes FROM users WHERE id = $1', [
    userId,
  ]);

  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  const used = parseInt(result.rows[0].storage_used_bytes, 10);
  const quota = parseInt(result.rows[0].storage_quota_bytes, 10);
  const available = Math.max(0, quota - used);
  const usagePercentage = quota > 0 ? (used / quota) * 100 : 0;

  return {
    used,
    quota,
    available,
    usagePercentage,
  };
};

/**
 * Check if user has enough storage quota for a file
 *
 * @param userId - User ID
 * @param requiredBytes - Required storage in bytes
 * @returns True if user has enough quota, false otherwise
 */
export const checkStorageQuota = async (
  userId: string,
  requiredBytes: number
): Promise<boolean> => {
  const storageInfo = await getStorageInfo(userId);
  return storageInfo.available >= requiredBytes;
};

/**
 * Require that user has enough storage quota, throw error if not
 *
 * @param userId - User ID
 * @param requiredBytes - Required storage in bytes
 * @throws ApiError if user doesn't have enough quota
 */
export const requireStorageQuota = async (
  userId: string,
  requiredBytes: number
): Promise<void> => {
  const hasQuota = await checkStorageQuota(userId, requiredBytes);

  if (!hasQuota) {
    const storageInfo = await getStorageInfo(userId);
    throw new ApiError(
      413,
      `Insufficient storage quota. Required: ${formatBytes(requiredBytes)}, Available: ${formatBytes(storageInfo.available)}`
    );
  }
};

/**
 * Update user's storage usage
 *
 * @param userId - User ID
 * @param bytesAdded - Bytes to add (can be negative to decrease usage)
 * @returns Updated storage info
 */
export const updateStorageUsage = async (
  userId: string,
  bytesAdded: number
): Promise<StorageInfo> => {
  await query(
    `UPDATE users
     SET storage_used_bytes = storage_used_bytes + $1
     WHERE id = $2`,
    [bytesAdded, userId]
  );

  return await getStorageInfo(userId);
};

/**
 * Calculate storage usage for a specific project
 *
 * @param projectId - Project ID
 * @returns Total storage used by project in bytes
 */
export const getProjectStorageUsage = async (projectId: string): Promise<number> => {
  const result = await query<{ total_size: string }>(
    `SELECT COALESCE(SUM(audio_file_size_bytes), 0) as total_size
     FROM episodes
     WHERE project_id = $1 AND deleted_at IS NULL`,
    [projectId]
  );

  return parseInt(result.rows[0].total_size || '0', 10);
};

/**
 * Get storage usage breakdown by project for a user
 *
 * @param userId - User ID
 * @returns Array of projects with their storage usage
 */
export const getStorageUsageByProject = async (
  userId: string
): Promise<Array<{ projectId: string; projectName: string; storageBytes: number }>> => {
  const result = await query<{
    project_id: string;
    project_name: string;
    storage_bytes: string;
  }>(
    `SELECT
       p.id as project_id,
       p.name as project_name,
       COALESCE(SUM(e.audio_file_size_bytes), 0) as storage_bytes
     FROM projects p
     LEFT JOIN episodes e ON e.project_id = p.id AND e.deleted_at IS NULL
     WHERE p.user_id = $1 AND p.deleted_at IS NULL
     GROUP BY p.id, p.name
     ORDER BY storage_bytes DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    storageBytes: parseInt(row.storage_bytes, 10),
  }));
};

/**
 * Format bytes to human-readable string
 *
 * @param bytes - Bytes to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 GB")
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Parse human-readable size string to bytes
 *
 * @param sizeString - Size string (e.g., "5GB", "100MB", "1.5TB")
 * @returns Size in bytes
 *
 * @example
 * parseSize('5GB') // Returns 5368709120
 * parseSize('100MB') // Returns 104857600
 */
export const parseSize = (sizeString: string): number => {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeString.trim().match(/^([\d.]+)\s*([KMGT]?B)$/i);

  if (!match) {
    throw new Error(`Invalid size format: ${sizeString}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  if (!(unit in units)) {
    throw new Error(`Unknown unit: ${unit}`);
  }

  return Math.floor(value * units[unit]);
};

/**
 * Validate file size against maximum allowed size
 *
 * @param fileSizeBytes - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 500MB)
 * @throws ApiError if file is too large
 */
export const validateFileSize = (
  fileSizeBytes: number,
  maxSizeBytes: number = 500 * 1024 * 1024 // 500MB default
): void => {
  if (fileSizeBytes > maxSizeBytes) {
    throw new ApiError(
      413,
      `File size exceeds maximum allowed size. Max: ${formatBytes(maxSizeBytes)}, Actual: ${formatBytes(fileSizeBytes)}`
    );
  }
};
