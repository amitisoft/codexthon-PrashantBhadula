using System.Text.Json;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Analytics;

public sealed class ProductEventService(ApplicationDbContext dbContext) : IProductEventService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task TrackAsync(
        string eventName,
        Guid? userId = null,
        object? metadata = null,
        CancellationToken cancellationToken = default)
    {
        dbContext.ProductEvents.Add(new ProductEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventName = eventName,
            MetadataJson = metadata is null ? null : JsonSerializer.Serialize(metadata, JsonOptions),
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
