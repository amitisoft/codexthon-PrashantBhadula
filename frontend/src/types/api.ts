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

export type UserSettings = {
  currencyCode: string;
  locale: string;
  timeZone: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  institutionName: string | null;
  createdAtUtc: string;
  isShared: boolean;
  isOwner: boolean;
  accessRole: "owner" | "editor" | "viewer";
  members: Array<{
    userId: string;
    displayName: string;
    email: string;
    role: "owner" | "editor" | "viewer";
    isOwner: boolean;
    addedAtUtc: string;
  }>;
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
  appliedRuleNames: string[];
  needsReview: boolean;
  createdByDisplayName: string | null;
  createdAtUtc: string;
};

export type Rule = {
  id: string;
  name: string;
  isEnabled: boolean;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  actions: Array<{
    type: string;
    value: string | null;
  }>;
  createdAtUtc: string;
  updatedAtUtc: string;
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
  icon: string | null;
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

export type ForecastSummary = {
  asOfDate: string;
  throughDate: string;
  overview: {
    currentBalance: number;
    projectedEndBalance: number;
    safeToSpend: number;
    protectedBuffer: number;
    expectedRecurringIncome: number;
    expectedRecurringExpense: number;
    expectedPatternExpense: number;
    averageDailyExpense: number;
    confidence: string;
  };
  dailyProjection: Array<{
    date: string;
    projectedBalance: number;
    scheduledIncome: number;
    scheduledExpense: number;
    patternExpense: number;
  }>;
  upcomingItems: Array<{
    recurringTransactionId: string | null;
    title: string;
    type: string;
    amount: number;
    runDate: string;
    source: string;
    accountName: string | null;
    categoryName: string | null;
  }>;
  patternCategories: Array<{
    categoryName: string;
    projectedAmount: number;
  }>;
  assumptions: string[];
  warnings: Array<{
    severity: string;
    message: string;
  }>;
};

export type HealthScoreSummary = {
  isAvailable: boolean;
  unavailableReason: string | null;
  score: number;
  band: string;
  summary: string;
  factors: Array<{
    key: string;
    label: string;
    score: number;
    valueLabel: string;
    insight: string;
  }>;
  suggestions: string[];
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
  savingsRateTrend: Array<{
    periodLabel: string;
    savingsRatePercent: number;
  }>;
  netWorthTrend: Array<{
    periodLabel: string;
    netWorth: number;
  }>;
  accountBalanceTrend: Array<{
    accountId: string;
    accountName: string;
    points: Array<{
      periodLabel: string;
      balance: number;
    }>;
  }>;
  monthComparison: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    currentIncome: number;
    previousIncome: number;
    currentExpense: number;
    previousExpense: number;
    currentSavingsRate: number;
    previousSavingsRate: number;
    categoryChanges: Array<{
      categoryName: string;
      currentAmount: number;
      previousAmount: number;
      changeAmount: number;
      changePercent: number;
      direction: string;
    }>;
  };
  insights: Array<{
    title: string;
    tone: string;
    body: string;
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

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAtUtc: string;
};
