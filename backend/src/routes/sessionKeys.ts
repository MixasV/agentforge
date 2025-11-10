import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { encryptSessionKey } from '../utils/sessionKeyEncryption';

const router = Router();

/**
 * GET /api/session/config/:sessionId
 * Get session key request configuration
 */
router.get('/config/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionRequest = await prisma.sessionKeyRequest.findUnique({
      where: { id: sessionId },
    });

    if (!sessionRequest) {
      return res.status(404).json({
        success: false,
        error: 'Session request not found',
      });
    }

    if (sessionRequest.status !== 'pending_auth') {
      return res.status(400).json({
        success: false,
        error: 'Session request already completed or expired',
      });
    }

    const now = new Date();
    if (sessionRequest.validUntil < now) {
      return res.status(400).json({
        success: false,
        error: 'Session request expired',
      });
    }

    const validDays = Math.ceil(
      (sessionRequest.validUntil.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return res.json({
      success: true,
      data: {
        sessionId: sessionRequest.id,
        validDays,
        maxTransactions: sessionRequest.maxTransactions,
        maxAmountSol: Number(sessionRequest.maxAmountPerTx) / 1e9,
        allowedPrograms: sessionRequest.allowedPrograms,
      },
    });
  } catch (error) {
    logger.error('Get session config failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get session configuration',
    });
  }
});

/**
 * POST /api/session/authorize
 * Complete session key authorization
 */
router.post('/authorize', async (req, res) => {
  try {
    const {
      sessionId,
      sessionKeyPublic,
      sessionKeyPrivate,
      userWallet,
    } = req.body;

    if (!sessionId || !sessionKeyPublic || !sessionKeyPrivate || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Get session request
    const sessionRequest = await prisma.sessionKeyRequest.findUnique({
      where: { id: sessionId },
    });

    if (!sessionRequest) {
      return res.status(404).json({
        success: false,
        error: 'Session request not found',
      });
    }

    if (sessionRequest.status !== 'pending_auth') {
      return res.status(400).json({
        success: false,
        error: 'Session request already completed',
      });
    }

    // Check expiry
    if (sessionRequest.validUntil < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Session request expired',
      });
    }

    // Encrypt session key private
    const { encrypted, iv } = await encryptSessionKey(
      sessionKeyPrivate,
      sessionRequest.userId
    );

    // Create user session
    const userSession = await prisma.userSession.create({
      data: {
        userId: sessionRequest.userId,
        sessionKeyPublic,
        sessionKeyPrivate: encrypted,
        encryptionIV: iv,
        expiresAt: sessionRequest.validUntil,
        maxTransactions: sessionRequest.maxTransactions,
        maxAmountPerTx: sessionRequest.maxAmountPerTx,
        allowedPrograms: sessionRequest.allowedPrograms,
        status: 'authorized',
        isActive: true,
        userIp: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Update session request status
    await prisma.sessionKeyRequest.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    logger.info('Session key authorized', {
      userId: sessionRequest.userId,
      sessionId: userSession.id,
      sessionKeyPublic,
    });

    return res.json({
      success: true,
      data: {
        sessionId: userSession.id,
        expiresAt: userSession.expiresAt.toISOString(),
        maxTransactions: userSession.maxTransactions,
      },
    });
  } catch (error) {
    logger.error('Session authorization failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to authorize session',
    });
  }
});

/**
 * POST /api/session/revoke
 * Revoke user session
 */
router.post('/revoke', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required',
      });
    }

    const result = await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        status: 'revoked',
        revokedAt: new Date(),
      },
    });

    logger.info('Sessions revoked', { userId, count: result.count });

    return res.json({
      success: true,
      data: {
        revokedCount: result.count,
      },
    });
  } catch (error) {
    logger.error('Session revocation failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke session',
    });
  }
});

/**
 * GET /api/session/info/:userId
 * Get user session information
 */
router.get('/info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const session = await prisma.userSession.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!session) {
      return res.json({
        success: true,
        data: {
          hasActiveSession: false,
        },
      });
    }

    const transactionsRemaining =
      session.maxTransactions - (session.transactionsUsed || 0);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (session.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return res.json({
      success: true,
      data: {
        hasActiveSession: true,
        sessionPublicKey: session.sessionKeyPublic,
        expiresAt: session.expiresAt.toISOString(),
        daysRemaining,
        transactionsUsed: session.transactionsUsed,
        transactionsRemaining,
        maxAmountSol: Number(session.maxAmountPerTx) / 1e9,
        status: session.status,
      },
    });
  } catch (error) {
    logger.error('Get session info failed', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get session information',
    });
  }
});

export default router;
