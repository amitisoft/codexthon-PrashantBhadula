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

public sealed record ReportAccountBalanceDto(
    Guid AccountId,
    string AccountName,
    decimal CurrentBalance);

public sealed record ReportTransactionRowDto(
    Guid Id,
    string Type,
    decimal Amount,
    DateOnly TransactionDate,
    string Merchant,
    string? Note,
    string AccountName,
    string? CategoryName);
