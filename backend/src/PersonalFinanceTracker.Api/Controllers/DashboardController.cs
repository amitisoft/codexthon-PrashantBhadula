using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinanceTracker.Application.DTOs.Dashboard;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/dashboard")]
public sealed class DashboardController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow;
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var visibleAccountIds = await HttpContext.RequestServices
            .GetRequiredService<IAccountAccessService>()
            .GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);

        var accounts = await dbContext.Accounts
            .Where(x => visibleAccountIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var transactions = await dbContext.Transactions
            .Where(x => visibleAccountIds.Contains(x.AccountId))
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userContext.UserId)
            .ToListAsync(cancellationToken);

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == today.Month && x.Year == today.Year)
            .ToListAsync(cancellationToken);

        var goals = await dbContext.Goals
            .Where(x => x.UserId == userContext.UserId)
            .OrderBy(x => x.TargetDate)
            .ToListAsync(cancellationToken);

        var recurring = await dbContext.RecurringTransactions
            .Where(x => x.AccountId != null && visibleAccountIds.Contains(x.AccountId.Value) && !x.IsPaused && x.NextRunDate >= monthStart)
            .OrderBy(x => x.NextRunDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        var currentMonthTransactions = transactions
            .Where(x => x.TransactionDate >= monthStart && x.TransactionDate <= monthEnd)
            .ToList();

        var currentMonthIncome = currentMonthTransactions.Where(x => x.Type == "income").Sum(x => x.Amount);
        var currentMonthExpense = currentMonthTransactions.Where(x => x.Type == "expense").Sum(x => x.Amount);

        var categorySpend = currentMonthTransactions
            .Where(x => x.Type == "expense" && x.CategoryId is not null)
            .GroupBy(x => x.CategoryId)
            .Select(group =>
            {
                var categoryName = categories.FirstOrDefault(x => x.Id == group.Key)?.Name ?? "Uncategorized";
                return new DashboardCategorySpendDto(categoryName, group.Sum(x => x.Amount));
            })
            .OrderByDescending(x => x.Amount)
            .Take(6)
            .ToList();

        var trend = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var month = DateOnly.FromDateTime(today.AddMonths(-offset));
                var start = new DateOnly(month.Year, month.Month, 1);
                var end = start.AddMonths(1).AddDays(-1);
                var bucket = transactions.Where(x => x.TransactionDate >= start && x.TransactionDate <= end).ToList();

                return new DashboardTrendPointDto(
                    start.ToDateTime(TimeOnly.MinValue).ToString("MMM"),
                    bucket.Where(x => x.Type == "income").Sum(x => x.Amount),
                    bucket.Where(x => x.Type == "expense").Sum(x => x.Amount));
            })
            .Reverse()
            .ToList();

        var recentTransactions = transactions
            .Take(5)
            .Select(item => new DashboardRecentTransactionDto(
                item.Id,
                item.Merchant ?? "Manual Entry",
                item.Type,
                item.Amount,
                item.TransactionDate,
                accounts.FirstOrDefault(x => x.Id == item.AccountId)?.Name,
                categories.FirstOrDefault(x => x.Id == item.CategoryId)?.Name))
            .ToList();

        var budgetProgress = budgets
            .Select(budget =>
            {
                var spent = currentMonthTransactions
                    .Where(x => x.Type == "expense" && x.CategoryId == budget.CategoryId)
                    .Sum(x => x.Amount);
                var progress = budget.Amount == 0 ? 0 : Math.Round((spent / budget.Amount) * 100m, 2);
                var status = progress >= 100 ? "over" : progress >= budget.AlertThresholdPercent ? "warning" : "on-track";

                return new DashboardBudgetProgressDto(
                    budget.Id,
                    categories.FirstOrDefault(x => x.Id == budget.CategoryId)?.Name ?? "Category",
                    budget.Amount,
                    spent,
                    progress,
                    status);
            })
            .OrderByDescending(x => x.ProgressPercent)
            .ToList();

        var goalSummary = goals
            .Take(4)
            .Select(goal =>
            {
                var progress = goal.TargetAmount == 0 ? 0 : Math.Round((goal.CurrentAmount / goal.TargetAmount) * 100m, 2);
                return new DashboardGoalSummaryDto(
                    goal.Id,
                    goal.Name,
                    goal.CurrentAmount,
                    goal.TargetAmount,
                    progress,
                    goal.TargetDate,
                    goal.Status);
            })
            .ToList();

        var upcomingRecurring = recurring
            .Select(item => new DashboardRecurringDto(
                item.Id,
                item.Title,
                item.Amount,
                item.NextRunDate,
                item.Frequency,
                accounts.FirstOrDefault(x => x.Id == item.AccountId)?.Name,
                categories.FirstOrDefault(x => x.Id == item.CategoryId)?.Name))
            .ToList();

        var metrics = new DashboardMetricDto(
            currentMonthIncome,
            currentMonthExpense,
            accounts.Sum(x => x.CurrentBalance),
            accounts.Count,
            transactions.Count,
            budgets.Count,
            goals.Count(x => x.Status == "active"));

        return Ok(new DashboardSummaryDto(
            metrics,
            categorySpend,
            trend,
            recentTransactions,
            budgetProgress,
            goalSummary,
            upcomingRecurring));
    }
}
