namespace PersonalFinanceTracker.Application.DTOs.Transactions;

public sealed record TransactionDto(
    Guid Id,
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    string Type,
    decimal Amount,
    DateOnly TransactionDate,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    string[] Tags,
    DateTime CreatedAtUtc);

public sealed record CreateTransactionRequest(
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    string Type,
    decimal Amount,
    DateOnly TransactionDate,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    string[]? Tags);

public sealed record TransactionQueryRequest(
    DateOnly? From,
    DateOnly? To,
    Guid? AccountId,
    Guid? CategoryId,
    string? Type,
    string? Search);
