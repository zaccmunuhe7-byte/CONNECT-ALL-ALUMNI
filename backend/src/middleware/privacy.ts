import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';

/**
 * Middleware that ensures only the resource owner or an ADMIN can proceed.
 * Compares req.user.id against req.params[paramName].
 */
export function requireOwnerOrAdmin(paramName = 'userId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const targetId = req.params[paramName];
    const currentUser = req.user;

    if (!currentUser) {
      return next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
    }

    // Admin has global access
    if (currentUser.role === 'ADMIN') {
      return next();
    }

    // Owner can access their own data
    if (currentUser.id === targetId) {
      return next();
    }

    return next(new AppError(403, 'You do not have permission to access this resource', 'FORBIDDEN'));
  };
}
