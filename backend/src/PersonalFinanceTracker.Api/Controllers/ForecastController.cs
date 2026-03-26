using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinanceTracker.Application.DTOs.Forecast;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/forecast")]
public sealed class ForecastController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet("month")]
    public async Task<ActionResult<ForecastSummaryDto>> GetMonthForecast(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthEnd = new DateOnly(today.Year, today.Month, 1).AddMonths(1).AddDays(-1);
        var lookbackStart = today.AddDays(-89);
        var remainingDays = Math.Max(0, monthEnd.DayNumber - today.DayNumber);
        var visibleAccountIds = await HttpContext.RequestServices
            .GetRequiredService<IAccountAccessService>()
            .GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);

        var accounts = await dbContext.Accounts
            .Where(x => visibleAccountIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var transactions = await dbContext.Transactions
            .Where(x => visibleAccountIds.Contains(x.AccountId) && x.TransactionDate >= lookbackStart && x.TransactionDate <= today)
            .ToListAsync(cancellationToken);

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userContext.UserId)
            .ToListAsync(cancellationToken);

        var recurringItems = await dbContext.RecurringTransactions
            .Where(x => x.AccountId != null && visibleAccountIds.Contains(x.AccountId.Value) && !x.IsPaused && x.NextRunDate <= monthEnd && (x.EndDate == null || x.EndDate >= today))
            .OrderBy(x => x.NextRunDate)
            .ToListAsync(cancellationToken);

        var currentBalance = accounts.Sum(x => x.CurrentBalance);

        var variableExpenseTransactions = transactions
            .Where(x => x.Type == "expense" && x.RecurringTransactionId is null)
            .ToList();

        const int lookbackDays = 90;
        var averageDailyExpense = variableExpenseTransactions.Sum(x => x.Amount) / lookbackDays;
        var expectedPatternExpense = Math.Round(averageDailyExpense * remainingDays, 2);

        var recurringOccurrences = recurringItems
            .SelectMany(item => ExpandOccurrences(item, today.AddDays(1), monthEnd))
            .OrderBy(x => x.RunDate)
            .ThenBy(x => x.Type)
            .ToList();

        var expectedRecurringIncome = recurringOccurrences
            .Where(x => x.Type == "income")
            .Sum(x => x.Amount);

        var expectedRecurringExpense = recurringOccurrences
            .Where(x => x.Type == "expense")
            .Sum(x => x.Amount);

        var protectedBuffer = Math.Round(Math.Max(2000m, averageDailyExpense * 7m), 2);
        var projectedEndBalance = Math.Round(currentBalance + expectedRecurringIncome - expectedRecurringExpense - expectedPatternExpense, 2);
        var safeToSpend = Math.Round(Math.Max(0m, projectedEndBalance - protectedBuffer), 2);

        var confidence = GetConfidence(transactions);

        var dailyProjection = BuildDailyProjection(today, monthEnd, currentBalance, averageDailyExpense, recurringOccurrences);

        var upcomingItems = recurringOccurrences
            .Take(6)
            .Select(item => new ForecastUpcomingItemDto(
                item.RecurringTransactionId,
                item.Title,
                item.Type,
                item.Amount,
                item.RunDate,
                "recurring",
                accounts.FirstOrDefault(x => x.Id == item.AccountId)?.Name,
                categories.FirstOrDefault(x => x.Id == item.CategoryId)?.Name))
            .ToList();

        var patternCategories = variableExpenseTransactions
            .Where(x => x.CategoryId is not null)
            .GroupBy(x => x.CategoryId)
            .Select(group =>
            {
                var share = variableExpenseTransactions.Sum(x => x.Amount) == 0
                    ? 0
                    : group.Sum(x => x.Amount) / variableExpenseTransactions.Sum(x => x.Amount);

                return new ForecastPatternCategoryDto(
                    categories.FirstOrDefault(x => x.Id == group.Key)?.Name ?? "Uncategorized",
                    Math.Round(expectedPatternExpense * share, 2));
            })
            .Where(x => x.ProjectedAmount > 0)
            .OrderByDescending(x => x.ProjectedAmount)
            .Take(4)
            .ToList();

        var warnings = BuildWarnings(projectedEndBalance, safeToSpend, protectedBuffer, recurringOccurrences.Count, confidence);

        var assumptions = new List<string>
        {
            "Current balances are treated as the starting point for today.",
            "Scheduled recurring items are included through the end of this month.",
            "Pattern-based spending uses the last 90 days of non-recurring expenses.",
            "Safe to spend keeps a protective cash buffer before month end."
        };

        var response = new ForecastSummaryDto(
            today,
            monthEnd,
            new ForecastOverviewDto(
                currentBalance,
                projectedEndBalance,
                safeToSpend,
                protectedBuffer,
                expectedRecurringIncome,
                expectedRecurringExpense,
                expectedPatternExpense,
                Math.Round(averageDailyExpense, 2),
                confidence),
            dailyProjection,
            upcomingItems,
            patternCategories,
            assumptions,
            warnings);

        return Ok(response);
    }

    private static List<ForecastDailyPointDto> BuildDailyProjection(
        DateOnly startDate,
        DateOnly endDate,
        decimal currentBalance,
        decimal averageDailyExpense,
        IReadOnlyList<ForecastOccurrence> recurringOccurrences)
    {
        var recurringByDate = recurringOccurrences
            .GroupBy(x => x.RunDate)
            .ToDictionary(
                group => group.Key,
                group => new
                {
                    Income = group.Where(x => x.Type == "income").Sum(x => x.Amount),
                    Expense = group.Where(x => x.Type == "expense").Sum(x => x.Amount),
                });

        var points = new List<ForecastDailyPointDto>();
        var runningBalance = currentBalance;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var scheduledIncome = 0m;
            var scheduledExpense = 0m;
            var patternExpense = 0m;

            if (date > startDate)
            {
                if (recurringByDate.TryGetValue(date, out var bucket))
                {
                    scheduledIncome = bucket.Income;
                    scheduledExpense = bucket.Expense;
                }

                patternExpense = Math.Round(averageDailyExpense, 2);
                runningBalance = Math.Round(runningBalance + scheduledIncome - scheduledExpense - patternExpense, 2);
            }

            points.Add(new ForecastDailyPointDto(date, runningBalance, scheduledIncome, scheduledExpense, patternExpense));
        }

        return points;
    }

    private static List<ForecastWarningDto> BuildWarnings(
        decimal projectedEndBalance,
        decimal safeToSpend,
        decimal protectedBuffer,
        int recurringEventCount,
        string confidence)
    {
        var warnings = new List<ForecastWarningDto>();

        if (projectedEndBalance < 0)
        {
            warnings.Add(new ForecastWarningDto("high", "Negative balance is likely before month end if spending continues at the current pace."));
        }
        else if (projectedEndBalance < protectedBuffer)
        {
            warnings.Add(new ForecastWarningDto("medium", "Your projected month-end cushion is below the recommended protective buffer."));
        }

        if (safeToSpend == 0)
        {
            warnings.Add(new ForecastWarningDto("medium", "There is no extra safe-to-spend room right now after protecting your month-end buffer."));
        }

        if (recurringEventCount == 0)
        {
            warnings.Add(new ForecastWarningDto("low", "No future recurring items were detected, so the forecast leans more heavily on spending patterns."));
        }

        if (confidence == "Low")
        {
            warnings.Add(new ForecastWarningDto("low", "Forecast confidence is lower because there is limited recent transaction history to learn from."));
        }

        return warnings;
    }

    private static string GetConfidence(IReadOnlyList<Domain.Entities.Transaction> transactions)
    {
        var activeDays = transactions
            .Select(x => x.TransactionDate)
            .Distinct()
            .Count();

        if (activeDays >= 45)
        {
            return "High";
        }

        if (activeDays >= 15)
        {
            return "Medium";
        }

        return "Low";
    }

    private static IReadOnlyList<ForecastOccurrence> ExpandOccurrences(
        Domain.Entities.RecurringTransaction item,
        DateOnly from,
        DateOnly to)
    {
        var occurrences = new List<ForecastOccurrence>();
        var cursor = item.NextRunDate;

        if (cursor < from)
        {
            while (cursor < from)
            {
                cursor = GetNextDate(cursor, item.Frequency);
                if (item.EndDate is not null && cursor > item.EndDate.Value)
                {
                    return occurrences;
                }
            }
        }

        while (cursor <= to && (item.EndDate is null || cursor <= item.EndDate.Value))
        {
            occurrences.Add(new ForecastOccurrence(
                item.Id,
                item.Title,
                item.Type,
                item.Amount,
                cursor,
                item.AccountId,
                item.CategoryId));

            cursor = GetNextDate(cursor, item.Frequency);
        }

        return occurrences;
    }

    private static DateOnly GetNextDate(DateOnly date, string frequency) => frequency switch
    {
        "daily" => date.AddDays(1),
        "weekly" => date.AddDays(7),
        "yearly" => date.AddYears(1),
        _ => date.AddMonths(1),
    };

    private sealed record ForecastOccurrence(
        Guid RecurringTransactionId,
        string Title,
        string Type,
        decimal Amount,
        DateOnly RunDate,
        Guid? AccountId,
        Guid? CategoryId);
}
