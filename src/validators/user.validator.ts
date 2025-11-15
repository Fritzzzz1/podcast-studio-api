import { z } from 'zod';

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
