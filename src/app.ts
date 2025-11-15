import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { requestLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';

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

// Mount routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
