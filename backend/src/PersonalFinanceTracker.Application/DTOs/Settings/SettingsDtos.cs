namespace PersonalFinanceTracker.Application.DTOs.Settings;

public sealed record UserSettingsDto(string CurrencyCode, string Locale, string TimeZone);

public sealed record UpdateUserSettingsRequest(string CurrencyCode, string Locale, string TimeZone);
