using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Goals;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/goals")]
public sealed class GoalsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GoalDto>>> Get(CancellationToken cancellationToken)
    {
        var goals = await dbContext.Goals
            .Where(x => x.UserId == userContext.UserId)
            .OrderBy(x => x.TargetDate)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Ok(goals.Select(MapGoal).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<GoalDto>> Create(CreateGoalRequest request, CancellationToken cancellationToken)
    {
        if (request.TargetAmount <= 0)
        {
            return BadRequest(new { message = "Goal target amount must be greater than zero." });
        }

        if (request.LinkedAccountId is not null)
        {
            var accountExists = await dbContext.Accounts.AnyAsync(
                x => x.Id == request.LinkedAccountId && x.UserId == userContext.UserId,
                cancellationToken);

            if (!accountExists)
            {
                return BadRequest(new { message = "Linked account was not found." });
            }
        }

        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            Name = request.Name.Trim(),
            TargetAmount = request.TargetAmount,
            CurrentAmount = request.CurrentAmount < 0 ? 0 : request.CurrentAmount,
            TargetDate = request.TargetDate,
            LinkedAccountId = request.LinkedAccountId,
            Color = request.Color,
            Status = request.CurrentAmount >= request.TargetAmount ? "completed" : "active",
        };

        dbContext.Goals.Add(goal);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapGoal(goal));
    }

    [HttpPost("{id:guid}/contribute")]
    public async Task<ActionResult<GoalDto>> Contribute(Guid id, GoalAmountRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Contribution amount must be greater than zero." });
        }

        var goal = await dbContext.Goals.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);
        if (goal is null)
        {
            return NotFound();
        }

        if (request.AccountId is not null)
        {
            var account = await dbContext.Accounts.FirstOrDefaultAsync(
                x => x.Id == request.AccountId && x.UserId == userContext.UserId,
                cancellationToken);

            if (account is null)
            {
                return BadRequest(new { message = "Account was not found." });
            }

            account.CurrentBalance -= request.Amount;
            account.LastUpdatedAtUtc = DateTime.UtcNow;
        }

        goal.CurrentAmount += request.Amount;
        goal.Status = goal.CurrentAmount >= goal.TargetAmount ? "completed" : "active";

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(MapGoal(goal));
    }

    [HttpPost("{id:guid}/withdraw")]
    public async Task<ActionResult<GoalDto>> Withdraw(Guid id, GoalAmountRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Withdraw amount must be greater than zero." });
        }

        var goal = await dbContext.Goals.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);
        if (goal is null)
        {
            return NotFound();
        }

        if (goal.CurrentAmount < request.Amount)
        {
            return BadRequest(new { message = "Withdraw amount cannot exceed the current goal balance." });
        }

        if (request.AccountId is not null)
        {
            var account = await dbContext.Accounts.FirstOrDefaultAsync(
                x => x.Id == request.AccountId && x.UserId == userContext.UserId,
                cancellationToken);

            if (account is null)
            {
                return BadRequest(new { message = "Account was not found." });
            }

            account.CurrentBalance += request.Amount;
            account.LastUpdatedAtUtc = DateTime.UtcNow;
        }

        goal.CurrentAmount -= request.Amount;
        goal.Status = goal.CurrentAmount >= goal.TargetAmount ? "completed" : "active";

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(MapGoal(goal));
    }

    private static GoalDto MapGoal(Goal goal)
    {
        var progress = goal.TargetAmount == 0 ? 0 : Math.Round((goal.CurrentAmount / goal.TargetAmount) * 100m, 2);
        return new GoalDto(
            goal.Id,
            goal.Name,
            goal.TargetAmount,
            goal.CurrentAmount,
            progress,
            goal.TargetDate,
            goal.Status,
            goal.LinkedAccountId,
            goal.Color);
    }
}
