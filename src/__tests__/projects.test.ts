import request from 'supertest';
import app from '../app';
import {
  cleanupDatabase,
  createTestUser,
  createTestProject,
} from './helpers/test-utils';

describe('Projects API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'My Podcast',
          description: 'A great podcast',
          category: 'Technology',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toBe('My Podcast');
      expect(response.body.data.description).toBe('A great podcast');
      expect(response.body.data.user_id).toBe(user.id);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).post('/api/v1/projects').send({
        name: 'My Podcast',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should list user projects', async () => {
      const user = await createTestUser();
      await createTestProject(user.id, { name: 'Project 1' });
      await createTestProject(user.id, { name: 'Project 2' });

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data).toHaveProperty('total', 2);
      expect(response.body.data).toHaveProperty('page', 1);
    });

    it('should support pagination', async () => {
      const user = await createTestUser();
      for (let i = 1; i <= 5; i++) {
        await createTestProject(user.id, { name: `Project ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/projects?page=2&limit=2')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.total).toBe(5);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/v1/projects');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get project details', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.project.id).toBe(project.id);
      expect(response.body.data).toHaveProperty('episodes');
      expect(response.body.data).toHaveProperty('collaborators');
    });

    it('should return 404 for non-existent project', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should deny access to other users projects', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const project = await createTestProject(user1.id);

      const response = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .put(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated Project Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toBe('Updated Project Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should reject update from non-owner', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const project = await createTestProject(user1.id);

      const response = await request(app)
        .put(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          name: 'Hacked Name',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project (soft delete)', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .delete(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify project is soft deleted
      const getResponse = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject delete from non-owner', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const project = await createTestProject(user1.id);

      const response = await request(app)
        .delete(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/projects/:id/sync', () => {
    it('should sync project', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .post(`/api/v1/projects/${project.id}/sync`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          project: {
            name: 'Synced Project Name',
            description: 'Synced description',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.project.name).toBe('Synced Project Name');
      expect(response.body.data).toHaveProperty('syncedAt');
    });
  });

  describe('GET /api/v1/projects/:id/sync-status', () => {
    it('should get sync status', async () => {
      const user = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .get(`/api/v1/projects/${project.id}/sync-status`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('lastSyncedAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('needsSync');
    });
  });
});
