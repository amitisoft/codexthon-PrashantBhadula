namespace PersonalFinanceTracker.Application.DTOs.Categories;

public sealed record CategoryDto(
    Guid Id,
    string Name,
    string Type,
    string? Color,
    string? Icon,
    bool IsArchived);
