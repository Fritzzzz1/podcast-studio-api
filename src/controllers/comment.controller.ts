import { Response } from 'express';
import { query } from '../db';
import { AuthRequest, ApiError, Episode } from '../types';

interface Comment {
  id: string;
  episode_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  timestamp_seconds: number | null;
  is_resolved: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CreateCommentInput {
  content: string;
  timestampSeconds?: number;
}

interface ReplyCommentInput {
  content: string;
}

interface UpdateCommentInput {
  content: string;
}

export const getEpisodeComments = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if episode exists and user has access
  const episodeResult = await query<Episode>(
    `SELECT e.*, p.user_id as project_owner_id
     FROM episodes e
     JOIN projects p ON p.id = e.project_id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check if user has access to the project
  const hasAccess =
    episode.project_owner_id === req.userId ||
    (await checkCollaboratorAccess(episode.project_id, req.userId));

  if (!hasAccess) {
    throw new ApiError(403, 'Access denied to this episode');
  }

  // Get comments with user info
  const result = await query(
    `SELECT c.*, u.full_name, u.avatar_url, u.email
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.episode_id = $1
     ORDER BY c.timestamp_seconds ASC, c.created_at ASC`,
    [id]
  );

  // Organize comments into a tree structure (parent comments and their replies)
  const comments = result.rows;
  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  // First pass: create map of all comments
  comments.forEach((comment: any) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into tree
  comments.forEach((comment: any) => {
    const commentWithReplies = commentMap.get(comment.id);
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  res.status(200).json({
    success: true,
    data: rootComments,
  });
};

export const addComment = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { content, timestampSeconds } = req.body as CreateCommentInput;

  // Check if episode exists and user has access
  const episodeResult = await query<Episode>(
    `SELECT e.*, p.user_id as project_owner_id
     FROM episodes e
     JOIN projects p ON p.id = e.project_id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [id]
  );

  if (episodeResult.rows.length === 0) {
    throw new ApiError(404, 'Episode not found');
  }

  const episode = episodeResult.rows[0];

  // Check if user has comment permission
  const hasAccess =
    episode.project_owner_id === req.userId ||
    (await checkCollaboratorPermission(episode.project_id, req.userId, 'comment'));

  if (!hasAccess) {
    throw new ApiError(403, 'You need comment permission to add comments');
  }

  // Create comment
  const result = await query<Comment>(
    `INSERT INTO comments (episode_id, user_id, content, timestamp_seconds)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, req.userId, content, timestampSeconds || null]
  );

  const comment = result.rows[0];

  // Get user info
  const userResult = await query(
    'SELECT full_name, avatar_url, email FROM users WHERE id = $1',
    [req.userId]
  );

  res.status(201).json({
    success: true,
    data: {
      ...comment,
      ...userResult.rows[0],
      replies: [],
    },
  });
};

export const replyToComment = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { content } = req.body as ReplyCommentInput;

  // Check if parent comment exists
  const parentCommentResult = await query<Comment>(
    `SELECT c.*, e.project_id, p.user_id as project_owner_id
     FROM comments c
     JOIN episodes e ON e.id = c.episode_id
     JOIN projects p ON p.id = e.project_id
     WHERE c.id = $1`,
    [id]
  );

  if (parentCommentResult.rows.length === 0) {
    throw new ApiError(404, 'Parent comment not found');
  }

  const parentComment = parentCommentResult.rows[0];

  // Check if user has comment permission
  const hasAccess =
    parentComment.project_owner_id === req.userId ||
    (await checkCollaboratorPermission(
      parentComment.project_id,
      req.userId,
      'comment'
    ));

  if (!hasAccess) {
    throw new ApiError(403, 'You need comment permission to reply');
  }

  // Create reply
  const result = await query<Comment>(
    `INSERT INTO comments (episode_id, user_id, parent_comment_id, content, timestamp_seconds)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      parentComment.episode_id,
      req.userId,
      id,
      content,
      parentComment.timestamp_seconds,
    ]
  );

  const reply = result.rows[0];

  // Get user info
  const userResult = await query(
    'SELECT full_name, avatar_url, email FROM users WHERE id = $1',
    [req.userId]
  );

  res.status(201).json({
    success: true,
    data: {
      ...reply,
      ...userResult.rows[0],
      replies: [],
    },
  });
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { content } = req.body as UpdateCommentInput;

  // Check if comment exists and belongs to user
  const commentResult = await query<Comment>(
    'SELECT * FROM comments WHERE id = $1',
    [id]
  );

  if (commentResult.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }

  if (commentResult.rows[0].user_id !== req.userId) {
    throw new ApiError(403, 'You can only update your own comments');
  }

  // Update comment
  const result = await query<Comment>(
    `UPDATE comments
     SET content = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [content, id]
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if comment exists
  const commentResult = await query<Comment>(
    `SELECT c.*, e.project_id, p.user_id as project_owner_id
     FROM comments c
     JOIN episodes e ON e.id = c.episode_id
     JOIN projects p ON p.id = e.project_id
     WHERE c.id = $1`,
    [id]
  );

  if (commentResult.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }

  const comment = commentResult.rows[0];

  // Only comment author or project owner can delete
  if (comment.user_id !== req.userId && comment.project_owner_id !== req.userId) {
    throw new ApiError(403, 'You can only delete your own comments or as project owner');
  }

  // Delete comment (this will cascade to replies due to foreign key constraint)
  await query('DELETE FROM comments WHERE id = $1', [id]);

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
};

export const resolveComment = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if comment exists
  const commentResult = await query<Comment>(
    `SELECT c.*, e.project_id, p.user_id as project_owner_id
     FROM comments c
     JOIN episodes e ON e.id = c.episode_id
     JOIN projects p ON p.id = e.project_id
     WHERE c.id = $1`,
    [id]
  );

  if (commentResult.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }

  const comment = commentResult.rows[0];

  // Check if user has edit permission or is comment author
  const hasAccess =
    comment.user_id === req.userId ||
    comment.project_owner_id === req.userId ||
    (await checkCollaboratorPermission(comment.project_id, req.userId, 'edit'));

  if (!hasAccess) {
    throw new ApiError(403, 'You need edit permission to resolve comments');
  }

  // Toggle resolved status
  const result = await query<Comment>(
    `UPDATE comments
     SET is_resolved = NOT is_resolved
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
};

// Helper functions
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

const checkCollaboratorPermission = async (
  projectId: string,
  userId: string,
  requiredPermission: 'view' | 'comment' | 'edit'
): Promise<boolean> => {
  const result = await query(
    `SELECT permission_level FROM project_collaborators
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const permission = result.rows[0].permission_level;

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
