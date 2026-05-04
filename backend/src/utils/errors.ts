import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'APP_ERROR'
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Route not found', 'NOT_FOUND'));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const appError = err instanceof AppError ? err : new AppError(500, 'Internal server error');
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message
    }
  });
}
