using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Domain.Entities;

namespace PersonalFinanceTracker.Infrastructure.Persistence;

public sealed class DatabaseInitializer(ApplicationDbContext dbContext)
{
    private static readonly (string Name, string Type, string Color, string Icon)[] DefaultCategories =
    [
        ("Food", "expense", "#4C8A87", "utensils"),
        ("Rent", "expense", "#244B66", "home"),
        ("Utilities", "expense", "#CC9C4B", "bolt"),
        ("Transport", "expense", "#6D7E91", "car"),
        ("Entertainment", "expense", "#8B6CA7", "film"),
        ("Shopping", "expense", "#C4665E", "shopping-bag"),
        ("Health", "expense", "#4C8B68", "heart-pulse"),
        ("Education", "expense", "#6B86A8", "book"),
        ("Travel", "expense", "#4F7EA8", "plane"),
        ("Subscriptions", "expense", "#9B7F5A", "repeat"),
        ("Miscellaneous", "expense", "#8D96A0", "boxes"),
        ("Salary", "income", "#4C8B68", "badge-indian-rupee"),
        ("Freelance", "income", "#3F6D8C", "briefcase"),
        ("Bonus", "income", "#CC9C4B", "sparkles"),
        ("Investment", "income", "#5C7A62", "chart-column"),
        ("Gift", "income", "#A06CA5", "gift"),
        ("Refund", "income", "#4D8899", "rotate-ccw"),
        ("Other", "income", "#6D7E91", "circle"),
    ];

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
    }

    public async Task SeedDefaultCategoriesForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.Categories.AnyAsync(x => x.UserId == userId, cancellationToken);
        if (existing)
        {
            return;
        }

        var categories = DefaultCategories.Select(item => new Category
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = item.Name,
            Type = item.Type,
            Color = item.Color,
            Icon = item.Icon,
            IsArchived = false,
        });

        await dbContext.Categories.AddRangeAsync(categories, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
