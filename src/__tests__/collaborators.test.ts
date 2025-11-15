import request from 'supertest';
import app from '../app';
import {
  cleanupDatabase,
  createTestUser,
  createTestProject,
} from './helpers/test-utils';

describe('Collaborators API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/projects/:id/collaborators', () => {
    it('should invite a collaborator', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'edit',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user_id).toBe(collaborator.id);
      expect(response.body.data.permission_level).toBe('edit');
    });

    it('should reject invitation from non-owner', async () => {
      const owner = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      const project = await createTestProject(owner.id);

      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          email: user3.email,
          permissionLevel: 'edit',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject invalid permission level', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject duplicate collaborator', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      // First invitation
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'edit',
        });

      // Second invitation (should fail)
      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'view',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already a collaborator');
    });
  });

  describe('GET /api/v1/projects/:id/collaborators', () => {
    it('should list project collaborators', async () => {
      const owner = await createTestUser();
      const collab1 = await createTestUser();
      const collab2 = await createTestUser();
      const project = await createTestProject(owner.id);

      // Add collaborators
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collab1.email,
          permissionLevel: 'edit',
        });

      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collab2.email,
          permissionLevel: 'view',
        });

      const response = await request(app)
        .get(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PUT /api/v1/projects/:id/collaborators/:userId', () => {
    it('should update collaborator permission', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      // Add collaborator
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'view',
        });

      // Update permission
      const response = await request(app)
        .put(`/api/v1/projects/${project.id}/collaborators/${collaborator.id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          permissionLevel: 'edit',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.permission_level).toBe('edit');
    });

    it('should reject permission update from non-owner', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const user3 = await createTestUser();
      const project = await createTestProject(owner.id);

      // Add collaborator
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'view',
        });

      // Try to update from non-owner
      const response = await request(app)
        .put(`/api/v1/projects/${project.id}/collaborators/${collaborator.id}`)
        .set('Authorization', `Bearer ${user3.token}`)
        .send({
          permissionLevel: 'edit',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/projects/:id/collaborators/:userId', () => {
    it('should remove collaborator', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      // Add collaborator
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'edit',
        });

      // Remove collaborator
      const response = await request(app)
        .delete(`/api/v1/projects/${project.id}/collaborators/${collaborator.id}`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify collaborator is removed
      const listResponse = await request(app)
        .get(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(listResponse.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/collaborations', () => {
    it('should list projects where user is a collaborator', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project1 = await createTestProject(owner.id, { name: 'Project 1' });
      const project2 = await createTestProject(owner.id, { name: 'Project 2' });

      // Add as collaborator to both projects
      await request(app)
        .post(`/api/v1/projects/${project1.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'edit',
        });

      await request(app)
        .post(`/api/v1/projects/${project2.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'view',
        });

      const response = await request(app)
        .get('/api/v1/collaborations')
        .set('Authorization', `Bearer ${collaborator.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/v1/projects/:id/accept-invitation', () => {
    it('should accept collaboration invitation', async () => {
      const owner = await createTestUser();
      const collaborator = await createTestUser();
      const project = await createTestProject(owner.id);

      // Invite collaborator
      await request(app)
        .post(`/api/v1/projects/${project.id}/collaborators`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          email: collaborator.email,
          permissionLevel: 'edit',
        });

      // Accept invitation
      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/accept-invitation`)
        .set('Authorization', `Bearer ${collaborator.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.accepted_at).toBeTruthy();
    });
  });
});
