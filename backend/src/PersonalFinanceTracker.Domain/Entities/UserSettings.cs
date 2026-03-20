namespace PersonalFinanceTracker.Domain.Entities;

public sealed class UserSettings
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string CurrencyCode { get; set; } = "INR";
    public string Locale { get; set; } = "en-IN";
    public string TimeZone { get; set; } = "Asia/Kolkata";
}
