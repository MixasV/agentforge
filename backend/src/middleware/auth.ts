import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthenticatedUser } from '../types';
import { AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

export interface JWTPayload {
  userId: string;
  walletAddress?: string;
  telegramUserId?: string;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    logger.error('JWT verification failed', error);
    throw new AuthenticationError('Invalid or expired token');
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = {
      id: payload.userId,
      walletAddress: payload.walletAddress,
      telegramUserId: payload.telegramUserId ? BigInt(payload.telegramUserId) : undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      req.user = {
        id: payload.userId,
        walletAddress: payload.walletAddress,
        telegramUserId: payload.telegramUserId ? BigInt(payload.telegramUserId) : undefined,
      };
    }
  } catch (error) {
    logger.warn('Optional auth failed', { error });
  }
  next();
}
