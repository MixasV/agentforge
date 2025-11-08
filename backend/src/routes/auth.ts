import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { validateSchema } from '../utils/validation';
import { AuthRequest } from '../types';

const router = Router();

const phantomLoginSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string(),
  message: z.string(),
});

router.post('/phantom/login', async (req, res, next) => {
  try {
    const payload = validateSchema(phantomLoginSchema, req.body);
    const result = await authService.loginWithPhantom(payload);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const telegramLoginSchema = z.object({
  telegramUserId: z.string().or(z.number()).transform(val => BigInt(val)),
  username: z.string().optional(),
});

router.post('/telegram/login', async (req, res, next) => {
  try {
    const { telegramUserId, username } = validateSchema(telegramLoginSchema, req.body);
    const result = await authService.loginWithTelegram(telegramUserId, username);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const user = await authService.getCurrentUser(req.user.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (_req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

const emailLoginSchema = z.object({
  email: z.string().email(),
});

router.post('/cdp/login', async (req, res, next) => {
  try {
    const { email } = validateSchema(emailLoginSchema, req.body);
    const result = await authService.initiateEmailLogin(email);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

const verifyOtpSchema = z.object({
  flowId: z.string(),
  otp: z.string().length(6),
  email: z.string().email(),
});

router.post('/cdp/verify', async (req, res, next) => {
  try {
    const { flowId, otp, email } = validateSchema(verifyOtpSchema, req.body);
    const result = await authService.verifyEmailOTP(flowId, otp, email);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
