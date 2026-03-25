namespace PersonalFinanceTracker.Domain.Entities;

public sealed class AccountMember
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "viewer";
    public Guid AddedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
