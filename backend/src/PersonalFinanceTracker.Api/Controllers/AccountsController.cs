using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Accounts;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/accounts")]
public sealed class AccountsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> Get(CancellationToken cancellationToken)
    {
        var accounts = await dbContext.Accounts
            .Where(x => x.UserId == userContext.UserId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new AccountDto(
                x.Id,
                x.Name,
                x.Type,
                x.OpeningBalance,
                x.CurrentBalance,
                x.InstitutionName,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create(CreateAccountRequest request, CancellationToken cancellationToken)
    {
        if (request.OpeningBalance < 0)
        {
            return BadRequest(new { message = "Opening balance cannot be negative." });
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            Name = request.Name.Trim(),
            Type = request.Type.Trim().ToLowerInvariant(),
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,
            InstitutionName = string.IsNullOrWhiteSpace(request.InstitutionName) ? null : request.InstitutionName.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            LastUpdatedAtUtc = DateTime.UtcNow,
        };

        dbContext.Accounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new AccountDto(
            account.Id,
            account.Name,
            account.Type,
            account.OpeningBalance,
            account.CurrentBalance,
            account.InstitutionName,
            account.CreatedAtUtc));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Update(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (account is null)
        {
            return NotFound();
        }

        account.Name = request.Name.Trim();
        account.Type = request.Type.Trim().ToLowerInvariant();
        account.InstitutionName = string.IsNullOrWhiteSpace(request.InstitutionName) ? null : request.InstitutionName.Trim();
        account.LastUpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new AccountDto(
            account.Id,
            account.Name,
            account.Type,
            account.OpeningBalance,
            account.CurrentBalance,
            account.InstitutionName,
            account.CreatedAtUtc));
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(AccountTransferRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Transfer amount must be greater than zero." });
        }

        if (request.FromAccountId == request.ToAccountId)
        {
            return BadRequest(new { message = "Transfer requires two different accounts." });
        }

        var accounts = await dbContext.Accounts
            .Where(x =>
                x.UserId == userContext.UserId &&
                (x.Id == request.FromAccountId || x.Id == request.ToAccountId))
            .ToListAsync(cancellationToken);

        var fromAccount = accounts.FirstOrDefault(x => x.Id == request.FromAccountId);
        var toAccount = accounts.FirstOrDefault(x => x.Id == request.ToAccountId);

        if (fromAccount is null || toAccount is null)
        {
            return BadRequest(new { message = "One or both transfer accounts were not found." });
        }

        fromAccount.CurrentBalance -= request.Amount;
        fromAccount.LastUpdatedAtUtc = DateTime.UtcNow;
        toAccount.CurrentBalance += request.Amount;
        toAccount.LastUpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
