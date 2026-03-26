namespace PersonalFinanceTracker.Application.Interfaces;

public interface IActivityLogService
{
    Task LogAsync(
        Guid userId,
        Guid? actorUserId,
        Guid? accountId,
        string actionType,
        string entityType,
        Guid? entityId,
        string summary,
        CancellationToken cancellationToken = default);
}
