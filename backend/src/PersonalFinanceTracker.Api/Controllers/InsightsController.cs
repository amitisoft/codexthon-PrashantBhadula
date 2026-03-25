using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinanceTracker.Application.DTOs.Insights;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/insights")]
public sealed class InsightsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet("health-score")]
    public async Task<ActionResult<HealthScoreSummaryDto>> GetHealthScore(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow;
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var lookbackStart = monthStart.AddMonths(-2);
        var visibleAccountIds = await HttpContext.RequestServices
            .GetRequiredService<IAccountAccessService>()
            .GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);

        var accounts = await dbContext.Accounts
            .Where(x => visibleAccountIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        var transactions = await dbContext.Transactions
            .Where(x => visibleAccountIds.Contains(x.AccountId) && x.TransactionDate >= lookbackStart && x.TransactionDate <= monthEnd)
            .ToListAsync(cancellationToken);

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == today.Month && x.Year == today.Year)
            .ToListAsync(cancellationToken);

        var currentMonthTransactions = transactions
            .Where(x => x.TransactionDate >= monthStart && x.TransactionDate <= monthEnd)
            .ToList();
        var scoredTransactions = transactions
            .Where(x => x.Type is "income" or "expense")
            .ToList();

        if (scoredTransactions.Count < 3 && budgets.Count == 0)
        {
            return Ok(new HealthScoreSummaryDto(
                false,
                "Add a few income or expense records to unlock your financial health score.",
                0,
                "Unavailable",
                "Your score will appear once there is enough activity to evaluate your financial habits.",
                [],
                [
                    "Add your first few transactions so Fitra can learn your cash flow.",
                    "Create budgets for key categories if you want plan-versus-actual scoring sooner.",
                ]));
        }

        var currentMonthIncome = currentMonthTransactions.Where(x => x.Type == "income").Sum(x => x.Amount);
        var currentMonthExpense = currentMonthTransactions.Where(x => x.Type == "expense").Sum(x => x.Amount);
        var currentBalance = accounts.Sum(x => x.CurrentBalance);

        var netSavings = currentMonthIncome - currentMonthExpense;
        var savingsRate = currentMonthIncome <= 0 ? 0 : Math.Round((netSavings / currentMonthIncome) * 100m, 1);
        var savingsScore = ClampScore(currentMonthIncome <= 0 ? 25m : (savingsRate / 20m) * 100m);

        var budgetScore = budgets.Count == 0
            ? 55m
            : ClampScore(budgets
                .Select(budget =>
                {
                    var spent = currentMonthTransactions
                        .Where(x => x.Type == "expense" && x.CategoryId == budget.CategoryId)
                        .Sum(x => x.Amount);

                    if (budget.Amount <= 0)
                    {
                        return 50m;
                    }

                    if (spent <= budget.Amount)
                    {
                        return 100m;
                    }

                    var overspendPercent = ((spent - budget.Amount) / budget.Amount) * 100m;
                    return Math.Max(0m, 100m - (overspendPercent * 2m));
                })
                .DefaultIfEmpty(55m)
                .Average());

        var monthlyExpenseAverage = transactions
            .Where(x => x.Type == "expense")
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .Select(group => group.Sum(x => x.Amount))
            .DefaultIfEmpty(0m)
            .Average();

        var monthsOfBuffer = monthlyExpenseAverage <= 0 ? 2m : Math.Round(currentBalance / monthlyExpenseAverage, 2);
        var cashBufferScore = ClampScore((monthsOfBuffer / 2m) * 100m);

        var expenseBuckets = transactions
            .Where(x => x.Type == "expense")
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .Select(group => group.Sum(x => x.Amount))
            .ToList();

        var expenseStabilityScore = ClampScore(GetExpenseStabilityScore(expenseBuckets));

        var overallScore = Math.Round(
            (savingsScore * 0.30m) +
            (budgetScore * 0.25m) +
            (cashBufferScore * 0.25m) +
            (expenseStabilityScore * 0.20m),
            1);

        var factors = new List<HealthScoreFactorDto>
        {
            new(
                "savings-rate",
                "Savings Rate",
                savingsScore,
                currentMonthIncome <= 0 ? "No income this month" : $"{savingsRate}%",
                savingsScore >= 75m
                    ? "You are converting a healthy share of income into retained cash."
                    : "Your current month savings margin is thin."),
            new(
                "budget-adherence",
                "Budget Adherence",
                budgetScore,
                budgets.Count == 0 ? "No budgets set" : $"{budgets.Count} budget(s) tracked",
                budgetScore >= 75m
                    ? "Spending is staying close to plan."
                    : "A few categories are pushing beyond planned limits."),
            new(
                "cash-buffer",
                "Cash Buffer",
                cashBufferScore,
                $"{monthsOfBuffer:0.##} month(s)",
                cashBufferScore >= 75m
                    ? "Your current balances can absorb normal volatility."
                    : "Your cash cushion is tighter than ideal."),
            new(
                "expense-stability",
                "Expense Stability",
                expenseStabilityScore,
                expenseBuckets.Count == 0 ? "Limited expense history" : $"{expenseBuckets.Count} month(s) measured",
                expenseStabilityScore >= 75m
                    ? "Month-to-month spending looks steady."
                    : "Recent expenses are moving around quite a bit."),
        };

        var suggestions = BuildSuggestions(savingsScore, budgetScore, cashBufferScore, expenseStabilityScore, budgets.Count);
        var band = GetBand(overallScore);
        var summary = band switch
        {
            "Excellent" => "Your financial habits look strong right now, with healthy savings, steady spending, and enough cash cushion.",
            "Good" => "You are in a solid position overall, with a few areas that could become stronger over the next month.",
            "Fair" => "You have a workable base, but one or two money habits are reducing your financial flexibility.",
            _ => "Your score is under pressure right now. A tighter plan for spending and savings would improve short-term stability.",
        };

        return Ok(new HealthScoreSummaryDto(true, null, overallScore, band, summary, factors, suggestions));
    }

    private static decimal GetExpenseStabilityScore(IReadOnlyList<decimal> expenseBuckets)
    {
        if (expenseBuckets.Count < 2)
        {
            return 55m;
        }

        var mean = expenseBuckets.Average();
        if (mean <= 0)
        {
            return 55m;
        }

        var variance = expenseBuckets.Average(x => (x - mean) * (x - mean));
        var standardDeviation = (decimal)Math.Sqrt((double)variance);
        var coefficientOfVariation = standardDeviation / mean;
        return 100m - (coefficientOfVariation * 120m);
    }

    private static decimal ClampScore(decimal score) => Math.Round(Math.Min(100m, Math.Max(0m, score)), 1);

    private static string GetBand(decimal score) => score switch
    {
        >= 85m => "Excellent",
        >= 70m => "Good",
        >= 50m => "Fair",
        _ => "Needs Attention",
    };

    private static IReadOnlyList<string> BuildSuggestions(
        decimal savingsScore,
        decimal budgetScore,
        decimal cashBufferScore,
        decimal expenseStabilityScore,
        int budgetCount)
    {
        var suggestions = new List<string>();

        if (savingsScore < 65m)
        {
            suggestions.Add("Try to protect a fixed portion of each month’s income before discretionary spending begins.");
        }

        if (budgetScore < 65m)
        {
            suggestions.Add(budgetCount == 0
                ? "Create budgets for your biggest spend categories so the score can measure plan-versus-actual behavior."
                : "Review the categories running over budget and trim the ones that repeat each month.");
        }

        if (cashBufferScore < 65m)
        {
            suggestions.Add("Build a bigger cash cushion by keeping part of windfalls or goal contributions in available balances.");
        }

        if (expenseStabilityScore < 65m)
        {
            suggestions.Add("Watch variable categories like food, shopping, or transport to reduce month-to-month swings.");
        }

        if (suggestions.Count == 0)
        {
            suggestions.Add("Keep your current rhythm going and review your forecast weekly to stay ahead of changes.");
        }

        return suggestions.Take(3).ToList();
    }
}
