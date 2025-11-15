import jwt from 'jsonwebtoken';
import config from '../config';
import { JwtPayload } from '../types';
import { ApiError } from '../types';

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, 'Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token expired');
    }
    throw new ApiError(401, 'Invalid refresh token');
  }
};
