import { useMemo, useState, useEffect } from 'react';
import type { NormalizedItem, SortField, SortDirection } from '@repo-dashboard/shared';
import Column from './Column';
import './Dashboard.css';

interface DashboardProps {
  issues: NormalizedItem[];
  pulls: NormalizedItem[];
  branches: NormalizedItem[];
}

export interface ColumnConfig {
  sortField: SortField;
  sortDirection: SortDirection;
  filterRepos: string[];
  filterLabels: string[];
  filterAssignees: string[];
}

const STORAGE_KEYS = {
  ISSUES_CONFIG: 'repo-dashboard:issuesConfig',
  PULLS_CONFIG: 'repo-dashboard:pullsConfig',
  BRANCHES_CONFIG: 'repo-dashboard:branchesConfig',
} as const;

const defaultIssuesConfig: ColumnConfig = {
  sortField: 'createdAt',
  sortDirection: 'desc',
  filterRepos: [],
  filterLabels: [],
  filterAssignees: [],
};

const defaultPullsConfig: ColumnConfig = {
  sortField: 'createdAt',
  sortDirection: 'desc',
  filterRepos: [],
  filterLabels: [],
  filterAssignees: [],
};

const defaultBranchesConfig: ColumnConfig = {
  sortField: 'updatedAt',
  sortDirection: 'desc',
  filterRepos: [],
  filterLabels: [],
  filterAssignees: [],
};

function loadConfig(key: string, defaultValue: ColumnConfig): ColumnConfig {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as ColumnConfig;
    }
  } catch {
    // Ignore parse errors
  }
  return defaultValue;
}

function saveConfig(key: string, config: ColumnConfig): void {
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

function Dashboard({ issues, pulls, branches }: DashboardProps) {
  const [issuesConfig, setIssuesConfig] = useState<ColumnConfig>(() =>
    loadConfig(STORAGE_KEYS.ISSUES_CONFIG, defaultIssuesConfig)
  );
  const [pullsConfig, setPullsConfig] = useState<ColumnConfig>(() =>
    loadConfig(STORAGE_KEYS.PULLS_CONFIG, defaultPullsConfig)
  );
  const [branchesConfig, setBranchesConfig] = useState<ColumnConfig>(() =>
    loadConfig(STORAGE_KEYS.BRANCHES_CONFIG, defaultBranchesConfig)
  );

  // Persist config changes
  useEffect(() => {
    saveConfig(STORAGE_KEYS.ISSUES_CONFIG, issuesConfig);
  }, [issuesConfig]);

  useEffect(() => {
    saveConfig(STORAGE_KEYS.PULLS_CONFIG, pullsConfig);
  }, [pullsConfig]);

  useEffect(() => {
    saveConfig(STORAGE_KEYS.BRANCHES_CONFIG, branchesConfig);
  }, [branchesConfig]);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const allItems = [...issues, ...pulls, ...branches];
    const repos = [...new Set(allItems.map((item) => item.repository))].sort();
    const labels = [...new Set(allItems.flatMap((item) => item.labels.map((l) => l.name)))].sort();
    const assignees = [...new Set(allItems.flatMap((item) => item.assignees.map((a) => a.login)))].sort();
    return { repos, labels, assignees };
  }, [issues, pulls, branches]);

  // Filter only open issues
  const openIssues = useMemo(() => {
    return issues.filter((issue) => issue.state === 'open');
  }, [issues]);

  // Filter only open PRs
  const openPulls = useMemo(() => {
    return pulls.filter((pr) => pr.state === 'open');
  }, [pulls]);

  return (
    <div className="dashboard">
      <div className="dashboard-columns">
        <Column
          title="Issues"
          icon={
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
            </svg>
          }
          items={openIssues}
          config={issuesConfig}
          onConfigChange={setIssuesConfig}
          filterOptions={filterOptions}
          emptyMessage="No open issues found"
        />
        <Column
          title="Pull Requests"
          icon={
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
            </svg>
          }
          items={openPulls}
          config={pullsConfig}
          onConfigChange={setPullsConfig}
          filterOptions={filterOptions}
          emptyMessage="No open pull requests found"
        />
        <Column
          title="Branches"
          icon={
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
            </svg>
          }
          items={branches}
          config={branchesConfig}
          onConfigChange={setBranchesConfig}
          filterOptions={filterOptions}
          emptyMessage="No branches found"
        />
      </div>
    </div>
  );
}

export default Dashboard;
