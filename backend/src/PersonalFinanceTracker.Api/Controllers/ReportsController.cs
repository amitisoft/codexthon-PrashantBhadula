using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinanceTracker.Application.DTOs.Reports;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/reports")]
public sealed class ReportsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<ReportsSummaryDto>> GetSummary([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var visibleAccountIds = await HttpContext.RequestServices
            .GetRequiredService<IAccountAccessService>()
            .GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);
        var reportMonthStarts = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var month = today.AddMonths(-(5 - offset));
                return new DateOnly(month.Year, month.Month, 1);
            })
            .ToList();

        var baseQuery = BuildQuery(request, visibleAccountIds);

        var transactions = await baseQuery
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Id,
                x.Type,
                x.Amount,
                x.TransactionDate,
                x.Merchant,
                x.Note,
                AccountName = dbContext.Accounts.Where(account => account.Id == x.AccountId).Select(account => account.Name).FirstOrDefault(),
                CategoryName = dbContext.Categories.Where(category => category.Id == x.CategoryId).Select(category => category.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var accountScopedTransactions = await dbContext.Transactions
            .Where(x =>
                visibleAccountIds.Contains(x.AccountId) &&
                (request.AccountId == null || x.AccountId == request.AccountId.Value) &&
                x.TransactionDate >= reportMonthStarts[0])
            .Select(x => new
            {
                x.AccountId,
                x.Type,
                x.Amount,
                x.TransactionDate,
                x.Tags,
            })
            .ToListAsync(cancellationToken);

        var totals = new ReportTotalsDto(
            transactions.Where(x => x.Type == "income").Sum(x => x.Amount),
            transactions.Where(x => x.Type == "expense").Sum(x => x.Amount),
            transactions.Where(x => x.Type == "income").Sum(x => x.Amount) - transactions.Where(x => x.Type == "expense").Sum(x => x.Amount),
            transactions.Count);

        var categorySpend = transactions
            .Where(x => x.Type == "expense")
            .GroupBy(x => new { x.CategoryName })
            .Select(group => new ReportCategorySpendDto(null, group.Key.CategoryName ?? "Uncategorized", group.Sum(x => x.Amount)))
            .OrderByDescending(x => x.Amount)
            .ToList();

        var trend = transactions
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .OrderBy(group => group.Key.Year)
            .ThenBy(group => group.Key.Month)
            .Select(group => new ReportTrendPointDto(
                $"{CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(group.Key.Month)} {group.Key.Year}",
                group.Where(x => x.Type == "income").Sum(x => x.Amount),
                group.Where(x => x.Type == "expense").Sum(x => x.Amount)))
            .ToList();

        var savingsRateTrend = reportMonthStarts
            .Select(monthStart =>
            {
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                var bucket = transactions
                    .Where(x => x.TransactionDate >= monthStart && x.TransactionDate <= monthEnd)
                    .ToList();
                var income = bucket.Where(x => x.Type == "income").Sum(x => x.Amount);
                var expense = bucket.Where(x => x.Type == "expense").Sum(x => x.Amount);
                var savingsRate = income <= 0 ? 0 : Math.Round(((income - expense) / income) * 100m, 2);

                return new ReportSavingsRatePointDto(
                    monthStart.ToDateTime(TimeOnly.MinValue).ToString("MMM"),
                    savingsRate);
            })
            .ToList();

        var accountBalances = await dbContext.Accounts
            .Where(x => visibleAccountIds.Contains(x.Id) && (request.AccountId == null || x.Id == request.AccountId.Value))
            .OrderByDescending(x => x.CurrentBalance)
            .Select(x => new ReportAccountBalanceDto(x.Id, x.Name, x.CurrentBalance))
            .ToListAsync(cancellationToken);

        var accountBalanceTrend = accountBalances
            .Take(4)
            .Select(account =>
            {
                var points = reportMonthStarts
                    .Select(monthStart =>
                    {
                        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                        var postMonthDelta = accountScopedTransactions
                            .Where(x => x.TransactionDate > monthEnd)
                            .Sum(x => GetAccountDeltaForTransaction(account.AccountId, x.AccountId, ParseDestinationAccountId(x.Tags), x.Type, x.Amount));

                        return new ReportAccountBalanceTrendPointDto(
                            monthStart.ToDateTime(TimeOnly.MinValue).ToString("MMM"),
                            account.CurrentBalance - postMonthDelta);
                    })
                    .ToList();

                return new ReportAccountBalanceTrendSeriesDto(account.AccountId, account.AccountName, points);
            })
            .ToList();

        var currentNetWorth = accountBalances.Sum(x => x.CurrentBalance);
        var netWorthTrend = reportMonthStarts
            .Select(monthStart =>
            {
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                var postMonthDelta = accountScopedTransactions
                    .Where(x => x.TransactionDate > monthEnd && x.Type != "transfer")
                    .Sum(x => x.Type == "income" ? x.Amount : -x.Amount);

                return new ReportNetWorthPointDto(
                    monthStart.ToDateTime(TimeOnly.MinValue).ToString("MMM"),
                    currentNetWorth - postMonthDelta);
            })
            .ToList();

        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);
        var currentMonthEnd = currentMonthStart.AddMonths(1).AddDays(-1);
        var previousMonthStart = currentMonthStart.AddMonths(-1);
        var previousMonthEnd = currentMonthStart.AddDays(-1);

        var currentMonthTransactions = transactions
            .Where(x => x.TransactionDate >= currentMonthStart && x.TransactionDate <= currentMonthEnd)
            .ToList();
        var previousMonthTransactions = transactions
            .Where(x => x.TransactionDate >= previousMonthStart && x.TransactionDate <= previousMonthEnd)
            .ToList();

        var currentMonthIncome = currentMonthTransactions.Where(x => x.Type == "income").Sum(x => x.Amount);
        var currentMonthExpense = currentMonthTransactions.Where(x => x.Type == "expense").Sum(x => x.Amount);
        var previousMonthIncome = previousMonthTransactions.Where(x => x.Type == "income").Sum(x => x.Amount);
        var previousMonthExpense = previousMonthTransactions.Where(x => x.Type == "expense").Sum(x => x.Amount);
        var currentSavingsRate = currentMonthIncome <= 0 ? 0 : Math.Round(((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100m, 2);
        var previousSavingsRate = previousMonthIncome <= 0 ? 0 : Math.Round(((previousMonthIncome - previousMonthExpense) / previousMonthIncome) * 100m, 2);

        var categoryChanges = currentMonthTransactions
            .Where(x => x.Type == "expense")
            .GroupBy(x => x.CategoryName ?? "Uncategorized")
            .Select(group =>
            {
                var previousAmount = previousMonthTransactions
                    .Where(x => x.Type == "expense" && (x.CategoryName ?? "Uncategorized") == group.Key)
                    .Sum(x => x.Amount);
                var currentAmount = group.Sum(x => x.Amount);
                var changeAmount = currentAmount - previousAmount;
                var changePercent = previousAmount <= 0
                    ? (currentAmount <= 0 ? 0 : 100)
                    : Math.Round((changeAmount / previousAmount) * 100m, 2);

                return new ReportCategoryChangeDto(
                    group.Key,
                    currentAmount,
                    previousAmount,
                    changeAmount,
                    changePercent,
                    changeAmount > 0 ? "up" : changeAmount < 0 ? "down" : "flat");
            })
            .OrderByDescending(x => Math.Abs(x.ChangeAmount))
            .Take(5)
            .ToList();

        var monthComparison = new ReportMonthComparisonDto(
            currentMonthStart.ToDateTime(TimeOnly.MinValue).ToString("MMMM"),
            previousMonthStart.ToDateTime(TimeOnly.MinValue).ToString("MMMM"),
            currentMonthIncome,
            previousMonthIncome,
            currentMonthExpense,
            previousMonthExpense,
            currentSavingsRate,
            previousSavingsRate,
            categoryChanges);

        var insights = BuildInsights(categoryChanges, currentSavingsRate, previousSavingsRate, netWorthTrend, currentMonthExpense, previousMonthExpense);

        var rows = transactions
            .Take(200)
            .Select(x => new ReportTransactionRowDto(
                x.Id,
                x.Type,
                x.Amount,
                x.TransactionDate,
                x.Merchant ?? "Manual Entry",
                x.Note,
                x.AccountName ?? "Unknown account",
                x.CategoryName))
            .ToList();

        return Ok(new ReportsSummaryDto(
            totals,
            categorySpend,
            trend,
            savingsRateTrend,
            netWorthTrend,
            accountBalanceTrend,
            monthComparison,
            insights,
            accountBalances,
            rows));
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var visibleAccountIds = await HttpContext.RequestServices
            .GetRequiredService<IAccountAccessService>()
            .GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);
        var rows = await BuildQuery(request, visibleAccountIds)
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Type,
                x.Amount,
                x.TransactionDate,
                x.Merchant,
                x.Note,
                AccountName = dbContext.Accounts.Where(account => account.Id == x.AccountId).Select(account => account.Name).FirstOrDefault(),
                CategoryName = dbContext.Categories.Where(category => category.Id == x.CategoryId).Select(category => category.Name).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("Date,Type,Amount,Account,Category,Merchant,Note");

        foreach (var row in rows)
        {
            csv.AppendLine(string.Join(",",
                Escape(row.TransactionDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                Escape(row.Type),
                Escape(row.Amount.ToString(CultureInfo.InvariantCulture)),
                Escape(row.AccountName ?? string.Empty),
                Escape(row.CategoryName ?? string.Empty),
                Escape(row.Merchant ?? string.Empty),
                Escape(row.Note ?? string.Empty)));
        }

        await HttpContext.RequestServices.GetRequiredService<IProductEventService>()
            .TrackAsync("report_exported", userContext.UserId, new { request.From, request.To, request.AccountId, request.CategoryId, request.Type }, cancellationToken);

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "fitra-report.csv");
    }

    private IQueryable<Domain.Entities.Transaction> BuildQuery(ReportFilterRequest request, IReadOnlySet<Guid> visibleAccountIds)
    {
        var query = dbContext.Transactions.Where(x => visibleAccountIds.Contains(x.AccountId));

        if (request.From is not null)
        {
            query = query.Where(x => x.TransactionDate >= request.From.Value);
        }

        if (request.To is not null)
        {
            query = query.Where(x => x.TransactionDate <= request.To.Value);
        }

        if (request.AccountId is not null)
        {
            query = query.Where(x => x.AccountId == request.AccountId.Value);
        }

        if (request.CategoryId is not null)
        {
            query = query.Where(x => x.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            var normalizedType = request.Type.Trim().ToLowerInvariant();
            query = query.Where(x => x.Type == normalizedType);
        }

        return query;
    }

    private static string Escape(string value)
    {
        var escaped = value.Replace("\"", "\"\"");
        return $"\"{escaped}\"";
    }

    private static decimal GetAccountDeltaForTransaction(Guid targetAccountId, Guid sourceAccountId, Guid? destinationAccountId, string type, decimal amount)
    {
        return type switch
        {
            "income" when targetAccountId == sourceAccountId => amount,
            "expense" when targetAccountId == sourceAccountId => -amount,
            "transfer" when targetAccountId == sourceAccountId => -amount,
            "transfer" when destinationAccountId == targetAccountId => amount,
            _ => 0m,
        };
    }

    private static Guid? ParseDestinationAccountId(IEnumerable<string>? tags)
    {
        const string transferTagPrefix = "transfer:";
        var rawValue = tags?.FirstOrDefault(x => x.StartsWith(transferTagPrefix, StringComparison.OrdinalIgnoreCase));
        if (rawValue is null)
        {
            return null;
        }

        var idValue = rawValue[transferTagPrefix.Length..];
        return Guid.TryParse(idValue, out var destinationAccountId) ? destinationAccountId : null;
    }

    private static IReadOnlyList<ReportInsightCardDto> BuildInsights(
        IReadOnlyList<ReportCategoryChangeDto> categoryChanges,
        decimal currentSavingsRate,
        decimal previousSavingsRate,
        IReadOnlyList<ReportNetWorthPointDto> netWorthTrend,
        decimal currentMonthExpense,
        decimal previousMonthExpense)
    {
        static string FormatCurrency(decimal amount) => amount.ToString("N0", CultureInfo.GetCultureInfo("en-IN"));

        var insights = new List<ReportInsightCardDto>();

        var topCategoryChange = categoryChanges.FirstOrDefault();
        if (topCategoryChange is not null && Math.Abs(topCategoryChange.ChangeAmount) >= 1500)
        {
            insights.Add(new ReportInsightCardDto(
                topCategoryChange.Direction == "up" ? $"{topCategoryChange.CategoryName} spend jumped" : $"{topCategoryChange.CategoryName} spend eased",
                topCategoryChange.Direction == "up" ? "caution" : "positive",
                topCategoryChange.Direction == "up"
                    ? $"{topCategoryChange.CategoryName} is up by Rs {FormatCurrency(topCategoryChange.ChangeAmount)} versus last month."
                    : $"{topCategoryChange.CategoryName} is down by Rs {FormatCurrency(Math.Abs(topCategoryChange.ChangeAmount))} versus last month."));
        }

        var savingsRateDelta = currentSavingsRate - previousSavingsRate;
        if (Math.Abs(savingsRateDelta) >= 2)
        {
            insights.Add(new ReportInsightCardDto(
                savingsRateDelta > 0 ? "Savings rate improved" : "Savings rate slipped",
                savingsRateDelta > 0 ? "positive" : "caution",
                savingsRateDelta > 0
                    ? $"Savings rate improved by {savingsRateDelta.ToString("0.##", CultureInfo.InvariantCulture)} points month over month."
                    : $"Savings rate fell by {Math.Abs(savingsRateDelta).ToString("0.##", CultureInfo.InvariantCulture)} points month over month."));
        }

        if (netWorthTrend.Count >= 2)
        {
            var earliest = netWorthTrend.First().NetWorth;
            var latest = netWorthTrend.Last().NetWorth;
            var change = latest - earliest;

            insights.Add(new ReportInsightCardDto(
                change >= 0 ? "Net worth trend is rising" : "Net worth trend is under pressure",
                change >= 0 ? "positive" : "caution",
                change >= 0
                    ? $"Estimated net worth is up by Rs {FormatCurrency(change)} across the recent reporting window."
                    : $"Estimated net worth is down by Rs {FormatCurrency(Math.Abs(change))} across the recent reporting window."));
        }

        if (insights.Count == 0)
        {
            insights.Add(new ReportInsightCardDto(
                "Patterns are stable",
                "neutral",
                currentMonthExpense > previousMonthExpense
                    ? "Spending is slightly above the previous month, but no major swings stand out yet."
                    : "Spending is tracking close to last month without a major category spike."));
        }

        return insights.Take(3).ToList();
    }
}
