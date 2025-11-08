import { Router } from 'express';
import { creditsService } from '../services/creditsService';
import { x402Service } from '../services/x402Service';
import { authenticate } from '../middleware/auth';
import { validateSchema, paginationSchema, prepaymentSchema, uuidSchema } from '../utils/validation';
import { AuthRequest } from '../types';

const router = Router();

router.get('/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const balance = await creditsService.getBalance(req.user.id);
    return res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/usage', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const usage = await creditsService.getUsageStats(req.user.id);
    return res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/transactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const { page, limit } = validateSchema(paginationSchema, req.query);
    const transactions = await creditsService.getTransactions(req.user.id, page, limit);
    return res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/prepay', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const { amountUsd } = validateSchema(prepaymentSchema, req.body);
    const result = await x402Service.initiatePrepayment({
      userId: req.user.id,
      amountUsd,
    });
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/prepay/:txId/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const txId = validateSchema(uuidSchema, req.params.txId);
    const result = await x402Service.checkPaymentStatus(txId, req.user.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/prepay/:txId/simulate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ success: false, error: 'Only available in development' });
    }
    const txId = validateSchema(uuidSchema, req.params.txId);
    const result = await x402Service.simulatePayment(txId, req.user.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
