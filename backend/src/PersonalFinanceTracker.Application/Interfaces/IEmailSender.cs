namespace PersonalFinanceTracker.Application.Interfaces;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string email, string displayName, string resetLink, CancellationToken cancellationToken = default);
}
