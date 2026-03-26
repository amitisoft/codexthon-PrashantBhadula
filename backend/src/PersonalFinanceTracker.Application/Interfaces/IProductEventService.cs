namespace PersonalFinanceTracker.Application.Interfaces;

public interface IProductEventService
{
    Task TrackAsync(
        string eventName,
        Guid? userId = null,
        object? metadata = null,
        CancellationToken cancellationToken = default);
}
