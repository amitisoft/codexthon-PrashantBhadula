namespace PersonalFinanceTracker.Application.DTOs.Forecast;

public sealed record ForecastOverviewDto(
    decimal CurrentBalance,
    decimal ProjectedEndBalance,
    decimal SafeToSpend,
    decimal ProtectedBuffer,
    decimal ExpectedRecurringIncome,
    decimal ExpectedRecurringExpense,
    decimal ExpectedPatternExpense,
    decimal AverageDailyExpense,
    string Confidence);

public sealed record ForecastDailyPointDto(
    DateOnly Date,
    decimal ProjectedBalance,
    decimal ScheduledIncome,
    decimal ScheduledExpense,
    decimal PatternExpense);

public sealed record ForecastUpcomingItemDto(
    Guid? RecurringTransactionId,
    string Title,
    string Type,
    decimal Amount,
    DateOnly RunDate,
    string Source,
    string? AccountName,
    string? CategoryName);

public sealed record ForecastPatternCategoryDto(
    string CategoryName,
    decimal ProjectedAmount);

public sealed record ForecastWarningDto(
    string Severity,
    string Message);

public sealed record ForecastSummaryDto(
    DateOnly AsOfDate,
    DateOnly ThroughDate,
    ForecastOverviewDto Overview,
    IReadOnlyList<ForecastDailyPointDto> DailyProjection,
    IReadOnlyList<ForecastUpcomingItemDto> UpcomingItems,
    IReadOnlyList<ForecastPatternCategoryDto> PatternCategories,
    IReadOnlyList<string> Assumptions,
    IReadOnlyList<ForecastWarningDto> Warnings);
