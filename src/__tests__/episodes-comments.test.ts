import request from 'supertest';
import app from '../app';
import {
  cleanupDatabase,
  createTestUser,
  createTestProject,
  createTestEpisode,
  createTestComment,
} from './helpers/test-utils';

describe('Episodes & Comments API', () => {
  beforeAll(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Episodes API', () => {
    describe('POST /api/v1/projects/:projectId/episodes', () => {
      it('should create a new episode', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);

        const response = await request(app)
          .post(`/api/v1/projects/${project.id}/episodes`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            title: 'Episode 1',
            description: 'First episode',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.title).toBe('Episode 1');
        expect(response.body.data.project_id).toBe(project.id);
      });

      it('should reject episode creation for non-owned project', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const project = await createTestProject(user1.id);

        const response = await request(app)
          .post(`/api/v1/projects/${project.id}/episodes`)
          .set('Authorization', `Bearer ${user2.token}`)
          .send({
            title: 'Episode 1',
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/v1/episodes/:id', () => {
      it('should get episode details', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .get(`/api/v1/episodes/${episode.id}`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.id).toBe(episode.id);
      });

      it('should deny access to other users episodes', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const project = await createTestProject(user1.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .get(`/api/v1/episodes/${episode.id}`)
          .set('Authorization', `Bearer ${user2.token}`);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('PUT /api/v1/episodes/:id', () => {
      it('should update episode', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .put(`/api/v1/episodes/${episode.id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            title: 'Updated Episode Title',
            description: 'Updated description',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.title).toBe('Updated Episode Title');
      });
    });

    describe('DELETE /api/v1/episodes/:id', () => {
      it('should delete episode', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .delete(`/api/v1/episodes/${episode.id}`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Comments API', () => {
    describe('POST /api/v1/episodes/:id/comments', () => {
      it('should add a comment to episode', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .post(`/api/v1/episodes/${episode.id}/comments`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            content: 'Great episode!',
            timestampSeconds: 120.5,
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.content).toBe('Great episode!');
        expect(response.body.data.timestamp_seconds).toBe(120.5);
      });

      it('should allow collaborators with comment permission to add comments', async () => {
        const owner = await createTestUser();
        const collaborator = await createTestUser();
        const project = await createTestProject(owner.id);
        const episode = await createTestEpisode(project.id);

        // Add collaborator with comment permission
        await request(app)
          .post(`/api/v1/projects/${project.id}/collaborators`)
          .set('Authorization', `Bearer ${owner.token}`)
          .send({
            email: collaborator.email,
            permissionLevel: 'comment',
          });

        const response = await request(app)
          .post(`/api/v1/episodes/${episode.id}/comments`)
          .set('Authorization', `Bearer ${collaborator.token}`)
          .send({
            content: 'Comment from collaborator',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
      });

      it('should reject comments from users without permission', async () => {
        const owner = await createTestUser();
        const user = await createTestUser();
        const project = await createTestProject(owner.id);
        const episode = await createTestEpisode(project.id);

        const response = await request(app)
          .post(`/api/v1/episodes/${episode.id}/comments`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            content: 'Unauthorized comment',
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/v1/episodes/:id/comments', () => {
      it('should get all episode comments in tree structure', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);

        // Create parent comment
        const parentComment = await createTestComment(episode.id, user.id, {
          content: 'Parent comment',
        });

        // Create reply
        await createTestComment(episode.id, user.id, {
          content: 'Reply comment',
          parent_comment_id: parentComment.id,
        });

        const response = await request(app)
          .get(`/api/v1/episodes/${episode.id}/comments`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveLength(1); // One root comment
        expect(response.body.data[0].replies).toHaveLength(1); // One reply
      });
    });

    describe('POST /api/v1/comments/:id/reply', () => {
      it('should reply to a comment', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);
        const parentComment = await createTestComment(episode.id, user.id);

        const response = await request(app)
          .post(`/api/v1/comments/${parentComment.id}/reply`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            content: 'This is a reply',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.content).toBe('This is a reply');
        expect(response.body.data.parent_comment_id).toBe(parentComment.id);
      });
    });

    describe('PUT /api/v1/comments/:id', () => {
      it('should update own comment', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);
        const comment = await createTestComment(episode.id, user.id);

        const response = await request(app)
          .put(`/api/v1/comments/${comment.id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            content: 'Updated comment content',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.content).toBe('Updated comment content');
      });

      it('should reject update of other users comment', async () => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const project = await createTestProject(user1.id);
        const episode = await createTestEpisode(project.id);
        const comment = await createTestComment(episode.id, user1.id);

        const response = await request(app)
          .put(`/api/v1/comments/${comment.id}`)
          .set('Authorization', `Bearer ${user2.token}`)
          .send({
            content: 'Hacked content',
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('DELETE /api/v1/comments/:id', () => {
      it('should delete own comment', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);
        const comment = await createTestComment(episode.id, user.id);

        const response = await request(app)
          .delete(`/api/v1/comments/${comment.id}`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });

      it('should allow project owner to delete any comment', async () => {
        const owner = await createTestUser();
        const collaborator = await createTestUser();
        const project = await createTestProject(owner.id);
        const episode = await createTestEpisode(project.id);

        // Add collaborator
        await request(app)
          .post(`/api/v1/projects/${project.id}/collaborators`)
          .set('Authorization', `Bearer ${owner.token}`)
          .send({
            email: collaborator.email,
            permissionLevel: 'comment',
          });

        // Collaborator adds comment
        const commentResponse = await request(app)
          .post(`/api/v1/episodes/${episode.id}/comments`)
          .set('Authorization', `Bearer ${collaborator.token}`)
          .send({
            content: 'Comment from collaborator',
          });

        const commentId = commentResponse.body.data.id;

        // Owner deletes collaborator's comment
        const deleteResponse = await request(app)
          .delete(`/api/v1/comments/${commentId}`)
          .set('Authorization', `Bearer ${owner.token}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toHaveProperty('success', true);
      });
    });

    describe('POST /api/v1/comments/:id/resolve', () => {
      it('should toggle comment resolved status', async () => {
        const user = await createTestUser();
        const project = await createTestProject(user.id);
        const episode = await createTestEpisode(project.id);
        const comment = await createTestComment(episode.id, user.id);

        const response = await request(app)
          .post(`/api/v1/comments/${comment.id}/resolve`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.is_resolved).toBe(true);

        // Toggle back
        const response2 = await request(app)
          .post(`/api/v1/comments/${comment.id}/resolve`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response2.status).toBe(200);
        expect(response2.body.data.is_resolved).toBe(false);
      });

      it('should allow users with edit permission to resolve comments', async () => {
        const owner = await createTestUser();
        const collaborator = await createTestUser();
        const project = await createTestProject(owner.id);
        const episode = await createTestEpisode(project.id);
        const comment = await createTestComment(episode.id, owner.id);

        // Add collaborator with edit permission
        await request(app)
          .post(`/api/v1/projects/${project.id}/collaborators`)
          .set('Authorization', `Bearer ${owner.token}`)
          .send({
            email: collaborator.email,
            permissionLevel: 'edit',
          });

        const response = await request(app)
          .post(`/api/v1/comments/${comment.id}/resolve`)
          .set('Authorization', `Bearer ${collaborator.token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.is_resolved).toBe(true);
      });
    });
  });
});
