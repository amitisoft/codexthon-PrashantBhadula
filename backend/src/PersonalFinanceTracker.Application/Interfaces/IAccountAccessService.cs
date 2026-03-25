namespace PersonalFinanceTracker.Application.Interfaces;

public interface IAccountAccessService
{
    Task<IReadOnlySet<Guid>> GetVisibleAccountIdsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<Guid>> GetEditableAccountIdsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> CanViewAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<bool> CanEditAccountAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
    Task<bool> IsOwnerAsync(Guid userId, Guid accountId, CancellationToken cancellationToken = default);
}
