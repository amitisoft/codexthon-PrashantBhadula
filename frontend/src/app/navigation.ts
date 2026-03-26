import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CreditCard,
  FolderKanban,
  FolderTree,
  Goal,
  Home,
  LayoutDashboard,
  PieChart,
  RefreshCcw,
  Sparkles,
  Settings,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

export const appNavItems: AppNavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview and quick actions",
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: ArrowRightLeft,
    description: "Income, expenses, and transfers",
  },
  {
    label: "Budgets",
    path: "/budgets",
    icon: PieChart,
    description: "Monthly category budgets",
  },
  {
    label: "Categories",
    path: "/categories",
    icon: FolderTree,
    description: "Income and expense labels",
  },
  {
    label: "Goals",
    path: "/goals",
    icon: Goal,
    description: "Savings targets and progress",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: FolderKanban,
    description: "Insights and exports",
  },
  {
    label: "Rules",
    path: "/rules",
    icon: Sparkles,
    description: "Automation and categorization rules",
  },
  {
    label: "Recurring",
    path: "/recurring",
    icon: RefreshCcw,
    description: "Subscriptions and salary rules",
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: CreditCard,
    description: "Wallets, banks, and cards",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Currency, locale, and profile",
  },
  {
    label: "Onboarding",
    path: "/onboarding",
    icon: Home,
    description: "First-time setup flow",
  },
];
