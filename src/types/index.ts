import { Request } from 'express';

// User Types
export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  fullName: string | null;
  avatarUrl: string | null;
  oauthProvider: 'google' | 'apple' | null;
  oauthId: string | null;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  storageQuotaBytes: number;
  storageUsedBytes: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  isActive: boolean;
  emailVerified: boolean;
}

export interface SafeUser extends Omit<User, 'passwordHash'> {}

// Project Types
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
  deletedAt: Date | null;
}

// Episode Types
export interface Episode {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  audioFileUrl: string | null;
  audioFileSizeBytes: number | null;
  waveformData: unknown | null;
  recordedAt: Date | null;
  templateId: string | null;
  status: 'draft' | 'processing' | 'ready';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Template Types
export interface Template {
  id: string;
  creatorId: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  config: unknown;
  isDefault: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  downloadCount: number;
  averageRating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Template Rating Types
export interface TemplateRating {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: Date;
}

// Collaborator Types
export interface ProjectCollaborator {
  id: string;
  projectId: string;
  userId: string;
  permissionLevel: 'view' | 'comment' | 'edit';
  invitedBy: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
}

// Comment Types
export interface Comment {
  id: string;
  episodeId: string;
  userId: string | null;
  parentCommentId: string | null;
  content: string;
  timestampSeconds: number | null;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planId: string | null;
  status: 'active' | 'canceled' | 'past_due' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Authenticated Request
export interface AuthRequest extends Request {
  user?: SafeUser;
  userId?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// Error Types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
