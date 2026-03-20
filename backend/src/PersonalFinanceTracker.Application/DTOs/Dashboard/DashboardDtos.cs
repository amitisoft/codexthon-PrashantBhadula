namespace PersonalFinanceTracker.Application.DTOs.Dashboard;

public sealed record DashboardMetricDto(
    decimal CurrentMonthIncome,
    decimal CurrentMonthExpense,
    decimal NetBalance,
    int AccountCount,
    int TransactionCount,
    int ActiveBudgetCount,
    int ActiveGoalCount);

public sealed record DashboardCategorySpendDto(string CategoryName, decimal Amount);

public sealed record DashboardTrendPointDto(string MonthLabel, decimal Income, decimal Expense);

public sealed record DashboardRecentTransactionDto(
    Guid Id,
    string Merchant,
    string Type,
    decimal Amount,
    DateOnly TransactionDate,
    string? AccountName,
    string? CategoryName);

public sealed record DashboardBudgetProgressDto(
    Guid BudgetId,
    string CategoryName,
    decimal BudgetAmount,
    decimal SpentAmount,
    decimal ProgressPercent,
    string Status);

public sealed record DashboardGoalSummaryDto(
    Guid GoalId,
    string Name,
    decimal CurrentAmount,
    decimal TargetAmount,
    decimal ProgressPercent,
    DateOnly? TargetDate,
    string Status);

public sealed record DashboardRecurringDto(
    Guid Id,
    string Title,
    decimal Amount,
    DateOnly NextRunDate,
    string Frequency,
    string? AccountName,
    string? CategoryName);

public sealed record DashboardSummaryDto(
    DashboardMetricDto Metrics,
    IReadOnlyList<DashboardCategorySpendDto> CategorySpend,
    IReadOnlyList<DashboardTrendPointDto> Trend,
    IReadOnlyList<DashboardRecentTransactionDto> RecentTransactions,
    IReadOnlyList<DashboardBudgetProgressDto> BudgetProgress,
    IReadOnlyList<DashboardGoalSummaryDto> Goals,
    IReadOnlyList<DashboardRecurringDto> UpcomingRecurring);
