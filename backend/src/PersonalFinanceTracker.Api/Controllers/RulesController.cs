using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Rules;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/rules")]
public sealed class RulesController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RuleDto>>> Get(CancellationToken cancellationToken)
    {
        var rules = await dbContext.Rules
            .Where(x => x.UserId == userContext.UserId)
            .OrderByDescending(x => x.Priority)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Ok(rules.Select(Map).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<RuleDto>> Create(UpsertRuleRequest request, CancellationToken cancellationToken)
    {
        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        var now = DateTime.UtcNow;
        var rule = new Rule
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            Name = request.Name.Trim(),
            IsEnabled = request.IsEnabled,
            Priority = request.Priority,
            ConditionsJson = JsonSerializer.Serialize(request.Conditions, JsonOptions),
            ActionsJson = JsonSerializer.Serialize(request.Actions, JsonOptions),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        dbContext.Rules.Add(rule);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(Map(rule));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RuleDto>> Update(Guid id, UpsertRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = await dbContext.Rules
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (rule is null)
        {
            return NotFound();
        }

        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        rule.Name = request.Name.Trim();
        rule.IsEnabled = request.IsEnabled;
        rule.Priority = request.Priority;
        rule.ConditionsJson = JsonSerializer.Serialize(request.Conditions, JsonOptions);
        rule.ActionsJson = JsonSerializer.Serialize(request.Actions, JsonOptions);
        rule.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(Map(rule));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var rule = await dbContext.Rules
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (rule is null)
        {
            return NotFound();
        }

        dbContext.Rules.Remove(rule);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<ObjectResult?> ValidateRequestAsync(UpsertRuleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Rule name is required." });
        }

        if (request.Conditions.Count == 0)
        {
            return BadRequest(new { message = "At least one condition is required." });
        }

        if (request.Actions.Count == 0)
        {
            return BadRequest(new { message = "At least one action is required." });
        }

        var normalizedConditions = request.Conditions
            .Select(x => new RuleConditionDto(x.Field.Trim().ToLowerInvariant(), x.Operator.Trim().ToLowerInvariant(), x.Value.Trim()))
            .ToList();

        foreach (var condition in normalizedConditions)
        {
            if (string.IsNullOrWhiteSpace(condition.Value))
            {
                return BadRequest(new { message = "Condition values cannot be empty." });
            }

            var valid = condition.Field switch
            {
                "merchant" => condition.Operator is "contains" or "equals",
                "type" => condition.Operator == "equals" && condition.Value is "income" or "expense" or "transfer",
                "category" => condition.Operator == "equals" && Guid.TryParse(condition.Value, out _),
                "amount" => (condition.Operator is "greater_than" or "less_than" or "equals") && decimal.TryParse(condition.Value, out _),
                _ => false,
            };

            if (!valid)
            {
                return BadRequest(new { message = $"Invalid condition: {condition.Field} {condition.Operator}." });
            }
        }

        foreach (var action in request.Actions)
        {
            var normalizedType = action.Type.Trim().ToLowerInvariant();

            if (normalizedType == "set_category")
            {
                if (!Guid.TryParse(action.Value, out var categoryId))
                {
                    return BadRequest(new { message = "Set category actions require a valid category." });
                }

                var category = await dbContext.Categories.FirstOrDefaultAsync(
                    x => x.Id == categoryId && x.UserId == userContext.UserId && !x.IsArchived,
                    cancellationToken);

                if (category is null)
                {
                    return BadRequest(new { message = "One of the rule categories was not found." });
                }

                continue;
            }

            if (normalizedType == "add_tag")
            {
                if (string.IsNullOrWhiteSpace(action.Value))
                {
                    return BadRequest(new { message = "Add tag actions require a tag value." });
                }

                continue;
            }

            if (normalizedType != "flag_review")
            {
                return BadRequest(new { message = $"Unsupported action type: {action.Type}." });
            }
        }

        return null;
    }

    private static RuleDto Map(Rule rule)
    {
        var conditions = JsonSerializer.Deserialize<List<RuleConditionDto>>(rule.ConditionsJson, JsonOptions) ?? [];
        var actions = JsonSerializer.Deserialize<List<RuleActionDto>>(rule.ActionsJson, JsonOptions) ?? [];

        return new RuleDto(
            rule.Id,
            rule.Name,
            rule.IsEnabled,
            rule.Priority,
            conditions,
            actions,
            rule.CreatedAtUtc,
            rule.UpdatedAtUtc);
    }
}
