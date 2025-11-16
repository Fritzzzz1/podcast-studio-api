import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  config: z.record(z.unknown()),
  isPublic: z.boolean().optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  config: z.record(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
});

export const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(['downloads', 'rating', 'createdAt', 'name']).optional(),
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const rateTemplateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type RateTemplateInput = z.infer<typeof rateTemplateSchema>;
