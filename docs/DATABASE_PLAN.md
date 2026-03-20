# Database Plan

## Main Tables

- `users`
- `user_settings`
- `accounts`
- `categories`
- `transactions`
- `budgets`
- `goals`
- `recurring_transactions`
- `refresh_tokens`
- `password_reset_tokens`

## Important constraints

- all data rows are owned by a user
- one budget per user + category + month + year
- transaction amounts are positive and type defines debit/credit behavior
- transfer flows must update two account balances atomically
- recurring runs must be idempotent

## Important additions beyond the source doc

- `user_settings` to support editable `INR` / `en-IN`
- `refresh_tokens` for secure auth lifecycle
- `password_reset_tokens` for full reset flow with Resend
