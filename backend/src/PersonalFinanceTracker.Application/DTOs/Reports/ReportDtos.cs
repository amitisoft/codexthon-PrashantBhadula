namespace PersonalFinanceTracker.Application.DTOs.Reports;

public sealed record ReportFilterRequest(
    DateOnly? From,
    DateOnly? To,
    Guid? AccountId,
    Guid? CategoryId,
    string? Type);

public sealed record ReportsSummaryDto(
    ReportTotalsDto Totals,
    IReadOnlyList<ReportCategorySpendDto> CategorySpend,
    IReadOnlyList<ReportTrendPointDto> Trend,
    IReadOnlyList<ReportSavingsRatePointDto> SavingsRateTrend,
    IReadOnlyList<ReportNetWorthPointDto> NetWorthTrend,
    IReadOnlyList<ReportAccountBalanceTrendSeriesDto> AccountBalanceTrend,
    ReportMonthComparisonDto MonthComparison,
    IReadOnlyList<ReportInsightCardDto> Insights,
    IReadOnlyList<ReportAccountBalanceDto> AccountBalances,
    IReadOnlyList<ReportTransactionRowDto> Transactions);

public sealed record ReportTotalsDto(
    decimal Income,
    decimal Expense,
    decimal Net,
    int TransactionCount);

public sealed record ReportCategorySpendDto(
    Guid? CategoryId,
    string CategoryName,
    decimal Amount);

public sealed record ReportTrendPointDto(
    string PeriodLabel,
    decimal Income,
    decimal Expense);

public sealed record ReportSavingsRatePointDto(
    string PeriodLabel,
    decimal SavingsRatePercent);

public sealed record ReportNetWorthPointDto(
    string PeriodLabel,
    decimal NetWorth);

public sealed record ReportMonthComparisonDto(
    string CurrentPeriodLabel,
    string PreviousPeriodLabel,
    decimal CurrentIncome,
    decimal PreviousIncome,
    decimal CurrentExpense,
    decimal PreviousExpense,
    decimal CurrentSavingsRate,
    decimal PreviousSavingsRate,
    IReadOnlyList<ReportCategoryChangeDto> CategoryChanges);

public sealed record ReportCategoryChangeDto(
    string CategoryName,
    decimal CurrentAmount,
    decimal PreviousAmount,
    decimal ChangeAmount,
    decimal ChangePercent,
    string Direction);

public sealed record ReportInsightCardDto(
    string Title,
    string Tone,
    string Body);

public sealed record ReportAccountBalanceDto(
    Guid AccountId,
    string AccountName,
    decimal CurrentBalance);

public sealed record ReportAccountBalanceTrendSeriesDto(
    Guid AccountId,
    string AccountName,
    IReadOnlyList<ReportAccountBalanceTrendPointDto> Points);

public sealed record ReportAccountBalanceTrendPointDto(
    string PeriodLabel,
    decimal Balance);

public sealed record ReportTransactionRowDto(
    Guid Id,
    string Type,
    decimal Amount,
    DateOnly TransactionDate,
    string Merchant,
    string? Note,
    string AccountName,
    string? CategoryName);
