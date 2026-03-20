namespace PersonalFinanceTracker.Application.Interfaces;

public interface IUserContext
{
    Guid UserId { get; }
    string Email { get; }
}
