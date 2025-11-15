import request from 'supertest';
import app from '../app';
import { cleanupDatabase, createTestUser } from './helpers/test-utils';

describe('Auth API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'StrongPass123!',
          fullName: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject duplicate email', async () => {
      const email = 'duplicate@example.com';

      // Create first user
      await request(app).post('/api/v1/auth/signup').send({
        email,
        password: 'StrongPass123!',
        fullName: 'First User',
      });

      // Try to create second user with same email
      const response = await request(app).post('/api/v1/auth/signup').send({
        email,
        password: 'StrongPass123!',
        fullName: 'Second User',
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app).post('/api/v1/auth/signup').send({
        email: 'invalid-email',
        password: 'StrongPass123!',
        fullName: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate password is required', async () => {
      const response = await request(app).post('/api/v1/auth/signup').send({
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser();

      const response = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: user.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(user.email);
    });

    it('should reject invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'somepassword',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject invalid password', async () => {
      const user = await createTestUser();

      const response = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const user = await createTestUser();

      // Login to get refresh token
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: user.password,
      });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should accept valid email for password reset', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: user.email,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should not reveal if email exists', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should accept password reset request', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some-reset-token',
          newPassword: 'NewStrongPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
