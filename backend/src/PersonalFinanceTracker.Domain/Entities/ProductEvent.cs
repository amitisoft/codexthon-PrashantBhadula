namespace PersonalFinanceTracker.Domain.Entities;

public sealed class ProductEvent
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public string? MetadataJson { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
