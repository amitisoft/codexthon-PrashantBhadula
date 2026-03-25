namespace PersonalFinanceTracker.Application.DTOs.Budgets;

public sealed record BudgetDto(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    int Month,
    int Year,
    decimal Amount,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal ProgressPercent,
    string Status,
    int AlertThresholdPercent);

public sealed record CreateBudgetRequest(Guid CategoryId, int Month, int Year, decimal Amount, int AlertThresholdPercent);

public sealed record DuplicateBudgetRequest(int Month, int Year);
