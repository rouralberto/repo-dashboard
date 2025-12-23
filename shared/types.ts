/**
 * Shared types between frontend and backend
 */

// GitHub Repository
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
}

// Normalized item types
export type ItemType = 'issue' | 'pr' | 'branch';

// Base normalized item
export interface NormalizedItem {
  id: string;
  type: ItemType;
  repository: string;
  repositoryFullName: string;
  title: string;
  author: string;
  authorAvatarUrl: string | null;
  labels: Label[];
  assignees: Assignee[];
  createdAt: string;
  updatedAt: string;
  url: string;
  state?: 'open' | 'closed' | 'merged';
  number?: number;
  isDraft?: boolean;
}

export interface Label {
  name: string;
  color: string;
}

export interface Assignee {
  login: string;
  avatarUrl: string;
}

// API Response types
export interface RepositoriesResponse {
  repositories: Repository[];
}

export interface ItemsResponse {
  items: NormalizedItem[];
}

// Sorting options
export type SortField = 'repository' | 'createdAt' | 'updatedAt' | 'labels' | 'assignee';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

// Filter options
export interface FilterOptions {
  repositories: string[];
  labels: string[];
  assignees: string[];
}

// API Error response
export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}
