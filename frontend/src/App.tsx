import { useState, useEffect, useCallback } from 'react';
import type { Repository, NormalizedItem } from '@repo-dashboard/shared';
import OrgInput from './components/OrgInput';
import RepoSelector from './components/RepoSelector';
import Dashboard from './components/Dashboard';
import './styles/App.css';

type AppState = 'org-input' | 'repo-select' | 'dashboard';

// LocalStorage keys
const STORAGE_KEYS = {
  APP_STATE: 'repo-dashboard:appState',
  ORGANIZATION: 'repo-dashboard:organization',
  REPOSITORIES: 'repo-dashboard:repositories',
  SELECTED_REPOS: 'repo-dashboard:selectedRepos',
  DASHBOARD_DATA: 'repo-dashboard:dashboardData',
} as const;

// Helper functions for localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch {
    // Ignore parse errors
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

function clearStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

function App() {
  // Initialize state from localStorage
  const [state, setState] = useState<AppState>(() =>
    loadFromStorage(STORAGE_KEYS.APP_STATE, 'org-input')
  );
  const [organization, setOrganization] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.ORGANIZATION, '')
  );
  const [repositories, setRepositories] = useState<Repository[]>(() =>
    loadFromStorage(STORAGE_KEYS.REPOSITORIES, [])
  );
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_REPOS, [])
  );
  const [dashboardData, setDashboardData] = useState<{
    issues: NormalizedItem[];
    pulls: NormalizedItem[];
    branches: NormalizedItem[];
  }>(() => loadFromStorage(STORAGE_KEYS.DASHBOARD_DATA, { issues: [], pulls: [], branches: [] }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist state changes to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.APP_STATE, state);
  }, [state]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORGANIZATION, organization);
  }, [organization]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REPOSITORIES, repositories);
  }, [repositories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_REPOS, selectedRepos);
  }, [selectedRepos]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DASHBOARD_DATA, dashboardData);
  }, [dashboardData]);

  const handleOrgSubmit = async (org: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orgs/${encodeURIComponent(org)}/repos`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch repositories');
      }

      const data = await response.json();
      setOrganization(org);
      setRepositories(data.repositories);
      setState('repo-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async (repos: Repository[]) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for selected repos
      const [issuesResults, pullsResults, branchesResults] = await Promise.all([
        Promise.all(
          repos.map(async (repo) => {
            const response = await fetch(
              `/api/repos/${encodeURIComponent(repo.fullName.split('/')[0])}/${encodeURIComponent(repo.name)}/issues`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.items;
          })
        ),
        Promise.all(
          repos.map(async (repo) => {
            const response = await fetch(
              `/api/repos/${encodeURIComponent(repo.fullName.split('/')[0])}/${encodeURIComponent(repo.name)}/pulls`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.items;
          })
        ),
        Promise.all(
          repos.map(async (repo) => {
            const response = await fetch(
              `/api/repos/${encodeURIComponent(repo.fullName.split('/')[0])}/${encodeURIComponent(repo.name)}/branches`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.items;
          })
        ),
      ]);

      setDashboardData({
        issues: issuesResults.flat(),
        pulls: pullsResults.flat(),
        branches: branchesResults.flat(),
      });

      setState('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRepoSelection = async (repos: Repository[]) => {
    setSelectedRepos(repos);
    await fetchDashboardData(repos);
  };

  const handleBackToOrg = () => {
    clearStorage();
    setState('org-input');
    setOrganization('');
    setRepositories([]);
    setSelectedRepos([]);
    setDashboardData({ issues: [], pulls: [], branches: [] });
    setError(null);
  };

  const handleBackToRepos = () => {
    setState('repo-select');
    setDashboardData({ issues: [], pulls: [], branches: [] });
    setError(null);
  };

  const handleRefresh = () => {
    if (selectedRepos.length > 0) {
      fetchDashboardData(selectedRepos);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <svg className="app-logo" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Repo Dashboard
          </h1>
          {organization && (
            <span className="org-badge">{organization}</span>
          )}
        </div>
        {state !== 'org-input' && (
          <nav className="header-nav">
            <button className="nav-button" onClick={handleBackToOrg}>
              Change Organization
            </button>
            {state === 'dashboard' && (
              <>
                <button className="nav-button" onClick={handleBackToRepos}>
                  Change Repositories
                </button>
                <button className="nav-button nav-button-primary" onClick={handleRefresh}>
                  Refresh Data
                </button>
              </>
            )}
          </nav>
        )}
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        )}

        {state === 'org-input' && (
          <OrgInput onSubmit={handleOrgSubmit} disabled={loading} />
        )}

        {state === 'repo-select' && (
          <RepoSelector
            repositories={repositories}
            onConfirm={handleRepoSelection}
            disabled={loading}
          />
        )}

        {state === 'dashboard' && (
          <Dashboard
            issues={dashboardData.issues}
            pulls={dashboardData.pulls}
            branches={dashboardData.branches}
          />
        )}
      </main>
    </div>
  );
}

export default App;
