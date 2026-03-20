namespace PersonalFinanceTracker.Application.DTOs.Goals;

public sealed record GoalDto(
    Guid Id,
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    decimal ProgressPercent,
    DateOnly? TargetDate,
    string Status,
    Guid? LinkedAccountId,
    string? Color);

public sealed record CreateGoalRequest(
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateOnly? TargetDate,
    Guid? LinkedAccountId,
    string? Color);

public sealed record GoalAmountRequest(decimal Amount, Guid? AccountId);
