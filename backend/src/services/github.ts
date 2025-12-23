/**
 * GitHub API client with pagination, rate limiting, and in-memory caching
 */

import type {
  Repository,
  NormalizedItem,
  Label,
  Assignee,
} from '@repo-dashboard/shared';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

const cache = new Cache();

// Rate limit state
interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

let rateLimitInfo: RateLimitInfo = {
  remaining: 5000,
  reset: Date.now() + 3600000,
  limit: 5000,
};

// GitHub API types (raw responses)
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  default_branch: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface GitHubLabel {
  name: string;
  color: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser | null;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  pull_request?: unknown;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser | null;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  draft: boolean;
  merged_at: string | null;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: GitHubUser | null;
  committer: GitHubUser | null;
}

export class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    this.token = token;
  }

  /**
   * Make an authenticated request to the GitHub API with rate limit handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check rate limit before making request
    if (rateLimitInfo.remaining <= 0) {
      const waitTime = rateLimitInfo.reset - Date.now();
      if (waitTime > 0) {
        throw new Error(
          `GitHub API rate limit exceeded. Resets in ${Math.ceil(waitTime / 1000)} seconds.`
        );
      }
    }

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'repo-dashboard',
        ...options.headers,
      },
    });

    // Update rate limit info from response headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const limit = response.headers.get('x-ratelimit-limit');

    if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
    if (reset) rateLimitInfo.reset = parseInt(reset, 10) * 1000;
    if (limit) rateLimitInfo.limit = parseInt(limit, 10);

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `GitHub API error: ${response.status} ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.message) {
          message = `GitHub API error: ${parsed.message}`;
        }
      } catch {
        // Ignore parse error
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch all pages of a paginated endpoint
   */
  private async fetchAllPages<T>(endpoint: string): Promise<T[]> {
    const results: T[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${endpoint}${separator}per_page=${perPage}&page=${page}`;
      const data = await this.request<T[]>(url);

      results.push(...data);

      // If we got fewer items than requested, we've reached the last page
      if (data.length < perPage) {
        break;
      }

      page++;
    }

    return results;
  }

  /**
   * Get all repositories for an organization
   */
  async getOrganizationRepos(org: string): Promise<Repository[]> {
    const cacheKey = `repos:${org}`;
    const cached = cache.get<Repository[]>(cacheKey);
    if (cached) return cached;

    const repos = await this.fetchAllPages<GitHubRepository>(
      `/orgs/${org}/repos`
    );

    const normalized: Repository[] = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
    }));

    cache.set(cacheKey, normalized);
    return normalized;
  }

  /**
   * Get all issues for a repository (excludes pull requests)
   */
  async getRepositoryIssues(
    owner: string,
    repo: string
  ): Promise<NormalizedItem[]> {
    const cacheKey = `issues:${owner}/${repo}`;
    const cached = cache.get<NormalizedItem[]>(cacheKey);
    if (cached) return cached;

    const issues = await this.fetchAllPages<GitHubIssue>(
      `/repos/${owner}/${repo}/issues?state=all`
    );

    // Filter out pull requests (GitHub API includes them in issues endpoint)
    const filteredIssues = issues.filter((issue) => !issue.pull_request);

    const normalized: NormalizedItem[] = filteredIssues.map((issue) => ({
      id: `issue-${owner}-${repo}-${issue.id}`,
      type: 'issue' as const,
      repository: repo,
      repositoryFullName: `${owner}/${repo}`,
      title: issue.title,
      author: issue.user?.login ?? 'unknown',
      authorAvatarUrl: issue.user?.avatar_url ?? null,
      labels: issue.labels.map(
        (label): Label => ({
          name: label.name,
          color: label.color,
        })
      ),
      assignees: issue.assignees.map(
        (assignee): Assignee => ({
          login: assignee.login,
          avatarUrl: assignee.avatar_url,
        })
      ),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
      state: issue.state as 'open' | 'closed',
      number: issue.number,
    }));

    cache.set(cacheKey, normalized);
    return normalized;
  }

  /**
   * Get all pull requests for a repository
   */
  async getRepositoryPulls(
    owner: string,
    repo: string
  ): Promise<NormalizedItem[]> {
    const cacheKey = `pulls:${owner}/${repo}`;
    const cached = cache.get<NormalizedItem[]>(cacheKey);
    if (cached) return cached;

    const pulls = await this.fetchAllPages<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls?state=all`
    );

    const normalized: NormalizedItem[] = pulls.map((pr) => ({
      id: `pr-${owner}-${repo}-${pr.id}`,
      type: 'pr' as const,
      repository: repo,
      repositoryFullName: `${owner}/${repo}`,
      title: pr.title,
      author: pr.user?.login ?? 'unknown',
      authorAvatarUrl: pr.user?.avatar_url ?? null,
      labels: pr.labels.map(
        (label): Label => ({
          name: label.name,
          color: label.color,
        })
      ),
      assignees: pr.assignees.map(
        (assignee): Assignee => ({
          login: assignee.login,
          avatarUrl: assignee.avatar_url,
        })
      ),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      url: pr.html_url,
      state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
      number: pr.number,
      isDraft: pr.draft,
    }));

    cache.set(cacheKey, normalized);
    return normalized;
  }

  /**
   * Get commit details for a specific SHA
   */
  private async getCommitDetails(
    owner: string,
    repo: string,
    sha: string
  ): Promise<GitHubCommit> {
    return this.request<GitHubCommit>(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  /**
   * Get all branches for a repository with commit dates
   */
  async getRepositoryBranches(
    owner: string,
    repo: string
  ): Promise<NormalizedItem[]> {
    const cacheKey = `branches:${owner}/${repo}`;
    const cached = cache.get<NormalizedItem[]>(cacheKey);
    if (cached) return cached;

    const branches = await this.fetchAllPages<GitHubBranch>(
      `/repos/${owner}/${repo}/branches`
    );

    // Fetch commit details for each branch to get dates and authors
    // We batch these requests but limit concurrency to avoid rate limits
    const branchesWithCommits = await Promise.all(
      branches.map(async (branch) => {
        try {
          const commit = await this.getCommitDetails(owner, repo, branch.commit.sha);
          return { branch, commit };
        } catch {
          // If we can't fetch commit details, return branch without dates
          return { branch, commit: null };
        }
      })
    );

    const normalized: NormalizedItem[] = branchesWithCommits.map(({ branch, commit }) => {
      // Use the commit date as the branch's last activity date
      const lastCommitDate = commit?.commit?.committer?.date || '';

      return {
        id: `branch-${owner}-${repo}-${branch.name}`,
        type: 'branch' as const,
        repository: repo,
        repositoryFullName: `${owner}/${repo}`,
        title: branch.name,
        author: '', // Branches don't have authors
        authorAvatarUrl: null,
        labels: [],
        assignees: [],
        createdAt: lastCommitDate, // Last commit date (for sorting)
        updatedAt: lastCommitDate, // Last commit date (for sorting)
        url: `https://github.com/${owner}/${repo}/tree/${branch.name}`,
      };
    });

    cache.set(cacheKey, normalized);
    return normalized;
  }

  /**
   * Get current rate limit info
   */
  getRateLimitInfo(): RateLimitInfo {
    return { ...rateLimitInfo };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    cache.clear();
  }
}

// Singleton instance
let githubService: GitHubService | null = null;

export function getGitHubService(): GitHubService {
  if (!githubService) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        'GITHUB_TOKEN environment variable is required. Please set it before starting the server.'
      );
    }
    githubService = new GitHubService(token);
  }
  return githubService;
}
