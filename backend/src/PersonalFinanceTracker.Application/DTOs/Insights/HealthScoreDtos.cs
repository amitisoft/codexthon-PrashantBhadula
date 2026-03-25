namespace PersonalFinanceTracker.Application.DTOs.Insights;

public sealed record HealthScoreFactorDto(
    string Key,
    string Label,
    decimal Score,
    string ValueLabel,
    string Insight);

public sealed record HealthScoreSummaryDto(
    bool IsAvailable,
    string? UnavailableReason,
    decimal Score,
    string Band,
    string Summary,
    IReadOnlyList<HealthScoreFactorDto> Factors,
    IReadOnlyList<string> Suggestions);
