using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalFinanceTracker.Application.DTOs.Budgets;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/budgets")]
public sealed class BudgetsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BudgetDto>>> Get(
        [FromQuery] int? month,
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow;
        var selectedMonth = month ?? today.Month;
        var selectedYear = year ?? today.Year;

        var budgets = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == selectedMonth && x.Year == selectedYear)
            .Join(
                dbContext.Categories,
                budget => budget.CategoryId,
                category => category.Id,
                (budget, category) => new { budget, category })
            .ToListAsync(cancellationToken);

        var monthStart = new DateOnly(selectedYear, selectedMonth, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var spendByCategory = await dbContext.Transactions
            .Where(x =>
                x.UserId == userContext.UserId &&
                x.Type == "expense" &&
                x.CategoryId != null &&
                x.TransactionDate >= monthStart &&
                x.TransactionDate <= monthEnd)
            .GroupBy(x => x.CategoryId)
            .Select(group => new { CategoryId = group.Key!.Value, Amount = group.Sum(item => item.Amount) })
            .ToListAsync(cancellationToken);

        var spendLookup = spendByCategory.ToDictionary(x => x.CategoryId, x => x.Amount);

        var response = budgets
            .Select(item =>
            {
                var spent = spendLookup.GetValueOrDefault(item.budget.CategoryId, 0m);
                var progress = item.budget.Amount == 0 ? 0 : Math.Round((spent / item.budget.Amount) * 100m, 2);
                var status = progress >= 100 ? "over" : progress >= item.budget.AlertThresholdPercent ? "warning" : "on-track";

                return new BudgetDto(
                    item.budget.Id,
                    item.budget.CategoryId,
                    item.category.Name,
                    item.budget.Month,
                    item.budget.Year,
                    item.budget.Amount,
                    spent,
                    item.budget.Amount - spent,
                    progress,
                    status,
                    item.budget.AlertThresholdPercent);
            })
            .OrderByDescending(x => x.ProgressPercent)
            .ToList();

        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<BudgetDto>> Create(CreateBudgetRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Budget amount must be greater than zero." });
        }

        var category = await dbContext.Categories.FirstOrDefaultAsync(
            x => x.Id == request.CategoryId && x.UserId == userContext.UserId,
            cancellationToken);

        if (category is null || category.Type != "expense")
        {
            return BadRequest(new { message = "Budget category must be a valid expense category." });
        }

        var existing = await dbContext.Budgets.AnyAsync(
            x => x.UserId == userContext.UserId &&
                 x.CategoryId == request.CategoryId &&
                 x.Month == request.Month &&
                 x.Year == request.Year,
            cancellationToken);

        if (existing)
        {
            return Conflict(new { message = "A budget already exists for this category and month." });
        }

        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            CategoryId = request.CategoryId,
            Month = request.Month,
            Year = request.Year,
            Amount = request.Amount,
            AlertThresholdPercent = request.AlertThresholdPercent <= 0 ? 80 : request.AlertThresholdPercent,
        };

        dbContext.Budgets.Add(budget);
        await dbContext.SaveChangesAsync(cancellationToken);
        await HttpContext.RequestServices.GetRequiredService<IProductEventService>()
            .TrackAsync("budget_created", userContext.UserId, new { budget.CategoryId, budget.Month, budget.Year }, cancellationToken);

        return Ok(new BudgetDto(
            budget.Id,
            budget.CategoryId,
            category.Name,
            budget.Month,
            budget.Year,
            budget.Amount,
            0,
            budget.Amount,
            0,
            "on-track",
            budget.AlertThresholdPercent));
    }

    [HttpPost("duplicate-last-month")]
    public async Task<ActionResult<IReadOnlyList<BudgetDto>>> DuplicateLastMonth(DuplicateBudgetRequest request, CancellationToken cancellationToken)
    {
        var targetMonth = request.Month;
        var targetYear = request.Year;
        var sourceDate = new DateOnly(targetYear, targetMonth, 1).AddMonths(-1);

        var sourceBudgets = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == sourceDate.Month && x.Year == sourceDate.Year)
            .ToListAsync(cancellationToken);

        if (sourceBudgets.Count == 0)
        {
            return BadRequest(new { message = "No budgets were found in the previous month to duplicate." });
        }

        var existingCategoryIds = await dbContext.Budgets
            .Where(x => x.UserId == userContext.UserId && x.Month == targetMonth && x.Year == targetYear)
            .Select(x => x.CategoryId)
            .ToListAsync(cancellationToken);

        var budgetsToCreate = sourceBudgets
            .Where(x => !existingCategoryIds.Contains(x.CategoryId))
            .Select(sourceBudget => new Budget
            {
                Id = Guid.NewGuid(),
                UserId = userContext.UserId,
                CategoryId = sourceBudget.CategoryId,
                Month = targetMonth,
                Year = targetYear,
                Amount = sourceBudget.Amount,
                AlertThresholdPercent = sourceBudget.AlertThresholdPercent,
            })
            .ToList();

        if (budgetsToCreate.Count == 0)
        {
            return Conflict(new { message = "All previous month budgets already exist in the selected month." });
        }

        dbContext.Budgets.AddRange(budgetsToCreate);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await Get(targetMonth, targetYear, cancellationToken);
    }
}
