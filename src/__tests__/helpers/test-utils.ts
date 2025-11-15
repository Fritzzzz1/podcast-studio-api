import { query } from '../../db';
import { hashPassword } from '../../utils/password';
import { generateAccessToken } from '../../utils/jwt';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  token: string;
}

export const createTestUser = async (overrides = {}): Promise<TestUser> => {
  const email = `test-${Date.now()}-${Math.random()}@example.com`;
  const password = 'Test123!@#';
  const full_name = 'Test User';

  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, is_active, email_verified)
     VALUES ($1, $2, $3, true, true)
     RETURNING id, email, full_name`,
    [email, passwordHash, full_name]
  );

  const user = result.rows[0];
  const token = generateAccessToken({ userId: user.id, email: user.email });

  return {
    id: user.id,
    email: user.email,
    password,
    full_name: user.full_name,
    token,
    ...overrides,
  };
};

export const cleanupTestUsers = async () => {
  await query("DELETE FROM users WHERE email LIKE 'test-%@example.com'");
};

export const cleanupDatabase = async () => {
  // Clean in order to respect foreign key constraints
  await query('DELETE FROM comments');
  await query('DELETE FROM template_ratings');
  await query('DELETE FROM project_collaborators');
  await query('DELETE FROM episodes');
  await query('DELETE FROM templates');
  await query('DELETE FROM projects');
  await query('DELETE FROM subscriptions');
  await query("DELETE FROM users WHERE email LIKE 'test-%@example.com'");
};

export const createTestProject = async (userId: string, overrides = {}) => {
  const result = await query(
    `INSERT INTO projects (user_id, name, description, is_public)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      userId,
      overrides['name'] || 'Test Project',
      overrides['description'] || 'Test Description',
      overrides['is_public'] || false,
    ]
  );

  return result.rows[0];
};

export const createTestEpisode = async (projectId: string, overrides = {}) => {
  const result = await query(
    `INSERT INTO episodes (project_id, title, description, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      projectId,
      overrides['title'] || 'Test Episode',
      overrides['description'] || 'Test Episode Description',
      overrides['status'] || 'draft',
    ]
  );

  return result.rows[0];
};

export const createTestTemplate = async (creatorId: string, overrides = {}) => {
  const result = await query(
    `INSERT INTO templates (creator_id, name, description, config, is_public)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      creatorId,
      overrides['name'] || 'Test Template',
      overrides['description'] || 'Test Template Description',
      JSON.stringify(overrides['config'] || { sampleRate: 48000 }),
      overrides['is_public'] || false,
    ]
  );

  return result.rows[0];
};

export const createTestComment = async (
  episodeId: string,
  userId: string,
  overrides: any = {}
) => {
  const result = await query(
    `INSERT INTO comments (episode_id, user_id, content, timestamp_seconds, parent_comment_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      episodeId,
      userId,
      overrides['content'] || 'Test Comment',
      overrides['timestamp_seconds'] || null,
      overrides['parent_comment_id'] || null,
    ]
  );

  return result.rows[0];
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
