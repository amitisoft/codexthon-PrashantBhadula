# Architecture Notes

## Frontend

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui-style component layer
- TanStack Query for server state
- Zustand for small shared UI state
- React Hook Form + Zod for forms
- Recharts for reporting and dashboard charts

## Backend

- ASP.NET Core 8 Web API
- clean architecture split into API, Application, Domain, Infrastructure
- PostgreSQL via EF Core
- Swagger for API docs
- Hangfire planned for recurring jobs
- Resend for password reset email delivery

## Multi-user Readiness

- every financial entity is scoped by `UserId`
- user settings store locale and currency, defaulting to `en-IN` and `INR`
- no shared household permissions in V1, but the model is designed so that future tenant or sharing layers can be added cleanly

## Acceptance Criteria Coverage

The implementation plan is explicitly aligned to the spec:

- Dashboard: summary cards, recent transactions, category spending chart
- Transactions: add, edit, delete, filter, balance updates
- Budgets: monthly budgets, progress, over-budget state
- Goals: create, contribute, track progress
- Reports: date filters, charts, filtered exports
