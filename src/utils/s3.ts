/**
 * Utility functions for AWS S3 file operations
 *
 * NOTE: This requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to be installed
 * Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import { config } from '../config';
import { ApiError } from '../types';

// Uncomment when AWS SDK is installed:
// import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// // Initialize S3 client
// const s3Client = new S3Client({
//   region: config.aws.region,
//   credentials: {
//     accessKeyId: config.aws.accessKeyId,
//     secretAccessKey: config.aws.secretAccessKey,
//   },
// });

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Generate a unique S3 key for a file
 *
 * @param userId - User ID
 * @param projectId - Project ID (optional)
 * @param episodeId - Episode ID (optional)
 * @param fileName - Original file name
 * @returns S3 key path
 */
export const generateS3Key = (
  userId: string,
  projectId?: string,
  episodeId?: string,
  fileName?: string
): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);

  if (episodeId && projectId) {
    const extension = fileName?.split('.').pop() || 'mp3';
    return `users/${userId}/projects/${projectId}/episodes/${episodeId}/${timestamp}-${randomStr}.${extension}`;
  } else if (projectId) {
    const extension = fileName?.split('.').pop() || 'mp3';
    return `users/${userId}/projects/${projectId}/${timestamp}-${randomStr}.${extension}`;
  } else {
    const extension = fileName?.split('.').pop() || 'mp3';
    return `users/${userId}/files/${timestamp}-${randomStr}.${extension}`;
  }
};

/**
 * Generate a pre-signed URL for uploading a file to S3
 *
 * @param userId - User ID
 * @param contentType - MIME type of the file
 * @param projectId - Project ID (optional)
 * @param episodeId - Episode ID (optional)
 * @param fileName - Original file name (optional)
 * @param expiresIn - URL expiration time in seconds (default: 900 = 15 minutes)
 * @returns Pre-signed upload URL and S3 key
 */
export const generatePresignedUploadUrl = async (
  userId: string,
  contentType: string,
  projectId?: string,
  episodeId?: string,
  fileName?: string,
  expiresIn: number = 900
): Promise<PresignedUrlResult> => {
  // Validate content type (only allow audio files)
  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
  ];

  if (!allowedTypes.includes(contentType.toLowerCase())) {
    throw new ApiError(400, `Invalid content type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  const key = generateS3Key(userId, projectId, episodeId, fileName);

  // TODO: Implement actual S3 pre-signed URL generation when AWS SDK is installed
  // const command = new PutObjectCommand({
  //   Bucket: config.aws.s3BucketName,
  //   Key: key,
  //   ContentType: contentType,
  // });
  //
  // const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // Temporary placeholder until AWS SDK is installed
  const uploadUrl = `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}?signature=placeholder&expires=${expiresIn}`;

  return {
    uploadUrl,
    key,
    expiresIn,
  };
};

/**
 * Generate a pre-signed URL for downloading a file from S3
 *
 * @param key - S3 key of the file
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Pre-signed download URL
 */
export const generatePresignedDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  if (!key) {
    throw new ApiError(400, 'S3 key is required');
  }

  // TODO: Implement actual S3 pre-signed URL generation when AWS SDK is installed
  // const command = new GetObjectCommand({
  //   Bucket: config.aws.s3BucketName,
  //   Key: key,
  // });
  //
  // const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // Temporary placeholder until AWS SDK is installed
  const downloadUrl = `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}?signature=placeholder&expires=${expiresIn}`;

  return downloadUrl;
};

/**
 * Delete a file from S3
 *
 * @param key - S3 key of the file to delete
 */
export const deleteFile = async (key: string): Promise<void> => {
  if (!key) {
    throw new ApiError(400, 'S3 key is required');
  }

  // TODO: Implement actual S3 file deletion when AWS SDK is installed
  // const command = new DeleteObjectCommand({
  //   Bucket: config.aws.s3BucketName,
  //   Key: key,
  // });
  //
  // await s3Client.send(command);

  // Placeholder - in production this would actually delete from S3
  console.log(`[S3] Would delete file with key: ${key}`);
};

/**
 * Delete multiple files from S3
 *
 * @param keys - Array of S3 keys to delete
 */
export const deleteFiles = async (keys: string[]): Promise<void> => {
  if (!keys || keys.length === 0) {
    return;
  }

  // TODO: Implement batch deletion when AWS SDK is installed
  // Use DeleteObjectsCommand for batch deletion
  // const command = new DeleteObjectsCommand({
  //   Bucket: config.aws.s3BucketName,
  //   Delete: {
  //     Objects: keys.map(key => ({ Key: key })),
  //   },
  // });
  //
  // await s3Client.send(command);

  // Placeholder - in production this would batch delete from S3
  console.log(`[S3] Would delete ${keys.length} files`);
};

/**
 * Get the public URL for a file (if bucket is public)
 * For private buckets, use generatePresignedDownloadUrl instead
 *
 * @param key - S3 key of the file
 * @returns Public URL
 */
export const getPublicUrl = (key: string): string => {
  if (!key) {
    throw new ApiError(400, 'S3 key is required');
  }

  return `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
};

/**
 * Extract S3 key from a full S3 URL
 *
 * @param url - Full S3 URL
 * @returns S3 key
 */
export const extractKeyFromUrl = (url: string): string => {
  if (!url) {
    throw new ApiError(400, 'URL is required');
  }

  // Handle both path-style and virtual-hosted-style URLs
  const patterns = [
    // Path-style: https://s3.region.amazonaws.com/bucket/key
    new RegExp(`https://s3\\..*\\.amazonaws\\.com/${config.aws.s3BucketName}/(.+?)(?:\\?|$)`),
    // Virtual-hosted-style: https://bucket.s3.region.amazonaws.com/key
    new RegExp(`https://${config.aws.s3BucketName}\\.s3\\..*\\.amazonaws\\.com/(.+?)(?:\\?|$)`),
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  throw new ApiError(400, 'Invalid S3 URL format');
};

/**
 * Validate that required AWS credentials are configured
 *
 * @throws ApiError if credentials are missing
 */
export const validateAwsConfig = (): void => {
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
    throw new ApiError(
      500,
      'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
    );
  }

  if (!config.aws.s3BucketName) {
    throw new ApiError(
      500,
      'S3 bucket not configured. Please set S3_BUCKET_NAME environment variable.'
    );
  }
};
