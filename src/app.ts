import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import episodeRoutes from './routes/episode.routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Podcast Studio API is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API version info
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Podcast Studio API',
    version: config.apiVersion,
    documentation: `/api/${config.apiVersion}/docs`,
  });
});

// API Routes
const apiPrefix = `/api/${config.apiVersion}`;

// Apply global rate limiter to all API routes
app.use(apiPrefix, apiLimiter);

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/projects`, episodeRoutes); // For POST /projects/:projectId/episodes
app.use(`${apiPrefix}/projects`, projectRoutes);
app.use(`${apiPrefix}/episodes`, episodeRoutes);

// API Documentation
app.use(
  `${apiPrefix}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'Podcast Studio API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
