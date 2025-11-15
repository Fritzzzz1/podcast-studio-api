import { Request } from 'express';

// User Types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string | null;
  avatar_url: string | null;
  oauth_provider: 'google' | 'apple' | null;
  oauth_id: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  storage_quota_bytes: number;
  storage_used_bytes: number;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  is_active: boolean;
  email_verified: boolean;
}

export interface SafeUser extends Omit<User, 'password_hash'> {}

// Project Types
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
  last_synced_at: Date | null;
  deleted_at: Date | null;
}

// Episode Types
export interface Episode {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  audio_file_url: string | null;
  audio_file_size_bytes: number | null;
  waveform_data: unknown | null;
  recorded_at: Date | null;
  template_id: string | null;
  status: 'draft' | 'processing' | 'ready';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// Template Types
export interface Template {
  id: string;
  creator_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  config: unknown;
  is_default: boolean;
  is_public: boolean;
  is_featured: boolean;
  download_count: number;
  average_rating: number | null;
  created_at: Date;
  updated_at: Date;
}

// Template Rating Types
export interface TemplateRating {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: Date;
}

// Collaborator Types
export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  permission_level: 'view' | 'comment' | 'edit';
  invited_by: string | null;
  invited_at: Date;
  accepted_at: Date | null;
}

// Comment Types
export interface Comment {
  id: string;
  episode_id: string;
  user_id: string | null;
  parent_comment_id: string | null;
  content: string;
  timestamp_seconds: number | null;
  is_resolved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CommentWithUser extends Comment {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface CommentWithReplies extends CommentWithUser {
  replies: CommentWithReplies[];
}

export interface EpisodeWithProjectOwner extends Episode {
  project_owner_id: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  created_at: Date;
  updated_at: Date;
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
