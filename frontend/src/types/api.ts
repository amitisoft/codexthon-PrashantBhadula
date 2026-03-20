export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  currencyCode: string;
  locale: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: AuthUser;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  institutionName: string | null;
  createdAtUtc: string;
};

export type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
};

export type Transaction = {
  id: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: string;
  amount: number;
  transactionDate: string;
  merchant: string | null;
  note: string | null;
  paymentMethod: string | null;
  tags: string[];
  createdAtUtc: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  categoryName: string;
  month: number;
  year: number;
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  status: string;
  alertThresholdPercent: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercent: number;
  targetDate: string | null;
  status: string;
  linkedAccountId: string | null;
  color: string | null;
};

export type RecurringTransaction = {
  id: string;
  title: string;
  type: string;
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  frequency: string;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  autoCreateTransaction: boolean;
  isPaused: boolean;
};

export type DashboardSummary = {
  metrics: {
    currentMonthIncome: number;
    currentMonthExpense: number;
    netBalance: number;
    accountCount: number;
    transactionCount: number;
    activeBudgetCount: number;
    activeGoalCount: number;
  };
  categorySpend: Array<{ categoryName: string; amount: number }>;
  trend: Array<{ monthLabel: string; income: number; expense: number }>;
  recentTransactions: Array<{
    id: string;
    merchant: string;
    type: string;
    amount: number;
    transactionDate: string;
    accountName: string | null;
    categoryName: string | null;
  }>;
  budgetProgress: Array<{
    budgetId: string;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    progressPercent: number;
    status: string;
  }>;
  goals: Array<{
    goalId: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    progressPercent: number;
    targetDate: string | null;
    status: string;
  }>;
  upcomingRecurring: Array<{
    id: string;
    title: string;
    amount: number;
    nextRunDate: string;
    frequency: string;
    accountName: string | null;
    categoryName: string | null;
  }>;
};

export type ReportsSummary = {
  totals: {
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
  };
  categorySpend: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
  }>;
  trend: Array<{
    periodLabel: string;
    income: number;
    expense: number;
  }>;
  accountBalances: Array<{
    accountId: string;
    accountName: string;
    currentBalance: number;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    transactionDate: string;
    merchant: string;
    note: string | null;
    accountName: string;
    categoryName: string | null;
  }>;
};
