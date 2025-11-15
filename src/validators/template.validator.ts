import { z } from 'zod';

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    icon: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    config: z.record(z.unknown()),
    isPublic: z.boolean().optional(),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    icon: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    config: z.record(z.unknown()).optional(),
    isPublic: z.boolean().optional(),
  }),
});

export const listTemplatesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(['downloads', 'rating', 'createdAt', 'name']).optional(),
    category: z.string().optional(),
    featured: z.coerce.boolean().optional(),
    search: z.string().optional(),
  }),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
export type ListTemplatesQuery = z.infer<typeof listTemplatesSchema>['query'];
