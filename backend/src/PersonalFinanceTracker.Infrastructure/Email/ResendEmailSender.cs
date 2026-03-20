using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PersonalFinanceTracker.Application.Interfaces;

namespace PersonalFinanceTracker.Infrastructure.Email;

public sealed class ResendEmailSender(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<ResendEmailSender> logger) : IEmailSender
{
    public async Task SendPasswordResetAsync(
        string email,
        string displayName,
        string resetLink,
        CancellationToken cancellationToken = default)
    {
        var apiKey = configuration["Resend:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "re_replace_me")
        {
            logger.LogWarning(
                "Resend API key is not configured. Password reset link for {Email}: {ResetLink}",
                email,
                resetLink);
            return;
        }

        var fromEmail = configuration["Resend:FromEmail"] ?? "no-reply@example.com";
        var fromName = configuration["Resend:FromName"] ?? "Personal Finance Tracker";

        using var client = httpClientFactory.CreateClient();
        client.BaseAddress = new Uri("https://api.resend.com/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new
        {
            from = $"{fromName} <{fromEmail}>",
            to = new[] { email },
            subject = "Reset your Personal Finance Tracker password",
            html =
                $"<p>Hello {displayName},</p><p>Use the link below to reset your password:</p><p><a href=\"{resetLink}\">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p>",
        };

        using var response = await client.PostAsync(
            "emails",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError("Resend email send failed with status {StatusCode}: {Body}", response.StatusCode, body);
        }
    }
}
