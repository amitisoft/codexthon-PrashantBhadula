using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Automation;

public sealed class RecurringAutomationService(
    IServiceScopeFactory scopeFactory,
    ILogger<RecurringAutomationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ProcessDueItemsAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await ProcessDueItemsAsync(stoppingToken);
        }
    }

    private async Task ProcessDueItemsAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var activityLogService = scope.ServiceProvider.GetRequiredService<IActivityLogService>();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var dueItems = await dbContext.RecurringTransactions
                .Where(x => x.AutoCreateTransaction && !x.IsPaused && x.AccountId != null && x.NextRunDate <= today && (x.EndDate == null || x.NextRunDate <= x.EndDate.Value))
                .OrderBy(x => x.NextRunDate)
                .ToListAsync(cancellationToken);

            foreach (var recurring in dueItems)
            {
                while (recurring.NextRunDate <= today && (recurring.EndDate is null || recurring.NextRunDate <= recurring.EndDate.Value))
                {
                    var alreadyCreated = await dbContext.Transactions.AnyAsync(
                        x => x.RecurringTransactionId == recurring.Id && x.TransactionDate == recurring.NextRunDate,
                        cancellationToken);

                    if (!alreadyCreated)
                    {
                        var account = await dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == recurring.AccountId, cancellationToken);
                        if (account is null)
                        {
                            break;
                        }

                        var transaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            UserId = recurring.UserId,
                            AccountId = recurring.AccountId.Value,
                            CategoryId = recurring.CategoryId,
                            RecurringTransactionId = recurring.Id,
                            Type = recurring.Type,
                            Amount = recurring.Amount,
                            TransactionDate = recurring.NextRunDate,
                            Merchant = recurring.Title,
                            Note = "Auto-generated from recurring schedule.",
                            PaymentMethod = null,
                            Tags = ["auto-generated", $"recurring:{recurring.Id:D}"],
                            CreatedAtUtc = DateTime.UtcNow,
                            UpdatedAtUtc = DateTime.UtcNow,
                        };

                        if (transaction.Type == "income")
                        {
                            account.CurrentBalance += transaction.Amount;
                        }
                        else
                        {
                            account.CurrentBalance -= transaction.Amount;
                        }

                        account.LastUpdatedAtUtc = DateTime.UtcNow;
                        dbContext.Transactions.Add(transaction);

                        await activityLogService.LogAsync(
                            recurring.UserId,
                            recurring.UserId,
                            recurring.AccountId,
                            "recurring-generated",
                            "transaction",
                            transaction.Id,
                            $"{recurring.Title} was auto-generated from a recurring schedule.",
                            cancellationToken);
                    }

                    recurring.NextRunDate = GetNextDate(recurring.NextRunDate, recurring.Frequency);
                    if (recurring.EndDate is not null && recurring.NextRunDate > recurring.EndDate.Value)
                    {
                        recurring.IsPaused = true;
                        break;
                    }
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Recurring automation processing failed.");
        }
    }

    private static DateOnly GetNextDate(DateOnly date, string frequency) => frequency switch
    {
        "daily" => date.AddDays(1),
        "weekly" => date.AddDays(7),
        "yearly" => date.AddYears(1),
        _ => date.AddMonths(1),
    };
}
