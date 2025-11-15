import { z } from 'zod';

export const createEpisodeSchema = z.object({
  title: z.string().min(1, 'Episode title is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  durationSeconds: z.number().int().positive().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
});

export const updateEpisodeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  durationSeconds: z.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'processing', 'ready']).optional(),
});

export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>;
export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>;
