using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Categories;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/categories")]
public sealed class CategoriesController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> Get([FromQuery] bool includeArchived, CancellationToken cancellationToken)
    {
        var query = dbContext.Categories.Where(x => x.UserId == userContext.UserId);
        if (!includeArchived)
        {
            query = query.Where(x => !x.IsArchived);
        }

        var categories = await query
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryDto(x.Id, x.Name, x.Type, x.Color, x.Icon, x.IsArchived))
            .ToListAsync(cancellationToken);

        return Ok(categories);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create(UpsertCategoryRequest request, CancellationToken cancellationToken)
    {
        var normalizedType = request.Type.Trim().ToLowerInvariant();
        var archivedMatch = await dbContext.Categories.FirstOrDefaultAsync(
            x => x.UserId == userContext.UserId &&
                 x.IsArchived &&
                 x.Type == normalizedType &&
                 x.Name.ToLower() == request.Name.Trim().ToLower(),
            cancellationToken);

        if (archivedMatch is not null)
        {
            archivedMatch.IsArchived = false;
            archivedMatch.Color = Normalize(request.Color);
            archivedMatch.Icon = Normalize(request.Icon);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(Map(archivedMatch));
        }

        var validationError = await ValidateRequestAsync(request, cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        var category = new Domain.Entities.Category
        {
            Id = Guid.NewGuid(),
            UserId = userContext.UserId,
            Name = request.Name.Trim(),
            Type = request.Type.Trim().ToLowerInvariant(),
            Color = Normalize(request.Color),
            Icon = Normalize(request.Icon),
            IsArchived = false,
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(Map(category));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> Update(Guid id, UpsertCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (category is null)
        {
            return NotFound();
        }

        var validationError = await ValidateRequestAsync(request, cancellationToken, id);
        if (validationError is not null)
        {
            return validationError;
        }

        category.Name = request.Name.Trim();
        category.Type = request.Type.Trim().ToLowerInvariant();
        category.Color = Normalize(request.Color);
        category.Icon = Normalize(request.Icon);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(Map(category));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userContext.UserId, cancellationToken);

        if (category is null)
        {
            return NotFound();
        }

        category.IsArchived = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<BadRequestObjectResult?> ValidateRequestAsync(
        UpsertCategoryRequest request,
        CancellationToken cancellationToken,
        Guid? categoryId = null)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Category name is required." });
        }

        var normalizedType = request.Type.Trim().ToLowerInvariant();
        if (normalizedType is not ("income" or "expense"))
        {
            return BadRequest(new { message = "Category type must be income or expense." });
        }

        var exists = await dbContext.Categories.AnyAsync(
            x => x.UserId == userContext.UserId &&
                 x.Id != categoryId &&
                 !x.IsArchived &&
                 x.Type == normalizedType &&
                 x.Name.ToLower() == request.Name.Trim().ToLower(),
            cancellationToken);

        if (exists)
        {
            return BadRequest(new { message = "A category with this name already exists for the selected type." });
        }

        return null;
    }

    private static CategoryDto Map(Domain.Entities.Category category)
        => new(category.Id, category.Name, category.Type, category.Color, category.Icon, category.IsArchived);

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
