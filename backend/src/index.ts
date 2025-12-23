/**
 * Express server entry point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import githubRoutes from './routes/github';
import type { ApiError } from '@repo-dashboard/shared';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', githubRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  const error: ApiError = {
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    statusCode: 404,
  };
  res.status(404).json(error);
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);

  const statusCode = 500;
  const error: ApiError = {
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode,
  };

  res.status(statusCode).json(error);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                    REPO DASHBOARD                        ║
║                      Backend API                         ║
╠══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                 ║
║                                                          ║
║  Endpoints:                                              ║
║    GET  /api/health                                      ║
║    GET  /api/orgs/:org/repos                             ║
║    GET  /api/repos/:owner/:repo/issues                   ║
║    GET  /api/repos/:owner/:repo/pulls                    ║
║    GET  /api/repos/:owner/:repo/branches                 ║
║    POST /api/cache/clear                                 ║
╚══════════════════════════════════════════════════════════╝
  `);
});
