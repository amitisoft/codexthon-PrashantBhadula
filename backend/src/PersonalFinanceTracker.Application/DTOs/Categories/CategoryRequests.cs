namespace PersonalFinanceTracker.Application.DTOs.Categories;

public sealed record UpsertCategoryRequest(
    string Name,
    string Type,
    string? Color = null,
    string? Icon = null);
