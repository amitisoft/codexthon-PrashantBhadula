namespace PersonalFinanceTracker.Application.DTOs.Rules;

public sealed record RuleConditionDto(
    string Field,
    string Operator,
    string Value);

public sealed record RuleActionDto(
    string Type,
    string? Value);

public sealed record RuleDto(
    Guid Id,
    string Name,
    bool IsEnabled,
    int Priority,
    IReadOnlyList<RuleConditionDto> Conditions,
    IReadOnlyList<RuleActionDto> Actions,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record UpsertRuleRequest(
    string Name,
    bool IsEnabled,
    int Priority,
    IReadOnlyList<RuleConditionDto> Conditions,
    IReadOnlyList<RuleActionDto> Actions);
