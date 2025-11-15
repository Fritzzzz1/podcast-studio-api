import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '../types';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: messages,
        });
      }
      next(new ApiError(400, 'Invalid request data'));
    }
  };
};
