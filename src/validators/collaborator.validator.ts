import { z } from 'zod';

export const inviteCollaboratorSchema = z.object({
  body: z.object({
    email: z.string().email(),
    permissionLevel: z.enum(['view', 'comment', 'edit']),
  }),
});

export const updateCollaboratorSchema = z.object({
  body: z.object({
    permissionLevel: z.enum(['view', 'comment', 'edit']),
  }),
});

export type InviteCollaboratorInput = z.infer<
  typeof inviteCollaboratorSchema
>['body'];
export type UpdateCollaboratorInput = z.infer<
  typeof updateCollaboratorSchema
>['body'];
