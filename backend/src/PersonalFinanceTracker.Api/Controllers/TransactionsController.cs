using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Transactions;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/transactions")]
public sealed class TransactionsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    private const string TransferTagPrefix = "transfer:";

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> Get(
        [FromQuery] TransactionQueryRequest request,
        CancellationToken cancellationToken)
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

        if (request.CategoryId is not null)
        {
            query = query.Where(x => x.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            var normalizedType = request.Type.Trim().ToLowerInvariant();
            query = query.Where(x => x.Type == normalizedType);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var normalizedSearch = request.Search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                (x.Merchant != null && x.Merchant.ToLower().Contains(normalizedSearch)) ||
                (x.Note != null && x.Note.ToLower().Contains(normalizedSearch)));
        }

        var transactions = await query
            .OrderByDescending(x => x.TransactionDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (request.AccountId is not null)
        {
            transactions = transactions
                .Where(x => x.AccountId == request.AccountId.Value || ParseDestinationAccountId(x.Tags) == request.AccountId.Value)
                .ToList();
        }

        transactions = transactions.Take(100).ToList();

        return Ok(transactions.Select(MapTransaction).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var transaction = await dbContext.Transactions
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (transaction is null)
        {
            return NotFound();
        }

        return Ok(MapTransaction(transaction));
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            AccountId = request.AccountId,
            CategoryId = request.CategoryId,
            Type = request.Type.Trim().ToLowerInvariant(),
            Amount = request.Amount,
            TransactionDate = request.TransactionDate,
            Merchant = Normalize(request.Merchant),
            Note = Normalize(request.Note),
            PaymentMethod = Normalize(request.PaymentMethod),
            Tags = BuildTags(request.Tags, request.DestinationAccountId),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        await ApplyTransactionImpactAsync(transaction, cancellationToken);
        dbContext.Transactions.Add(transaction);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapTransaction(transaction));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Update(Guid id, CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        var transaction = await dbContext.Transactions
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (transaction is null)
        {
            return NotFound();
        }

        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        await ReverseTransactionImpactAsync(transaction, cancellationToken);

        transaction.AccountId = request.AccountId;
        transaction.CategoryId = request.CategoryId;
        transaction.Type = request.Type.Trim().ToLowerInvariant();
        transaction.Amount = request.Amount;
        transaction.TransactionDate = request.TransactionDate;
        transaction.Merchant = Normalize(request.Merchant);
        transaction.Note = Normalize(request.Note);
        transaction.PaymentMethod = Normalize(request.PaymentMethod);
        transaction.Tags = BuildTags(request.Tags, request.DestinationAccountId);
        transaction.UpdatedAtUtc = DateTime.UtcNow;

        await ApplyTransactionImpactAsync(transaction, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapTransaction(transaction));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var transaction = await dbContext.Transactions
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (transaction is null)
        {
            return NotFound();
        }

        await ReverseTransactionImpactAsync(transaction, cancellationToken);
        dbContext.Transactions.Remove(transaction);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<ObjectResult?> ValidateRequestAsync(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero." });
        }

        var normalizedType = request.Type.Trim().ToLowerInvariant();
        if (normalizedType is not ("income" or "expense" or "transfer"))
        {
            return BadRequest(new { message = "Transaction type must be income, expense, or transfer." });
        }

        var account = await dbContext.Accounts
            .FirstOrDefaultAsync(x => x.Id == request.AccountId && x.UserId == userContext.UserId, cancellationToken);

        if (account is null)
        {
            return BadRequest(new { message = "Account was not found." });
        }

        if (normalizedType == "transfer")
        {
            if (request.DestinationAccountId is null)
            {
                return BadRequest(new { message = "Transfer destination account is required." });
            }

            if (request.DestinationAccountId == request.AccountId)
            {
                return BadRequest(new { message = "Transfer destination must be different from the source account." });
            }

            var destinationExists = await dbContext.Accounts.AnyAsync(
                x => x.Id == request.DestinationAccountId.Value && x.UserId == userContext.UserId,
                cancellationToken);

            if (!destinationExists)
            {
                return BadRequest(new { message = "Destination account was not found." });
            }
        }
        else if (request.CategoryId is null)
        {
            return BadRequest(new { message = "Category is required for income and expense transactions." });
        }

        if (request.CategoryId is not null)
        {
            var category = await dbContext.Categories.FirstOrDefaultAsync(
                x => x.Id == request.CategoryId && x.UserId == userContext.UserId && !x.IsArchived,
                cancellationToken);

            if (category is null)
            {
                return BadRequest(new { message = "Category was not found." });
            }

            if (normalizedType != "transfer" && category.Type != normalizedType)
            {
                return BadRequest(new { message = "Category type must match the transaction type." });
            }
        }

        return null;
    }

    private async Task ApplyTransactionImpactAsync(Transaction transaction, CancellationToken cancellationToken)
    {
        var sourceAccount = await dbContext.Accounts
            .FirstAsync(x => x.Id == transaction.AccountId && x.UserId == userContext.UserId, cancellationToken);

        if (transaction.Type == "income")
        {
            sourceAccount.CurrentBalance += transaction.Amount;
        }
        else
        {
            sourceAccount.CurrentBalance -= transaction.Amount;
        }

        sourceAccount.LastUpdatedAtUtc = DateTime.UtcNow;

        var destinationAccountId = ParseDestinationAccountId(transaction.Tags);
        if (transaction.Type == "transfer" && destinationAccountId is not null)
        {
            var destinationAccount = await dbContext.Accounts
                .FirstAsync(x => x.Id == destinationAccountId.Value && x.UserId == userContext.UserId, cancellationToken);

            destinationAccount.CurrentBalance += transaction.Amount;
            destinationAccount.LastUpdatedAtUtc = DateTime.UtcNow;
        }
    }

    private async Task ReverseTransactionImpactAsync(Transaction transaction, CancellationToken cancellationToken)
    {
        var sourceAccount = await dbContext.Accounts
            .FirstAsync(x => x.Id == transaction.AccountId && x.UserId == userContext.UserId, cancellationToken);

        if (transaction.Type == "income")
        {
            sourceAccount.CurrentBalance -= transaction.Amount;
        }
        else
        {
            sourceAccount.CurrentBalance += transaction.Amount;
        }

        sourceAccount.LastUpdatedAtUtc = DateTime.UtcNow;

        var destinationAccountId = ParseDestinationAccountId(transaction.Tags);
        if (transaction.Type == "transfer" && destinationAccountId is not null)
        {
            var destinationAccount = await dbContext.Accounts
                .FirstAsync(x => x.Id == destinationAccountId.Value && x.UserId == userContext.UserId, cancellationToken);

            destinationAccount.CurrentBalance -= transaction.Amount;
            destinationAccount.LastUpdatedAtUtc = DateTime.UtcNow;
        }
    }

    private static TransactionDto MapTransaction(Transaction transaction)
    {
        return new TransactionDto(
            transaction.Id,
            transaction.AccountId,
            ParseDestinationAccountId(transaction.Tags),
            transaction.CategoryId,
            transaction.Type,
            transaction.Amount,
            transaction.TransactionDate,
            transaction.Merchant,
            transaction.Note,
            transaction.PaymentMethod,
            FilterUserTags(transaction.Tags),
            transaction.CreatedAtUtc);
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string[] BuildTags(IEnumerable<string>? tags, Guid? destinationAccountId)
    {
        var result = tags?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Where(x => !x.StartsWith(TransferTagPrefix, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

        if (destinationAccountId is not null)
        {
            result.Add($"{TransferTagPrefix}{destinationAccountId.Value:D}");
        }

        return [.. result];
    }

    private static Guid? ParseDestinationAccountId(IEnumerable<string>? tags)
    {
        var rawValue = tags?.FirstOrDefault(x => x.StartsWith(TransferTagPrefix, StringComparison.OrdinalIgnoreCase));
        if (rawValue is null)
        {
            return null;
        }

        var idValue = rawValue[TransferTagPrefix.Length..];
        return Guid.TryParse(idValue, out var destinationAccountId) ? destinationAccountId : null;
    }

    private static string[] FilterUserTags(IEnumerable<string>? tags)
        => tags?.Where(x => !x.StartsWith(TransferTagPrefix, StringComparison.OrdinalIgnoreCase)).ToArray() ?? [];
}
