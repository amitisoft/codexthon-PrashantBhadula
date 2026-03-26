using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Backups;

public sealed class JsonBackupService(
    IServiceScopeFactory scopeFactory,
    ILogger<JsonBackupService> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await WriteBackupIfNeededAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await WriteBackupIfNeededAsync(stoppingToken);
        }
    }

    private async Task WriteBackupIfNeededAsync(CancellationToken cancellationToken)
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var backupRoot = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "backups");
            Directory.CreateDirectory(backupRoot);

            var backupFilePath = Path.Combine(backupRoot, $"fitra-backup-{today:yyyy-MM-dd}.json");
            if (File.Exists(backupFilePath))
            {
                return;
            }

            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var snapshot = new
            {
                createdAtUtc = DateTime.UtcNow,
                users = await dbContext.Users.AsNoTracking().Select(x => new { x.Id, x.Email, x.DisplayName, x.CreatedAtUtc }).ToListAsync(cancellationToken),
                accounts = await dbContext.Accounts.AsNoTracking().ToListAsync(cancellationToken),
                categories = await dbContext.Categories.AsNoTracking().ToListAsync(cancellationToken),
                transactions = await dbContext.Transactions.AsNoTracking().ToListAsync(cancellationToken),
                budgets = await dbContext.Budgets.AsNoTracking().ToListAsync(cancellationToken),
                goals = await dbContext.Goals.AsNoTracking().ToListAsync(cancellationToken),
                recurringTransactions = await dbContext.RecurringTransactions.AsNoTracking().ToListAsync(cancellationToken),
            };

            await File.WriteAllTextAsync(backupFilePath, JsonSerializer.Serialize(snapshot, JsonOptions), cancellationToken);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Daily backup generation failed.");
        }
    }
}
