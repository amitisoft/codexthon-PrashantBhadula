namespace PersonalFinanceTracker.Application.DTOs.Recurring;

public sealed record RecurringTransactionDto(
    Guid Id,
    string Title,
    string Type,
    decimal Amount,
    Guid? CategoryId,
    Guid? AccountId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly NextRunDate,
    bool AutoCreateTransaction,
    bool IsPaused);

public sealed record CreateRecurringTransactionRequest(
    string Title,
    string Type,
    decimal Amount,
    Guid? CategoryId,
    Guid? AccountId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly? NextRunDate,
    bool AutoCreateTransaction);
