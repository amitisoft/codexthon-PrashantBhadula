import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layouts/AppShell";
import { RequireAuth } from "@/app/router/RequireAuth";
import { AccountsPage } from "@/features/accounts/AccountsPage";
import { AuthPage } from "@/features/auth/AuthPage";
import { BudgetsPage } from "@/features/budgets/BudgetsPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { RecurringPage } from "@/features/recurring/RecurringPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { RulesPage } from "@/features/rules/RulesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/auth/*" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="recurring" element={<RecurringPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
