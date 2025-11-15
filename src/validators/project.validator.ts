import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const listProjectsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsSchema>;
