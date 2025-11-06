import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, InsufficientCreditsError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Request error', error, {
    method: req.method,
    path: req.path,
    body: req.body,
  });

  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      errors: error.errors,
    });
  }

  if (error instanceof InsufficientCreditsError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      required: error.required,
      available: error.available,
      topupUrl: '/settings/topup',
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}
