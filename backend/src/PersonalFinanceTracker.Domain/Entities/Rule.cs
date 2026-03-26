namespace PersonalFinanceTracker.Domain.Entities;

public sealed class Rule
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public int Priority { get; set; }
    public string ConditionsJson { get; set; } = "[]";
    public string ActionsJson { get; set; } = "[]";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
