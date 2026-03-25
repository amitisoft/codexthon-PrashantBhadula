using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Activity;

public sealed class ActivityLogService(ApplicationDbContext dbContext) : IActivityLogService
{
    public async Task LogAsync(
        Guid userId,
        Guid? actorUserId,
        Guid? accountId,
        string actionType,
        string entityType,
        Guid? entityId,
        string summary,
        CancellationToken cancellationToken = default)
    {
        dbContext.AccountActivityLogs.Add(new AccountActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ActorUserId = actorUserId,
            AccountId = accountId,
            ActionType = actionType,
            EntityType = entityType,
            EntityId = entityId,
            Summary = summary,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
