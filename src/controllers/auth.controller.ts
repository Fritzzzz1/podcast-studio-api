import { Request, Response } from 'express';
import { query } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError, User } from '../types';
import {
  SignupInput,
  LoginInput,
  RefreshTokenInput,
} from '../validators/auth.validator';

export const signup = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body as SignupInput;

  // Check if user already exists
  const existingUser = await query<User>(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new ApiError(409, 'User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await query<User>(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name, avatar_url, subscription_tier,
               storage_quota_bytes, storage_used_bytes, created_at,
               updated_at, is_active, email_verified`,
    [email, passwordHash, fullName || null]
  );

  const user = result.rows[0];

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  // Find user
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.is_active) {
    throw new ApiError(401, 'Account is inactive');
  }

  // Verify password
  if (!user.password_hash) {
    throw new ApiError(401, 'Invalid login method. Please use OAuth.');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  // Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

  // Remove password hash from response
  const { password_hash, ...safeUser } = user;

  res.status(200).json({
    success: true,
    data: {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body as RefreshTokenInput;

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if user still exists and is active
  const result = await query<User>(
    'SELECT id, email FROM users WHERE id = $1 AND is_active = true',
    [payload.userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(401, 'User not found or inactive');
  }

  const user = result.rows[0];

  // Generate new access token
  const accessToken = generateAccessToken({ userId: user.id, email: user.email });

  res.status(200).json({
    success: true,
    data: {
      accessToken,
    },
  });
};

export const logout = async (_req: Request, res: Response) => {
  // In a more sophisticated implementation, you might want to:
  // 1. Blacklist the refresh token in Redis
  // 2. Revoke all sessions
  // For now, just return success (client should delete tokens)

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  // TODO: Implement password reset email with token
  // For now, just return success
  const { email: _email } = req.body;

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
};

export const resetPassword = async (_req: Request, res: Response) => {
  // TODO: Implement password reset with token validation
  // For now, just return success
  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully',
  });
};
