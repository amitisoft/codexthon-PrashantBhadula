using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Notifications;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
public sealed class NotificationsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationItemDto>>> Get(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == today.Month && x.Year == today.Year)
            .ToListAsync(cancellationToken);

        var spendByCategory = await dbContext.Transactions
            .Where(x => x.UserId == userContext.UserId && x.Type == "expense" && x.CategoryId != null && x.TransactionDate >= monthStart && x.TransactionDate <= monthEnd)
            .GroupBy(x => x.CategoryId)
            .Select(group => new { CategoryId = group.Key!.Value, Amount = group.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Amount, cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userContext.UserId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var budgetAlerts = budgets
            .Select(budget =>
            {
                var spent = spendByCategory.GetValueOrDefault(budget.CategoryId, 0m);
                var percent = budget.Amount <= 0 ? 0 : (spent / budget.Amount) * 100m;
                if (percent < 80m)
                {
                    return null;
                }

                var title = percent >= 120m
                    ? "Budget significantly exceeded"
                    : percent >= 100m
                        ? "Budget exceeded"
                        : "Budget almost used";

                return new NotificationItemDto(
                    $"budget-{budget.Id}",
                    "budget",
                    title,
                    $"{categories.GetValueOrDefault(budget.CategoryId, "Category")} is at {Math.Round(percent, 0)}% of this month's budget.",
                    DateTime.UtcNow);
            })
            .Where(x => x is not null)
            .Cast<NotificationItemDto>()
            .ToList();

        var upcomingRecurring = await dbContext.RecurringTransactions
            .Where(x => x.UserId == userContext.UserId && !x.IsPaused && x.NextRunDate >= today && x.NextRunDate <= today.AddDays(3))
            .OrderBy(x => x.NextRunDate)
            .Take(4)
            .Select(x => new NotificationItemDto(
                $"recurring-{x.Id}",
                "recurring",
                "Upcoming recurring payment",
                $"{x.Title} is due on {x.NextRunDate:yyyy-MM-dd}.",
                DateTime.UtcNow))
            .ToListAsync(cancellationToken);

        var goalAlerts = await dbContext.Goals
            .Where(x => x.UserId == userContext.UserId && x.Status == "completed")
            .OrderByDescending(x => x.TargetDate)
            .Take(3)
            .Select(x => new NotificationItemDto(
                $"goal-{x.Id}",
                "goal",
                "Goal reached",
                $"{x.Name} has reached its target amount.",
                DateTime.UtcNow))
            .ToListAsync(cancellationToken);

        var activity = await dbContext.AccountActivityLogs
            .Where(x => x.UserId == userContext.UserId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(6)
            .Select(x => new NotificationItemDto(
                $"activity-{x.Id}",
                "activity",
                "Recent activity",
                x.Summary,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(budgetAlerts
            .Concat(upcomingRecurring)
            .Concat(goalAlerts)
            .Concat(activity)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(10)
            .ToList());
    }
}
