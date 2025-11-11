import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Store active SSE connections
const activeConnections = new Map<string, Response[]>();

// SSE endpoint for real-time execution updates
// Note: SSE doesn't support custom headers, so we accept token via query param
router.get(
  '/:workflowId/executions/:executionId/stream',
  async (req: Request, res: Response) => {
    const { workflowId, executionId } = req.params;
    const token = req.query.token as string;

    // Validate token from query parameter
    if (!token) {
      logger.warn('SSE: No token provided', { workflowId, executionId });
      res.status(401).json({ error: 'Unauthorized - token required' });
      return;
    }

    // Verify JWT token manually (since EventSource can't send Authorization header)
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key-change-in-production');
      if (!decoded || !decoded.userId) {
        logger.warn('SSE: Invalid token payload', { workflowId, executionId });
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      logger.info('SSE: Token verified successfully', { userId: decoded.userId, workflowId, executionId });
    } catch (error: any) {
      logger.error('SSE: Token verification failed', { error: error.message, workflowId, executionId });
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    logger.info('SSE connection established', { workflowId, executionId });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', executionId })}\n\n`);

    // Store connection
    const key = `${workflowId}:${executionId}`;
    if (!activeConnections.has(key)) {
      activeConnections.set(key, []);
    }
    activeConnections.get(key)!.push(res);

    // Cleanup on disconnect
    req.on('close', () => {
      logger.info('SSE connection closed', { workflowId, executionId });
      const connections = activeConnections.get(key);
      if (connections) {
        const index = connections.indexOf(res);
        if (index > -1) {
          connections.splice(index, 1);
        }
        if (connections.length === 0) {
          activeConnections.delete(key);
        }
      }
    });
  }
);

// Function to broadcast execution events to connected clients
export function broadcastExecutionEvent(
  workflowId: string,
  executionId: string,
  event: any
) {
  const key = `${workflowId}:${executionId}`;
  const connections = activeConnections.get(key);
  
  if (connections && connections.length > 0) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    connections.forEach(res => {
      try {
        res.write(data);
      } catch (error) {
        logger.error('Failed to send SSE event', { error, key });
      }
    });
    logger.debug('Broadcasted execution event', { key, eventType: event.type, recipients: connections.length });
  }
}

export default router;
