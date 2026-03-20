# API Plan

## Base

- base path: `/api/v1`
- auth docs via Swagger UI in development

## Planned endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Dashboard

- `GET /api/v1/dashboard/summary`

### Transactions

- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `GET /api/v1/transactions/{id}`
- `PUT /api/v1/transactions/{id}`
- `DELETE /api/v1/transactions/{id}`

### Categories

- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PUT /api/v1/categories/{id}`
- `DELETE /api/v1/categories/{id}`

### Accounts

- `GET /api/v1/accounts`
- `POST /api/v1/accounts`
- `PUT /api/v1/accounts/{id}`
- `POST /api/v1/accounts/transfer`

### Budgets

- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `PUT /api/v1/budgets/{id}`
- `DELETE /api/v1/budgets/{id}`

### Goals

- `GET /api/v1/goals`
- `POST /api/v1/goals`
- `PUT /api/v1/goals/{id}`
- `POST /api/v1/goals/{id}/contribute`
- `POST /api/v1/goals/{id}/withdraw`

### Reports

- `GET /api/v1/reports/category-spend`
- `GET /api/v1/reports/income-vs-expense`
- `GET /api/v1/reports/account-balance-trend`
- `POST /api/v1/export/csv`

### Recurring

- `GET /api/v1/recurring`
- `POST /api/v1/recurring`
- `PUT /api/v1/recurring/{id}`
- `DELETE /api/v1/recurring/{id}`
