using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Access;

public sealed class AccountAccessService(ApplicationDbContext dbContext) : IAccountAccessService
{
    public async Task<IReadOnlySet<Guid>> GetVisibleAccountIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var owned = dbContext.Accounts
            .Where(x => x.UserId == userId)
            .Select(x => x.Id);

        var shared = dbContext.AccountMembers
            .Where(x => x.UserId == userId)
            .Select(x => x.AccountId);

        var ids = await owned
            .Union(shared)
            .Distinct()
            .ToListAsync(cancellationToken);

        return ids.ToHashSet();
    }

    public async Task<IReadOnlySet<Guid>> GetEditableAccountIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var owned = dbContext.Accounts
            .Where(x => x.UserId == userId)
            .Select(x => x.Id);

        var shared = dbContext.AccountMembers
            .Where(x => x.UserId == userId && x.Role != "viewer")
            .Select(x => x.AccountId);

        var ids = await owned
            .Union(shared)
            .Distinct()
            .ToListAsync(cancellationToken);

        return ids.ToHashSet();
    }

    public async Task<bool> CanViewAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken)
               || await dbContext.AccountMembers.AnyAsync(x => x.AccountId == accountId && x.UserId == userId, cancellationToken);
    }

    public async Task<bool> CanEditAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken)
               || await dbContext.AccountMembers.AnyAsync(x => x.AccountId == accountId && x.UserId == userId && x.Role != "viewer", cancellationToken);
    }

    public Task<bool> IsOwnerAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default)
        => dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken);
}
