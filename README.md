# FITRA

FITRA is a full-stack personal finance tracker built for fast daily money logging and simple financial visibility.

The app lets a user:

- register and log in
- create accounts
- add income, expenses, and transfers
- manage categories and budgets
- track savings goals
- review recurring payments
- view dashboard metrics and reports
- export report data as CSV

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Recharts
- Backend: ASP.NET Core 8, Entity Framework Core
- Database: PostgreSQL 16
- Local infra: Podman

## Repository Structure

```text
.
├── backend/
│   ├── PersonalFinanceTracker.sln
│   └── src/
├── frontend/
├── infra/
│   └── podman/
├── docs/
├── PROJECT_ROADMAP.md
└── STATUS_SUMMARY.md
```

## Prerequisites

Install these before running the project:

1. Node.js 18.18+  
   Recommended: Node 18 or Node 20
2. npm 9+
3. .NET SDK 8
4. Podman
5. PostgreSQL client tools are optional, but useful for debugging

## Default Local Ports

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- PostgreSQL: `localhost:5432`
- Swagger UI: `http://localhost:8080/swagger`

## Local Configuration

The repository includes a root [`.env.example`](./.env.example) with the default local values used by the app and infrastructure.

Important defaults:

- database: `personal_finance_tracker`
- database user: `finance_user`
- database password: `finance_password`
- backend URL: `http://localhost:8080`
- frontend URL: `http://localhost:5173`

You can keep these defaults for local development.

## Step-By-Step Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Restore and build the backend

```bash
dotnet restore backend/PersonalFinanceTracker.sln
dotnet build backend/PersonalFinanceTracker.sln
```

### 4. Start PostgreSQL with Podman

If `podman compose` is available on your machine:

```bash
podman compose -f infra/podman/podman-compose.yml up -d
```

If `podman compose` is not available, use plain `podman run`:

```bash
podman run -d \
  --name pft-postgres \
  -e POSTGRES_DB=personal_finance_tracker \
  -e POSTGRES_USER=finance_user \
  -e POSTGRES_PASSWORD=finance_password \
  -p 5432:5432 \
  postgres:16-alpine
```

### 5. Run the backend API

From the repository root:

```bash
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS=http://localhost:8080 \
dotnet run --project backend/src/PersonalFinanceTracker.Api
```

What this does:

- runs the API in Development mode
- loads the local development settings
- connects to PostgreSQL on port `5432`
- serves the API on port `8080`

### 6. Run the frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Swagger / API Docs

Once the backend is running locally, Swagger UI is available at:

```text
http://localhost:8080/swagger
```

Use Swagger to:

- inspect available API endpoints
- test authenticated and unauthenticated routes
- verify request and response payloads
- debug backend behavior during local development

If the backend is not running, Swagger will not be available.

## First Run Notes

- The backend initializes the database on startup.
- New users get seeded default categories automatically after registration.
- The frontend points to `http://localhost:8080/api/v1` by default.

## Useful Commands

### Frontend

```bash
cd frontend
npm run dev
npm run build
npx tsc -b
```

### Backend

```bash
dotnet restore backend/PersonalFinanceTracker.sln
dotnet build backend/PersonalFinanceTracker.sln
dotnet run --project backend/src/PersonalFinanceTracker.Api
```

### Infrastructure

```bash
podman ps
podman logs pft-postgres
podman stop pft-postgres
podman start pft-postgres
```

## Main Features

- Authentication with register, login, refresh token, forgot password, and reset password
- Accounts with balances and transfers
- Categories with create, edit, archive, and seeded defaults
- Transactions with create, edit, delete, filters, search, and transfers
- Budgets with budget vs actual tracking
- Goals with contribution and withdrawal flows
- Recurring transaction management
- Dashboard summary widgets and charts
- Reports page with filters and CSV export

## API Overview

Base URL:

```text
http://localhost:8080/api/v1
```

Main route groups:

- `/auth`
- `/accounts`
- `/categories`
- `/transactions`
- `/budgets`
- `/goals`
- `/recurring`
- `/dashboard`
- `/reports`
- `/settings`

You can browse these routes interactively through Swagger instead of calling them manually.

## Troubleshooting

### Frontend fails to install or build

Check your Node version:

```bash
node -v
```

Use Node 18.18+.

### Backend says `DefaultConnection is missing`

Run the API with:

```bash
ASPNETCORE_ENVIRONMENT=Development
```

The project expects development settings for local startup.

### Frontend loads but pages are empty

Check:

1. PostgreSQL is running
2. Backend API is running on `http://localhost:8080`
3. You are logged in with a valid session

Health check:

```bash
curl http://localhost:8080/api/v1/health
```

Expected response:

```json
{"status":"ok","service":"Fitra API"}
```

### Reports page is blank

Make sure the backend has been rebuilt and restarted after pulling the latest code:

```bash
dotnet build backend/PersonalFinanceTracker.sln
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:8080 dotnet run --project backend/src/PersonalFinanceTracker.Api
```

## Documents

Supporting project notes are available in:

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/API_PLAN.md`](./docs/API_PLAN.md)
- [`docs/DATABASE_PLAN.md`](./docs/DATABASE_PLAN.md)
- [`docs/IMPLEMENTATION_BACKLOG.md`](./docs/IMPLEMENTATION_BACKLOG.md)
- [`PROJECT_ROADMAP.md`](./PROJECT_ROADMAP.md)
- [`STATUS_SUMMARY.md`](./STATUS_SUMMARY.md)

## Before Pushing To GitHub

Recommended final checks:

```bash
cd frontend && npm run build
cd ..
dotnet build backend/PersonalFinanceTracker.sln
```

Then commit and push:

```bash
git init
git add .
git commit -m "Initial project import"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
