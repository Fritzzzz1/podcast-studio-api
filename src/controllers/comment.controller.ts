import { Response } from 'express';
import { query } from '../db';
import {
  AuthRequest,
  ApiError,
  Comment,
  CommentWithUser,
  CommentWithReplies,
  EpisodeWithProjectOwner,
} from '../types';
import {
  checkCollaboratorAccess,
  checkCollaboratorPermission,
  checkProjectOwnership,
} from '../utils/accessControl';
import {
  CreateCommentInput,
  ReplyCommentInput,
  UpdateCommentInput,
} from '../validators/comment.validator';

export const getEpisodeComments = async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // Check if episode exists and user has access
  const episodeResult = await query<EpisodeWithProjectOwner>(
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
  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasCollaboratorAccess = await checkCollaboratorAccess(
    episode.project_id,
    req.userId
  );

  if (!isOwner && !hasCollaboratorAccess) {
    throw new ApiError(403, 'Access denied to this episode');
  }

  // Get comments with user info
  const result = await query<CommentWithUser>(
    `SELECT c.*, u.full_name, u.avatar_url, u.email
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.episode_id = $1
     ORDER BY c.timestamp_seconds ASC, c.created_at ASC`,
    [id]
  );

  // Organize comments into a tree structure (parent comments and their replies)
  const comments = result.rows;
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  // First pass: create map of all comments
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into tree
  comments.forEach((comment) => {
    const commentWithReplies = commentMap.get(comment.id);
    if (commentWithReplies) {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
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
  const episodeResult = await query<EpisodeWithProjectOwner>(
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
  const isOwner = await checkProjectOwnership(episode.project_id, req.userId);
  const hasPermission = isOwner || await checkCollaboratorPermission(
    episode.project_id,
    req.userId,
    'comment'
  );

  if (!hasPermission) {
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
  const isOwner = await checkProjectOwnership(parentComment.project_id, req.userId);
  const hasPermission = isOwner || await checkCollaboratorPermission(
    parentComment.project_id,
    req.userId,
    'comment'
  );

  if (!hasPermission) {
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
  const isCommentAuthor = comment.user_id === req.userId;
  const isOwner = await checkProjectOwnership(comment.project_id, req.userId);

  if (!isCommentAuthor && !isOwner) {
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

  // Check if user has permission to resolve (comment author, project owner, or edit permission)
  const isCommentAuthor = comment.user_id === req.userId;
  const isOwner = await checkProjectOwnership(comment.project_id, req.userId);
  const hasEditPermission = await checkCollaboratorPermission(
    comment.project_id,
    req.userId,
    'edit'
  );

  if (!isCommentAuthor && !isOwner && !hasEditPermission) {
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
