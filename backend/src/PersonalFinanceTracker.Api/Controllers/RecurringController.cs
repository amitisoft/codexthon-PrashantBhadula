using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Recurring;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/recurring")]
public sealed class RecurringController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RecurringTransactionDto>>> Get(CancellationToken cancellationToken)
    {
        var recurring = await dbContext.RecurringTransactions
            .Where(x => x.UserId == userContext.UserId)
            .OrderBy(x => x.NextRunDate)
            .ToListAsync(cancellationToken);

        return Ok(recurring.Select(MapRecurring).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<RecurringTransactionDto>> Create(
        CreateRecurringTransactionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Recurring amount must be greater than zero." });
        }

        var recurring = new RecurringTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            Title = request.Title.Trim(),
            Type = request.Type.Trim().ToLowerInvariant(),
            Amount = request.Amount,
            CategoryId = request.CategoryId,
            AccountId = request.AccountId,
            Frequency = request.Frequency.Trim().ToLowerInvariant(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            NextRunDate = request.NextRunDate ?? request.StartDate,
            AutoCreateTransaction = request.AutoCreateTransaction,
            IsPaused = false,
        };

        dbContext.RecurringTransactions.Add(recurring);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapRecurring(recurring));
    }

    private static RecurringTransactionDto MapRecurring(RecurringTransaction recurring)
    {
        return new RecurringTransactionDto(
            recurring.Id,
            recurring.Title,
            recurring.Type,
            recurring.Amount,
            recurring.CategoryId,
            recurring.AccountId,
            recurring.Frequency,
            recurring.StartDate,
            recurring.EndDate,
            recurring.NextRunDate,
            recurring.AutoCreateTransaction,
            recurring.IsPaused);
    }
}
