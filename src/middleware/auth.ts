import { Response, NextFunction } from 'express';
import { AuthRequest, ApiError } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { query } from '../db';
import { User } from '../types';

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Get user from database
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'User not found or inactive');
    }

    const user = result.rows[0];

    // Remove password hash before attaching to request
    const { password_hash: _password_hash, ...safeUser } = user;
    req.user = safeUser as any;
    req.userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
};
