/**
 * GitHub API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getGitHubService } from '../services/github';
import type { RepositoriesResponse, ItemsResponse, ApiError } from '@repo-dashboard/shared';

const router = Router();

// Error handler wrapper
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const github = getGitHubService();
  const rateLimit = github.getRateLimitInfo();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rateLimit: {
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
      resetsAt: new Date(rateLimit.reset).toISOString(),
    },
  });
});

/**
 * GET /api/orgs/:org/repos
 * Get all repositories for an organization
 */
router.get(
  '/orgs/:org/repos',
  asyncHandler(async (req: Request, res: Response) => {
    const { org } = req.params;

    if (!org) {
      const error: ApiError = {
        error: 'Bad Request',
        message: 'Organization name is required',
        statusCode: 400,
      };
      res.status(400).json(error);
      return;
    }

    const github = getGitHubService();
    const repositories = await github.getOrganizationRepos(org);

    const response: RepositoriesResponse = { repositories };
    res.json(response);
  })
);

/**
 * GET /api/repos/:owner/:repo/issues
 * Get all issues for a repository
 */
router.get(
  '/repos/:owner/:repo/issues',
  asyncHandler(async (req: Request, res: Response) => {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      const error: ApiError = {
        error: 'Bad Request',
        message: 'Owner and repository name are required',
        statusCode: 400,
      };
      res.status(400).json(error);
      return;
    }

    const github = getGitHubService();
    const items = await github.getRepositoryIssues(owner, repo);

    const response: ItemsResponse = { items };
    res.json(response);
  })
);

/**
 * GET /api/repos/:owner/:repo/pulls
 * Get all pull requests for a repository
 */
router.get(
  '/repos/:owner/:repo/pulls',
  asyncHandler(async (req: Request, res: Response) => {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      const error: ApiError = {
        error: 'Bad Request',
        message: 'Owner and repository name are required',
        statusCode: 400,
      };
      res.status(400).json(error);
      return;
    }

    const github = getGitHubService();
    const items = await github.getRepositoryPulls(owner, repo);

    const response: ItemsResponse = { items };
    res.json(response);
  })
);

/**
 * GET /api/repos/:owner/:repo/branches
 * Get all branches for a repository
 */
router.get(
  '/repos/:owner/:repo/branches',
  asyncHandler(async (req: Request, res: Response) => {
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      const error: ApiError = {
        error: 'Bad Request',
        message: 'Owner and repository name are required',
        statusCode: 400,
      };
      res.status(400).json(error);
      return;
    }

    const github = getGitHubService();
    const items = await github.getRepositoryBranches(owner, repo);

    const response: ItemsResponse = { items };
    res.json(response);
  })
);

/**
 * POST /api/cache/clear
 * Clear the in-memory cache
 */
router.post('/cache/clear', (_req: Request, res: Response) => {
  const github = getGitHubService();
  github.clearCache();

  res.json({ message: 'Cache cleared successfully' });
});

export default router;
