import swaggerJsdoc from 'swagger-jsdoc';
import config from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Podcast Studio API',
      version: '1.0.0',
      description:
        'Backend API for Podcast Studio - cloud features including user authentication, project backup and sync, template marketplace, collaboration features, and analytics.',
      contact: {
        name: 'API Support',
        email: 'support@podcaststudio.app',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Development server',
      },
      {
        url: 'https://api.podcaststudio.app/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            subscriptionTier: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
            },
            storageQuotaBytes: { type: 'integer' },
            storageUsedBytes: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            coverImageUrl: { type: 'string', format: 'uri', nullable: true },
            category: { type: 'string', nullable: true },
            isPublic: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Episode: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            durationSeconds: { type: 'integer', nullable: true },
            audioFileUrl: { type: 'string', format: 'uri', nullable: true },
            audioFileSizeBytes: { type: 'integer', nullable: true },
            status: {
              type: 'string',
              enum: ['draft', 'processing', 'ready'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or invalid token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ForbiddenError: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User profile management',
      },
      {
        name: 'Projects',
        description: 'Podcast project management',
      },
      {
        name: 'Episodes',
        description: 'Episode management and file uploads',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
