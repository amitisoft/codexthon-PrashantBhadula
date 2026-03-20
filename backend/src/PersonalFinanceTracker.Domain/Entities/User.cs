namespace PersonalFinanceTracker.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Locale { get; set; } = "en-IN";
    public string CurrencyCode { get; set; } = "INR";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
