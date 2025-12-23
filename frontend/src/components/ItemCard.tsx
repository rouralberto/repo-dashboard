import type { NormalizedItem } from '@repo-dashboard/shared';
import './ItemCard.css';

interface ItemCardProps {
  item: NormalizedItem;
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears}y ago`;
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffWeeks > 0) return `${diffWeeks}w ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

function ItemCard({ item }: ItemCardProps) {
  const handleClick = () => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="item-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="item-card-header">
        <span className="item-card-repo">{item.repository}</span>
        {item.number && (
          <span className="item-card-number">#{item.number}</span>
        )}
        {item.isDraft && (
          <span className="item-card-draft">Draft</span>
        )}
        {item.state === 'merged' && (
          <span className="item-card-merged">Merged</span>
        )}
      </div>

      <div className="item-card-title">{item.title}</div>

      {item.labels.length > 0 && (
        <div className="item-card-labels">
          {item.labels.slice(0, 4).map((label) => (
            <span
              key={label.name}
              className="item-card-label"
              style={{
                backgroundColor: `#${label.color}20`,
                borderColor: `#${label.color}`,
                color: `#${label.color}`,
              }}
            >
              {label.name}
            </span>
          ))}
          {item.labels.length > 4 && (
            <span className="item-card-label-more">
              +{item.labels.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="item-card-footer">
        {item.type !== 'branch' && (
          <div className="item-card-author">
            {item.authorAvatarUrl && (
              <img
                src={item.authorAvatarUrl}
                alt={item.author}
                className="item-card-avatar"
              />
            )}
            <span className="item-card-author-name">{item.author || 'Unknown'}</span>
          </div>
        )}

        {item.assignees.length > 0 && (
          <div className="item-card-assignees">
            <span className="item-card-assignee-label">→</span>
            <div className="item-card-assignee-avatars">
              {item.assignees.slice(0, 3).map((assignee) => (
                <img
                  key={assignee.login}
                  src={assignee.avatarUrl}
                  alt={assignee.login}
                  className="item-card-avatar"
                  title={assignee.login}
                />
              ))}
              {item.assignees.length > 3 && (
                <span className="item-card-assignee-more">
                  +{item.assignees.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {item.createdAt && (
          <span className="item-card-time" title={new Date(item.createdAt).toLocaleString()}>
            {formatRelativeTime(item.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

export default ItemCard;
