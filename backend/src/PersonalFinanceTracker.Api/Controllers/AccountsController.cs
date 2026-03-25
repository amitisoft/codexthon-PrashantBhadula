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
public sealed class AccountsController(
    ApplicationDbContext dbContext,
    IUserContext userContext,
    IAccountAccessService accountAccessService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> Get(CancellationToken cancellationToken)
    {
        var visibleAccountIds = await accountAccessService.GetVisibleAccountIdsAsync(userContext.UserId, cancellationToken);
        var accounts = await dbContext.Accounts
            .Where(x => visibleAccountIds.Contains(x.Id))
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(await BuildAccountDtosAsync(accounts, cancellationToken));
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
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, account.Id, "created", "account", account.Id, $"{account.Name} account was created.", cancellationToken);

        return Ok((await BuildAccountDtosAsync([account], cancellationToken)).Single());
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
        return Ok((await BuildAccountDtosAsync([account], cancellationToken)).Single());
    }

    [HttpPost("{id:guid}/share")]
    public async Task<ActionResult<AccountDto>> Share(Guid id, ShareAccountRequest request, CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userContext.UserId,
            cancellationToken);

        if (account is null)
        {
            return NotFound();
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "A valid email is required." });
        }

        var role = request.Role.Trim().ToLowerInvariant();
        if (role is not ("viewer" or "editor"))
        {
            return BadRequest(new { message = "Role must be either viewer or editor." });
        }

        var memberUser = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (memberUser is null)
        {
            return BadRequest(new { message = "That user does not exist yet. Ask them to sign up first." });
        }

        if (memberUser.Id == userContext.UserId)
        {
            return BadRequest(new { message = "You already own this account." });
        }

        var membership = await dbContext.AccountMembers.FirstOrDefaultAsync(
            x => x.AccountId == id && x.UserId == memberUser.Id,
            cancellationToken);

        if (membership is null)
        {
            membership = new AccountMember
            {
                Id = Guid.NewGuid(),
                AccountId = id,
                UserId = memberUser.Id,
                Role = role,
                AddedByUserId = userContext.UserId,
                CreatedAtUtc = DateTime.UtcNow,
            };

            dbContext.AccountMembers.Add(membership);
        }
        else
        {
            membership.Role = role;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, id, "shared", "account-member", membership.Id, $"{memberUser.DisplayName} was added to {account.Name} as {role}.", cancellationToken);
        return Ok((await BuildAccountDtosAsync([account], cancellationToken)).Single());
    }

    [HttpDelete("{id:guid}/members/{memberUserId:guid}")]
    public async Task<ActionResult<AccountDto>> RemoveMember(Guid id, Guid memberUserId, CancellationToken cancellationToken)
    {
        var account = await dbContext.Accounts.FirstOrDefaultAsync(
            x => x.Id == id && x.UserId == userContext.UserId,
            cancellationToken);

        if (account is null)
        {
            return NotFound();
        }

        var membership = await dbContext.AccountMembers.FirstOrDefaultAsync(
            x => x.AccountId == id && x.UserId == memberUserId,
            cancellationToken);

        if (membership is null)
        {
            return NotFound();
        }

        dbContext.AccountMembers.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, id, "unshared", "account-member", membership.Id, $"A member was removed from {account.Name}.", cancellationToken);

        return Ok((await BuildAccountDtosAsync([account], cancellationToken)).Single());
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

        var editableAccountIds = await accountAccessService.GetEditableAccountIdsAsync(userContext.UserId, cancellationToken);
        if (!editableAccountIds.Contains(request.FromAccountId) || !editableAccountIds.Contains(request.ToAccountId))
        {
            return BadRequest(new { message = "One or both transfer accounts are not editable for this user." });
        }

        var accounts = await dbContext.Accounts
            .Where(x => x.Id == request.FromAccountId || x.Id == request.ToAccountId)
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
        await HttpContext.RequestServices.GetRequiredService<IActivityLogService>()
            .LogAsync(userContext.UserId, userContext.UserId, fromAccount.Id, "transfer", "account", fromAccount.Id, $"Rs {request.Amount:N0} was transferred from {fromAccount.Name} to {toAccount.Name}.", cancellationToken);
        return NoContent();
    }

    private async Task<IReadOnlyList<AccountDto>> BuildAccountDtosAsync(
        IReadOnlyCollection<Account> accounts,
        CancellationToken cancellationToken)
    {
        if (accounts.Count == 0)
        {
            return [];
        }

        var accountIds = accounts.Select(x => x.Id).ToHashSet();
        var ownerIds = accounts.Select(x => x.UserId).ToHashSet();
        var memberships = await dbContext.AccountMembers
            .Where(x => accountIds.Contains(x.AccountId))
            .ToListAsync(cancellationToken);

        foreach (var membership in memberships)
        {
            ownerIds.Add(membership.UserId);
            ownerIds.Add(membership.AddedByUserId);
        }

        var users = await dbContext.Users
            .Where(x => ownerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        return accounts
            .Select(account =>
            {
                var owner = users[account.UserId];
                var memberDtos = new List<AccountMemberDto>
                {
                    new(
                        owner.Id,
                        owner.DisplayName,
                        owner.Email,
                        "owner",
                        true,
                        account.CreatedAtUtc)
                };

                memberDtos.AddRange(
                    memberships
                        .Where(x => x.AccountId == account.Id)
                        .OrderBy(x => x.CreatedAtUtc)
                        .Select(member =>
                        {
                            var memberUser = users[member.UserId];
                            return new AccountMemberDto(
                                memberUser.Id,
                                memberUser.DisplayName,
                                memberUser.Email,
                                member.Role,
                                false,
                                member.CreatedAtUtc);
                        }));

                var isOwner = account.UserId == userContext.UserId;
                var accessRole = isOwner
                    ? "owner"
                    : memberships.FirstOrDefault(x => x.AccountId == account.Id && x.UserId == userContext.UserId)?.Role ?? "viewer";

                return new AccountDto(
                    account.Id,
                    account.Name,
                    account.Type,
                    account.OpeningBalance,
                    account.CurrentBalance,
                    account.InstitutionName,
                    account.CreatedAtUtc,
                    memberDtos.Count > 1,
                    isOwner,
                    accessRole,
                    memberDtos);
            })
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToList();
    }
}
