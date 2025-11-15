import request from 'supertest';
import app from '../app';
import {
  cleanupDatabase,
  createTestUser,
  createTestTemplate,
} from './helpers/test-utils';

describe('Templates API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/templates', () => {
    it('should create a new template', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'My Template',
          description: 'A great template',
          category: 'Interview',
          config: { sampleRate: 48000, bitrate: 320 },
          isPublic: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toBe('My Template');
      expect(response.body.data.creator_id).toBe(user.id);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).post('/api/v1/templates').send({
        name: 'My Template',
        config: {},
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/templates', () => {
    it('should list public templates', async () => {
      const user = await createTestUser();
      await createTestTemplate(user.id, { name: 'Template 1', is_public: true });
      await createTestTemplate(user.id, { name: 'Template 2', is_public: true });
      await createTestTemplate(user.id, { name: 'Private', is_public: false });

      const response = await request(app).get('/api/v1/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.templates.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
    });

    it('should support search', async () => {
      const user = await createTestUser();
      await createTestTemplate(user.id, {
        name: 'Interview Template',
        is_public: true,
      });
      await createTestTemplate(user.id, {
        name: 'Music Template',
        is_public: true,
      });

      const response = await request(app).get('/api/v1/templates?search=Interview');

      expect(response.status).toBe(200);
      const interviewTemplates = response.body.data.templates.filter((t: any) =>
        t.name.includes('Interview')
      );
      expect(interviewTemplates.length).toBeGreaterThan(0);
    });

    it('should support filtering by category', async () => {
      const user = await createTestUser();
      await createTestTemplate(user.id, {
        name: 'Template 1',
        category: 'Interview',
        is_public: true,
      });
      await createTestTemplate(user.id, {
        name: 'Template 2',
        category: 'Music',
        is_public: true,
      });

      const response = await request(app).get('/api/v1/templates?category=Interview');

      expect(response.status).toBe(200);
      response.body.data.templates.forEach((template: any) => {
        expect(template.category).toBe('Interview');
      });
    });
  });

  describe('GET /api/v1/templates/my', () => {
    it('should list current users templates', async () => {
      const user = await createTestUser();
      await createTestTemplate(user.id, { name: 'My Template 1' });
      await createTestTemplate(user.id, { name: 'My Template 2' });

      const response = await request(app)
        .get('/api/v1/templates/my')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.templates).toHaveLength(2);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/v1/templates/my');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should get template details', async () => {
      const user = await createTestUser();
      const template = await createTestTemplate(user.id, { is_public: true });

      const response = await request(app).get(`/api/v1/templates/${template.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.template.id).toBe(template.id);
      expect(response.body.data).toHaveProperty('ratings');
    });

    it('should deny access to private templates from other users', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id, { is_public: false });

      const response = await request(app)
        .get(`/api/v1/templates/${template.id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('should update template', async () => {
      const user = await createTestUser();
      const template = await createTestTemplate(user.id);

      const response = await request(app)
        .put(`/api/v1/templates/${template.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Updated Template Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toBe('Updated Template Name');
    });

    it('should reject update from non-creator', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id);

      const response = await request(app)
        .put(`/api/v1/templates/${template.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          name: 'Hacked Name',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    it('should delete template', async () => {
      const user = await createTestUser();
      const template = await createTestTemplate(user.id);

      const response = await request(app)
        .delete(`/api/v1/templates/${template.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify template is deleted
      const getResponse = await request(app)
        .get(`/api/v1/templates/${template.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /api/v1/templates/:id/rate', () => {
    it('should rate a template', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id, { is_public: true });

      const response = await request(app)
        .post(`/api/v1/templates/${template.id}/rate`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          rating: 5,
          review: 'Excellent template!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.review).toBe('Excellent template!');
    });

    it('should update existing rating', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id, { is_public: true });

      // First rating
      await request(app)
        .post(`/api/v1/templates/${template.id}/rate`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          rating: 3,
          review: 'Good',
        });

      // Update rating
      const response = await request(app)
        .post(`/api/v1/templates/${template.id}/rate`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          rating: 5,
          review: 'Actually excellent!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.review).toBe('Actually excellent!');
    });

    it('should validate rating value', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id, { is_public: true });

      const response = await request(app)
        .post(`/api/v1/templates/${template.id}/rate`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          rating: 10, // Invalid: should be 1-5
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/templates/:id/ratings', () => {
    it('should get template ratings', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const template = await createTestTemplate(user1.id, { is_public: true });

      // Add a rating
      await request(app)
        .post(`/api/v1/templates/${template.id}/rate`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          rating: 5,
          review: 'Great!',
        });

      const response = await request(app).get(
        `/api/v1/templates/${template.id}/ratings`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.ratings).toHaveLength(1);
      expect(response.body.data).toHaveProperty('averageRating');
      expect(response.body.data).toHaveProperty('totalRatings');
    });
  });

  describe('POST /api/v1/templates/:id/download', () => {
    it('should increment download count', async () => {
      const user = await createTestUser();
      const template = await createTestTemplate(user.id, { is_public: true });

      const response = await request(app).post(
        `/api/v1/templates/${template.id}/download`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject download of non-public template', async () => {
      const user = await createTestUser();
      const template = await createTestTemplate(user.id, { is_public: false });

      const response = await request(app).post(
        `/api/v1/templates/${template.id}/download`
      );

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
