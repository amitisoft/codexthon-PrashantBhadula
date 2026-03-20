using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var baseQuery = BuildQuery(request);

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

        var accountBalances = await dbContext.Accounts
            .Where(x => x.UserId == userContext.UserId && (request.AccountId == null || x.Id == request.AccountId.Value))
            .OrderByDescending(x => x.CurrentBalance)
            .Select(x => new ReportAccountBalanceDto(x.Id, x.Name, x.CurrentBalance))
            .ToListAsync(cancellationToken);

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

        return Ok(new ReportsSummaryDto(totals, categorySpend, trend, accountBalances, rows));
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] ReportFilterRequest request, CancellationToken cancellationToken)
    {
        var rows = await BuildQuery(request)
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

        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "fitra-report.csv");
    }

    private IQueryable<Domain.Entities.Transaction> BuildQuery(ReportFilterRequest request)
    {
        var query = dbContext.Transactions.Where(x => x.UserId == userContext.UserId);

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
}
