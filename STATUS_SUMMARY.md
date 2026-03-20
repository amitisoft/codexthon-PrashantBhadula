# Fitra Status Summary

## Project

- App name: `Fitra`
- Motto: `Modern way to manage money`
- Stack: React + TypeScript + Vite + Tailwind + .NET 8 + PostgreSQL + Podman

## What Was Done

- Extracted the original `.docx` requirement and created the roadmap
- Scaffolded the repo from scratch with `frontend/`, `backend/`, `infra/`, and `docs/`
- Set up React app structure, .NET clean architecture structure, Swagger, environment files, and Podman/PostgreSQL local setup
- Fixed local runtime/tooling issues for `.NET`, `npm`, and Podman startup
- Reworked branding from generic finance wording to `Fitra`

## Implemented Features

- Authentication:
  - register
  - login
  - refresh token flow
  - forgot password
  - reset password
  - current user endpoint
- Accounts:
  - create account
  - list accounts
  - transfer between accounts
- Categories:
  - default categories seeded per user
  - category listing
  - create/edit/archive custom categories
- Transactions:
  - create income/expense/transfer transactions
  - edit transactions
  - delete transactions
  - filter/search transactions
  - account balance updates after transactions
- Settings:
  - get/update user currency, locale, timezone
- Budgets:
  - create monthly budgets
  - compare budget vs actual spend
- Goals:
  - create goals
  - contribute to goals
  - withdraw from goals
- Recurring:
  - create recurring items
  - list upcoming recurring items
- Reports:
  - filtered summary metrics
  - category spend breakdown
  - income vs expense trend
  - account balance snapshot
  - CSV export
- Dashboard:
  - current month income/expense
  - net balance
  - spending by category
  - budget progress
  - goal summary
  - upcoming recurring bills
  - simple income vs expense trend
  - recent transactions

## Frontend Pages Wired To Live API

- Auth
- Accounts
- Categories
- Transactions
- Budgets
- Goals
- Recurring
- Dashboard
- Reports

## Important Fixes

- Enabled CORS so frontend auth works from browser
- Fixed backend package/version issues
- Added database initialization on startup
- Verified frontend TypeScript build after CRUD/report wiring
- Replaced placeholder reports UI with live filters, charts, and CSV export
- Added full transaction CRUD flow with filters/search and transfer support
- Added categories CRUD UI and API
- Added goals withdraw flow
- Added account-to-account transfer flow

## Current Goal Coverage

The app now supports the main success criteria:

- create account and log in
- add transaction quickly
- view current month spending by category
- compare budget vs actual spending
- identify recurring payments and upcoming bills
- view simple trend charts over time

## Remaining Major Work

- recurring auto-create scheduler
- recurring edit/delete/pause support in UI
- backend verification in an environment where `dotnet` is available on `PATH`
- end-to-end/manual QA across browser + API
- deployment hardening, test coverage, and production readiness polish
