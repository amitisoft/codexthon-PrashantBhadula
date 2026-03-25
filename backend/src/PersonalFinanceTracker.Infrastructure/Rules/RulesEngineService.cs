using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Rules;
using PersonalFinanceTracker.Application.DTOs.Transactions;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Rules;

public sealed class RulesEngineService(ApplicationDbContext dbContext) : IRulesEngineService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<RuleEvaluationResult> ApplyAsync(
        Guid userId,
        CreateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.Equals(request.Type, "transfer", StringComparison.OrdinalIgnoreCase))
        {
            return new RuleEvaluationResult(request, [], false);
        }

        var rules = await dbContext.Rules
            .Where(x => x.UserId == userId && x.IsEnabled)
            .OrderByDescending(x => x.Priority)
            .ThenBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (rules.Count == 0)
        {
            return new RuleEvaluationResult(request, [], false);
        }

        var tags = request.Tags?.ToList() ?? [];
        var appliedRuleNames = new List<string>();
        var categoryId = request.CategoryId;
        var needsReview = false;
        var categoryAssignedByRule = false;

        foreach (var rule in rules)
        {
            var conditions = DeserializeConditions(rule.ConditionsJson);
            if (!conditions.All(condition => Matches(condition, request)))
            {
                continue;
            }

            var actions = DeserializeActions(rule.ActionsJson);
            var matched = false;

            foreach (var action in actions)
            {
                if (ApplyAction(action, request, ref categoryId, ref categoryAssignedByRule, tags, ref needsReview))
                {
                    matched = true;
                }
            }

            if (matched)
            {
                appliedRuleNames.Add(rule.Name);
            }
        }

        return new RuleEvaluationResult(
            request with
            {
                CategoryId = categoryId,
                Tags = tags
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
            },
            appliedRuleNames,
            needsReview);
    }

    private static bool ApplyAction(
        RuleActionDto action,
        CreateTransactionRequest request,
        ref Guid? categoryId,
        ref bool categoryAssignedByRule,
        ICollection<string> tags,
        ref bool needsReview)
    {
        var normalizedType = action.Type.Trim().ToLowerInvariant();

        if (normalizedType == "set_category"
            && request.CategoryId is null
            && !categoryAssignedByRule
            && Guid.TryParse(action.Value, out var parsedCategoryId))
        {
            categoryId = parsedCategoryId;
            categoryAssignedByRule = true;
            return true;
        }

        if (normalizedType == "add_tag" && !string.IsNullOrWhiteSpace(action.Value))
        {
            tags.Add(action.Value.Trim());
            return true;
        }

        if (normalizedType == "flag_review")
        {
            needsReview = true;
            return true;
        }

        return false;
    }

    private static bool Matches(RuleConditionDto condition, CreateTransactionRequest request)
    {
        var field = condition.Field.Trim().ToLowerInvariant();
        var op = condition.Operator.Trim().ToLowerInvariant();
        var value = condition.Value.Trim();

        return field switch
        {
            "merchant" => MatchesText(request.Merchant, op, value),
            "type" => MatchesText(request.Type, op, value),
            "category" => MatchesGuid(request.CategoryId, op, value),
            "amount" => MatchesAmount(request.Amount, op, value),
            _ => false,
        };
    }

    private static bool MatchesText(string? input, string op, string value)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        return op switch
        {
            "contains" => input.Contains(value, StringComparison.OrdinalIgnoreCase),
            "equals" => string.Equals(input.Trim(), value, StringComparison.OrdinalIgnoreCase),
            _ => false,
        };
    }

    private static bool MatchesGuid(Guid? input, string op, string value)
    {
        if (op != "equals" || input is null || !Guid.TryParse(value, out var target))
        {
            return false;
        }

        return input.Value == target;
    }

    private static bool MatchesAmount(decimal input, string op, string value)
    {
        if (!decimal.TryParse(value, out var target))
        {
            return false;
        }

        return op switch
        {
            "greater_than" => input > target,
            "less_than" => input < target,
            "equals" => input == target,
            _ => false,
        };
    }

    private static IReadOnlyList<RuleConditionDto> DeserializeConditions(string json)
        => JsonSerializer.Deserialize<List<RuleConditionDto>>(json, JsonOptions) ?? [];

    private static IReadOnlyList<RuleActionDto> DeserializeActions(string json)
        => JsonSerializer.Deserialize<List<RuleActionDto>>(json, JsonOptions) ?? [];
}
