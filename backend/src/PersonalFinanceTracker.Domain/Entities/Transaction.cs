namespace PersonalFinanceTracker.Domain.Entities;

public sealed class Transaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? RecurringTransactionId { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string? Merchant { get; set; }
    public string? Note { get; set; }
    public string? PaymentMethod { get; set; }
    public string[] Tags { get; set; } = [];
    public string[] AppliedRuleNames { get; set; } = [];
    public bool NeedsReview { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
