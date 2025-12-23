import { useMemo, useState, ReactNode } from 'react';
import type { NormalizedItem, SortField } from '@repo-dashboard/shared';
import type { ColumnConfig } from './Dashboard';
import ItemCard from './ItemCard';
import './Column.css';

interface ColumnProps {
  title: string;
  icon: ReactNode;
  items: NormalizedItem[];
  config: ColumnConfig;
  onConfigChange: (config: ColumnConfig) => void;
  filterOptions: {
    repos: string[];
    labels: string[];
    assignees: string[];
  };
  emptyMessage: string;
  hideDateFilters?: boolean;
}

function Column({
  title,
  icon,
  items,
  config,
  onConfigChange,
  filterOptions,
  emptyMessage,
  hideDateFilters,
}: ColumnProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Repository filter
      if (config.filterRepos.length > 0 && !config.filterRepos.includes(item.repository)) {
        return false;
      }
      // Label filter
      if (config.filterLabels.length > 0) {
        const itemLabels = item.labels.map((l) => l.name);
        if (!config.filterLabels.some((label) => itemLabels.includes(label))) {
          return false;
        }
      }
      // Assignee filter
      if (config.filterAssignees.length > 0) {
        const itemAssignees = item.assignees.map((a) => a.login);
        if (!config.filterAssignees.some((assignee) => itemAssignees.includes(assignee))) {
          return false;
        }
      }
      return true;
    });
  }, [items, config.filterRepos, config.filterLabels, config.filterAssignees]);

  // Apply sorting
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    const { sortField, sortDirection } = config;
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    // Helper to safely parse dates, returning 0 for invalid/empty dates
    const getDateValue = (dateStr: string): number => {
      if (!dateStr) return 0;
      const time = new Date(dateStr).getTime();
      return isNaN(time) ? 0 : time;
    };

    sorted.sort((a, b) => {
      switch (sortField) {
        case 'repository':
          return multiplier * a.repository.localeCompare(b.repository);
        case 'createdAt': {
          const aTime = getDateValue(a.createdAt);
          const bTime = getDateValue(b.createdAt);
          // Items without dates go to the end
          if (aTime === 0 && bTime === 0) return 0;
          if (aTime === 0) return 1;
          if (bTime === 0) return -1;
          return multiplier * (aTime - bTime);
        }
        case 'updatedAt': {
          const aTime = getDateValue(a.updatedAt);
          const bTime = getDateValue(b.updatedAt);
          // Items without dates go to the end
          if (aTime === 0 && bTime === 0) return 0;
          if (aTime === 0) return 1;
          if (bTime === 0) return -1;
          return multiplier * (aTime - bTime);
        }
        case 'labels': {
          const aLabel = a.labels[0]?.name || '';
          const bLabel = b.labels[0]?.name || '';
          return multiplier * aLabel.localeCompare(bLabel);
        }
        case 'assignee': {
          const aAssignee = a.assignees[0]?.login || '';
          const bAssignee = b.assignees[0]?.login || '';
          return multiplier * aAssignee.localeCompare(bAssignee);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredItems, config.sortField, config.sortDirection]);

  const handleSortChange = (field: SortField) => {
    if (config.sortField === field) {
      onConfigChange({
        ...config,
        sortDirection: config.sortDirection === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onConfigChange({
        ...config,
        sortField: field,
        sortDirection: 'desc',
      });
    }
  };

  const handleFilterChange = (
    type: 'repos' | 'labels' | 'assignees',
    value: string
  ) => {
    const key = `filter${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ColumnConfig;
    const current = config[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onConfigChange({ ...config, [key]: updated });
  };

  const clearFilters = () => {
    onConfigChange({
      ...config,
      filterRepos: [],
      filterLabels: [],
      filterAssignees: [],
    });
  };

  const hasActiveFilters =
    config.filterRepos.length > 0 ||
    config.filterLabels.length > 0 ||
    config.filterAssignees.length > 0;

  const sortOptions: { field: SortField; label: string }[] = hideDateFilters
    ? [
        { field: 'repository', label: 'Repository' },
        { field: 'labels', label: 'Labels' },
        { field: 'assignee', label: 'Assignee' },
      ]
    : [
        { field: 'repository', label: 'Repository' },
        { field: 'createdAt', label: 'Created' },
        { field: 'updatedAt', label: 'Updated' },
        { field: 'labels', label: 'Labels' },
        { field: 'assignee', label: 'Assignee' },
      ];

  // Get the current sort label
  const currentSortLabel = sortOptions.find(option => option.field === config.sortField)?.label || 'Unknown';
  const sortDirectionSymbol = config.sortDirection === 'asc' ? '↑' : '↓';

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{icon}</span>
          <span>{title}</span>
          <span className="column-count">{sortedItems.length}</span>
        </div>
        <div className="column-sort-info">
          <span className="sort-field">{currentSortLabel}</span>
          <span className="sort-direction">{sortDirectionSymbol}</span>
        </div>
        <button
          className={`column-filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </button>
      </div>

      {showFilters && (
        <div className="column-filters">
          <div className="filter-section">
            <div className="filter-label">Sort by</div>
            <div className="filter-buttons">
              {sortOptions.map((opt) => (
                <button
                  key={opt.field}
                  className={`filter-button ${config.sortField === opt.field ? 'active' : ''}`}
                  onClick={() => handleSortChange(opt.field)}
                >
                  {opt.label}
                  {config.sortField === opt.field && (
                    <span className="sort-indicator">
                      {config.sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-label">Filter by Repository</div>
            <div className="filter-chips">
              {filterOptions.repos.map((repo) => (
                <button
                  key={repo}
                  className={`filter-chip ${config.filterRepos.includes(repo) ? 'active' : ''}`}
                  onClick={() => handleFilterChange('repos', repo)}
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>

          {filterOptions.labels.length > 0 && (
            <div className="filter-section">
              <div className="filter-label">Filter by Label</div>
              <div className="filter-chips">
                {filterOptions.labels.map((label) => (
                  <button
                    key={label}
                    className={`filter-chip ${config.filterLabels.includes(label) ? 'active' : ''}`}
                    onClick={() => handleFilterChange('labels', label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.assignees.length > 0 && (
            <div className="filter-section">
              <div className="filter-label">Filter by Assignee</div>
              <div className="filter-chips">
                {filterOptions.assignees.map((assignee) => (
                  <button
                    key={assignee}
                    className={`filter-chip ${config.filterAssignees.includes(assignee) ? 'active' : ''}`}
                    onClick={() => handleFilterChange('assignees', assignee)}
                  >
                    {assignee}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button className="filter-clear" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div className="column-content">
        {sortedItems.length === 0 ? (
          <div className="column-empty">{emptyMessage}</div>
        ) : (
          sortedItems.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export default Column;
