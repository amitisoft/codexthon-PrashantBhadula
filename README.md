# FITRA

Fitra is a full-stack personal finance application built to help users manage accounts, transactions, budgets, goals, recurring payments, forecasting, reporting, automation rules, and shared accounts in one place.

## Core Features

- Authentication with register, login, refresh token, forgot password, and reset password
- Accounts with balances, transfers, and shared access
- Transactions with filters, search, suggestions, edit, and delete
- Budgets with budget-vs-actual tracking and duplicate-last-month support
- Savings goals with progress tracking and goal icons
- Recurring payments with pause, update, delete, and auto-generation
- Dashboard with cash flow forecasting, health score, planning tools, and insights
- Reports with CSV and PDF export
- Rules engine for transaction automation
- Notifications, activity signals, and demo data support

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Recharts
- Backend: ASP.NET Core 8, Entity Framework Core
- Database: PostgreSQL 16
- Local infra: Podman

## Prerequisites

Install these before running the app:

1. Node.js 18+
2. npm
3. .NET SDK 8
4. Podman

## Run The Database

Start PostgreSQL with Podman:

```bash
podman compose -f infra/podman/podman-compose.yml up -d
```

This creates a local PostgreSQL container using the default development values from the compose file:

- database: `personal_finance_tracker`
- user: `finance_user`
- password: `finance_password`

## Run The Backend

Use the provided script from the project root:

```bash
./scripts/dev-backend.sh
```

If your local `dotnet` binary is in a different location, set `DOTNET_BIN` first:

```bash
DOTNET_BIN=/path/to/dotnet ./scripts/dev-backend.sh
```

What this script does:

- runs the API in `Development`
- starts the backend on port `8080`
- applies the frontend origin for local CORS
- initializes the database schema on startup

## Run The Frontend

Open a second terminal and run:

```bash
./scripts/dev-frontend.sh
```

If your local Node installation is in a different location, set `NODE_BIN_DIR` first:

```bash
NODE_BIN_DIR=/path/to/node/bin ./scripts/dev-frontend.sh
```

What this script does:

- starts the Vite frontend
- points the frontend to the backend API
- serves the app on the default frontend port

## Recommended Local Startup Order

1. Start the database
2. Start the backend
3. Start the frontend

## Optional Environment Overrides

You can override local startup values when needed.

### Backend

```bash
API_URL=http://127.0.0.1:8080 APP_FRONTEND_BASE_URL=http://127.0.0.1:4173 ./scripts/dev-backend.sh
```

### Frontend

```bash
FRONTEND_PORT=4173 VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1 ./scripts/dev-frontend.sh
```

## Helpful Notes

- The backend creates and updates required operational tables during startup.
- Demo and seeded development data may be added automatically for local testing.
- Shared accounts, rules, forecasting, reports, and health score all depend on the backend being up.
- If login or data loading fails, first confirm the database and backend are running.

## Project Structure

```text
.
├── backend/
├── frontend/
├── infra/
│   └── podman/
├── scripts/
└── docs/
```
