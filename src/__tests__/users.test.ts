import request from 'supertest';
import app from '../app';
import { cleanupDatabase, createTestUser } from './helpers/test-utils';

describe('Users API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user profile', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fullName: 'Updated Name',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.full_name).toBe('Updated Name');
      expect(response.body.data.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should reject unauthenticated update', async () => {
      const response = await request(app).put('/api/v1/users/me').send({
        fullName: 'Updated Name',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get public user profile', async () => {
      const user = await createTestUser();
      const anotherUser = await createTestUser();

      const response = await request(app)
        .get(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${anotherUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data).not.toHaveProperty('password_hash');
    });

    it('should return 404 for non-existent user', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/users/me/storage', () => {
    it('should get storage usage information', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/v1/users/me/storage')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('used');
      expect(response.body.data).toHaveProperty('quota');
      expect(response.body.data).toHaveProperty('percentUsed');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/v1/users/me/storage');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
