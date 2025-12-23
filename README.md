# Repo Dashboard

A local-first, read-only GitHub visibility dashboard for engineering teams. View issues, pull requests, and branches across multiple repositories in a single-screen, multi-column layout.

## Features

- **Organization-wide visibility**: Enter a GitHub organization name and select repositories to monitor
- **Multi-column dashboard**: View issues, pull requests, and branches side-by-side
- **Sorting & filtering**: Each column can be independently sorted and filtered by:
  - Repository
  - Date (created/updated)
  - Labels
  - Assignees
- **Quick navigation**: Click any item to open it on GitHub in a new tab
- **In-memory caching**: 5-minute TTL cache to reduce API calls and avoid rate limits

## Prerequisites

- Node.js 22.x or higher
- A GitHub Personal Access Token

## Required GitHub Token Scopes

Your GitHub token needs the following scopes:

| Scope | Required For |
|-------|-------------|
| `repo` | Full access to private repositories (issues, PRs, branches) |
| `public_repo` | Access to public repositories only (if you don't need private repo access) |

To create a token:
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the required scopes
4. Copy the generated token

## Installation

```bash
# Clone or navigate to the repo-dashboard directory
cd repo-dashboard

# Install all dependencies
npm install
```

## Running Locally

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Start the backend (runs on port 3001)
npm run backend:dev

# In a separate terminal, start the frontend (runs on port 5173)
npm run frontend:dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token |
| `PORT` | No | Backend server port (default: 3001) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with rate limit info |
| `/api/orgs/:org/repos` | GET | List all repositories for an organization |
| `/api/repos/:owner/:repo/issues` | GET | Get issues for a repository |
| `/api/repos/:owner/:repo/pulls` | GET | Get pull requests for a repository |
| `/api/repos/:owner/:repo/branches` | GET | Get branches for a repository |
| `/api/cache/clear` | POST | Clear the in-memory cache |

## Project Structure

```
repo-dashboard/
├── package.json              # Root workspace config
├── shared/                   # Shared types between frontend/backend
│   └── types.ts
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Express server entry
│       ├── routes/
│       │   └── github.ts     # API routes
│       └── services/
│           └── github.ts     # GitHub API client with caching
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        │   ├── OrgInput.tsx
        │   ├── RepoSelector.tsx
        │   ├── Dashboard.tsx
        │   ├── Column.tsx
        │   └── ItemCard.tsx
        └── styles/
            └── *.css
```

## Limitations

- **Read-only**: This dashboard only reads data from GitHub; it cannot create, update, or delete anything
- **No persistence**: Data is fetched fresh on each session; there's no database or local storage
- **No background sync**: Data is only refreshed when you click "Refresh Data"
- **Rate limits**: GitHub API has rate limits (5,000 requests/hour for authenticated users). The app caches responses for 5 minutes to help mitigate this
- **Large organizations**: For organizations with many repositories, initial load may take some time due to pagination

## Tech Stack

- **Backend**: Node.js, Express 5, TypeScript
- **Frontend**: React 19, Vite, TypeScript
- **Styling**: CSS with CSS Variables (no framework)
- **API**: GitHub REST API v3

## License

Unlicensed - Internal use only
