import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import creditsRoutes from './routes/credits';
import workflowRoutes from './routes/workflows';
import blocksRoutes from './routes/blocks';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

app.use('/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/blocks', blocksRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
