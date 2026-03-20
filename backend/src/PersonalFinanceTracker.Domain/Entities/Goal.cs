namespace PersonalFinanceTracker.Domain.Entities;

public sealed class Goal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
    public Guid? LinkedAccountId { get; set; }
    public string Status { get; set; } = "active";
    public string? Icon { get; set; }
    public string? Color { get; set; }
}
