namespace PersonalFinanceTracker.Application.DTOs.Accounts;

public sealed record AccountDto(
    Guid Id,
    string Name,
    string Type,
    decimal OpeningBalance,
    decimal CurrentBalance,
    string? InstitutionName,
    DateTime CreatedAtUtc);

public sealed record CreateAccountRequest(
    string Name,
    string Type,
    decimal OpeningBalance,
    string? InstitutionName);

public sealed record UpdateAccountRequest(
    string Name,
    string Type,
    string? InstitutionName);

public sealed record AccountTransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount);
