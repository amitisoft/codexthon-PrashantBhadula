using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
            var accountExists = await HttpContext.RequestServices
                .GetRequiredService<IAccountAccessService>()
                .CanEditAccountAsync(userContext.UserId, request.LinkedAccountId.Value, cancellationToken);

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
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim(),
            Color = request.Color,
            Status = request.CurrentAmount >= request.TargetAmount ? "completed" : "active",
        };

        dbContext.Goals.Add(goal);
        await dbContext.SaveChangesAsync(cancellationToken);
        await HttpContext.RequestServices.GetRequiredService<IProductEventService>()
            .TrackAsync("goal_created", userContext.UserId, new { goal.Id, goal.Name }, cancellationToken);

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
            var canEditAccount = await HttpContext.RequestServices
                .GetRequiredService<IAccountAccessService>()
                .CanEditAccountAsync(userContext.UserId, request.AccountId.Value, cancellationToken);
            if (!canEditAccount)
            {
                return BadRequest(new { message = "Account was not found." });
            }

            var account = await dbContext.Accounts.FirstOrDefaultAsync(
                x => x.Id == request.AccountId,
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
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, request.AccountId, "contributed", "goal", goal.Id, $"Rs {request.Amount:N0} was added to goal {goal.Name}.", cancellationToken);
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
            var canEditAccount = await HttpContext.RequestServices
                .GetRequiredService<IAccountAccessService>()
                .CanEditAccountAsync(userContext.UserId, request.AccountId.Value, cancellationToken);
            if (!canEditAccount)
            {
                return BadRequest(new { message = "Account was not found." });
            }

            var account = await dbContext.Accounts.FirstOrDefaultAsync(
                x => x.Id == request.AccountId,
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
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, request.AccountId, "withdrew", "goal", goal.Id, $"Rs {request.Amount:N0} was withdrawn from goal {goal.Name}.", cancellationToken);
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
            goal.Icon,
            goal.Color);
    }
}
