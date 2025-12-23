import { useState, useMemo } from 'react';
import type { Repository } from '@repo-dashboard/shared';
import './RepoSelector.css';

interface RepoSelectorProps {
  repositories: Repository[];
  onConfirm: (repos: Repository[]) => void;
  disabled?: boolean;
}

function RepoSelector({ repositories, onConfirm, disabled }: RepoSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRepos = useMemo(() => {
    if (!searchTerm.trim()) return repositories;
    const term = searchTerm.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.description?.toLowerCase().includes(term)
    );
  }, [repositories, searchTerm]);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredRepos.map((r) => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selected = repositories.filter((r) => selectedIds.has(r.id));
    onConfirm(selected);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="repo-selector-container">
      <div className="repo-selector-card">
        <div className="repo-selector-header">
          <h2 className="repo-selector-title">Select Repositories</h2>
          <p className="repo-selector-subtitle">
            Choose which repositories to include in your dashboard.
            Found {repositories.length} repositories.
          </p>
        </div>

        <div className="repo-selector-controls">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search repositories..."
            className="repo-selector-search"
            disabled={disabled}
          />
          <div className="repo-selector-actions">
            <button
              type="button"
              onClick={handleSelectAll}
              className="repo-selector-action"
              disabled={disabled}
            >
              Select All ({filteredRepos.length})
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="repo-selector-action"
              disabled={disabled}
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="repo-selector-list">
          {filteredRepos.length === 0 ? (
            <div className="repo-selector-empty">
              No repositories match your search.
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <label
                key={repo.id}
                className={`repo-selector-item ${selectedIds.has(repo.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(repo.id)}
                  onChange={() => handleToggle(repo.id)}
                  disabled={disabled}
                  className="repo-selector-checkbox"
                />
                <div className="repo-selector-info">
                  <div className="repo-selector-name">
                    {repo.name}
                    {repo.isPrivate && (
                      <span className="repo-selector-private">Private</span>
                    )}
                  </div>
                  {repo.description && (
                    <div className="repo-selector-description">
                      {repo.description}
                    </div>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <div className="repo-selector-footer">
          <span className="repo-selector-count">
            {selectedCount} {selectedCount === 1 ? 'repository' : 'repositories'} selected
          </span>
          <button
            type="button"
            onClick={handleConfirm}
            className="repo-selector-confirm"
            disabled={disabled || selectedCount === 0}
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default RepoSelector;
