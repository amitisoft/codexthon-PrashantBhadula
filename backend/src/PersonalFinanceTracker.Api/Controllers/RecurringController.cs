using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
        var validationError = await ValidateRequestAsync(request.Amount, request.CategoryId, request.AccountId, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
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

        await HttpContext.RequestServices.GetRequiredService<IProductEventService>()
            .TrackAsync("recurring_created", userContext.UserId, new { recurring.Id, recurring.Title }, cancellationToken);
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, recurring.AccountId, "created", "recurring", recurring.Id, $"{recurring.Title} recurring item was created.", cancellationToken);

        return Ok(MapRecurring(recurring));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RecurringTransactionDto>> Update(
        Guid id,
        UpdateRecurringTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var recurring = await dbContext.RecurringTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);
        if (recurring is null)
        {
            return NotFound();
        }

        var validationError = await ValidateRequestAsync(request.Amount, request.CategoryId, request.AccountId, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        recurring.Title = request.Title.Trim();
        recurring.Type = request.Type.Trim().ToLowerInvariant();
        recurring.Amount = request.Amount;
        recurring.CategoryId = request.CategoryId;
        recurring.AccountId = request.AccountId;
        recurring.Frequency = request.Frequency.Trim().ToLowerInvariant();
        recurring.StartDate = request.StartDate;
        recurring.EndDate = request.EndDate;
        recurring.NextRunDate = request.NextRunDate ?? recurring.NextRunDate;
        recurring.AutoCreateTransaction = request.AutoCreateTransaction;

        await dbContext.SaveChangesAsync(cancellationToken);

        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, recurring.AccountId, "updated", "recurring", recurring.Id, $"{recurring.Title} recurring item was updated.", cancellationToken);

        return Ok(MapRecurring(recurring));
    }

    [HttpPost("{id:guid}/pause")]
    public async Task<ActionResult<RecurringTransactionDto>> Pause(Guid id, CancellationToken cancellationToken)
    {
        var recurring = await dbContext.RecurringTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);
        if (recurring is null)
        {
            return NotFound();
        }

        recurring.IsPaused = !recurring.IsPaused;
        await dbContext.SaveChangesAsync(cancellationToken);

        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(
                userContext.UserId,
                userContext.UserId,
                recurring.AccountId,
                recurring.IsPaused ? "paused" : "resumed",
                "recurring",
                recurring.Id,
                $"{recurring.Title} recurring item was {(recurring.IsPaused ? "paused" : "resumed")}.",
                cancellationToken);

        return Ok(MapRecurring(recurring));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var recurring = await dbContext.RecurringTransactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);
        if (recurring is null)
        {
            return NotFound();
        }

        var title = recurring.Title;
        var accountId = recurring.AccountId;
        dbContext.RecurringTransactions.Remove(recurring);
        await dbContext.SaveChangesAsync(cancellationToken);

        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, accountId, "deleted", "recurring", id, $"{title} recurring item was deleted.", cancellationToken);

        return NoContent();
    }

    private async Task<ObjectResult?> ValidateRequestAsync(decimal amount, Guid? categoryId, Guid? accountId, CancellationToken cancellationToken)
    {
        if (amount <= 0)
        {
            return BadRequest(new { message = "Recurring amount must be greater than zero." });
        }

        if (accountId is not null)
        {
            var canEditAccount = await HttpContext.RequestServices
                .GetRequiredService<IAccountAccessService>()
                .CanEditAccountAsync(userContext.UserId, accountId.Value, cancellationToken);

            if (!canEditAccount)
            {
                return BadRequest(new { message = "Account was not found." });
            }
        }

        if (categoryId is not null)
        {
            var categoryExists = await dbContext.Categories.AnyAsync(
                x => x.Id == categoryId.Value && x.UserId == userContext.UserId && !x.IsArchived,
                cancellationToken);

            if (!categoryExists)
            {
                return BadRequest(new { message = "Category was not found." });
            }
        }

        return null;
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
