namespace PersonalFinanceTracker.Application.DTOs.Accounts;

public sealed record AccountDto(
    Guid Id,
    string Name,
    string Type,
    decimal OpeningBalance,
    decimal CurrentBalance,
    string? InstitutionName,
    DateTime CreatedAtUtc,
    bool IsShared,
    bool IsOwner,
    string AccessRole,
    IReadOnlyList<AccountMemberDto> Members);

public sealed record AccountMemberDto(
    Guid UserId,
    string DisplayName,
    string Email,
    string Role,
    bool IsOwner,
    DateTime AddedAtUtc);

public sealed record CreateAccountRequest(
    string Name,
    string Type,
    decimal OpeningBalance,
    string? InstitutionName);

public sealed record UpdateAccountRequest(
    string Name,
    string Type,
    string? InstitutionName);

public sealed record ShareAccountRequest(
    string Email,
    string Role);

public sealed record AccountTransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount);
