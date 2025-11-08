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
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

const telegramLoginSchema = z.object({
  telegramUserId: z.union([z.string(), z.number()]),
  username: z.string().optional(),
});

router.post('/telegram/login', async (req, res, next) => {
  try {
    const data = validateSchema(telegramLoginSchema, req.body);
    const telegramUserId = BigInt(data.telegramUserId);
    const result = await authService.loginWithTelegram(telegramUserId, data.username);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const user = await authService.getCurrentUser(req.user.id);
    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, async (_req, res) => {
  return res.json({
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
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
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
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
