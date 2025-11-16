import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  timestampSeconds: z.number().min(0).optional(),
});

export const replyCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ReplyCommentInput = z.infer<typeof replyCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
