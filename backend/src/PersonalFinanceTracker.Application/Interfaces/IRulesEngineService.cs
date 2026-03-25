using PersonalFinanceTracker.Application.DTOs.Rules;
using PersonalFinanceTracker.Application.DTOs.Transactions;

namespace PersonalFinanceTracker.Application.Interfaces;

public interface IRulesEngineService
{
    Task<RuleEvaluationResult> ApplyAsync(Guid userId, CreateTransactionRequest request, CancellationToken cancellationToken = default);
}

public sealed record RuleEvaluationResult(
    CreateTransactionRequest Request,
    IReadOnlyList<string> AppliedRuleNames,
    bool NeedsReview);
