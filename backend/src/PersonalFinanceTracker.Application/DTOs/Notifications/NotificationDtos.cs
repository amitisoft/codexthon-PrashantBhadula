namespace PersonalFinanceTracker.Application.DTOs.Notifications;

public sealed record NotificationItemDto(
    string Id,
    string Type,
    string Title,
    string Body,
    DateTime CreatedAtUtc);
