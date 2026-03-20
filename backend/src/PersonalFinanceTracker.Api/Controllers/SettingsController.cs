using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Settings;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/settings")]
public sealed class SettingsController(ApplicationDbContext dbContext, IUserContext userContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<UserSettingsDto>> Get(CancellationToken cancellationToken)
    {
        var settings = await dbContext.UserSettings.FirstAsync(x => x.UserId == userContext.UserId, cancellationToken);
        return Ok(new UserSettingsDto(settings.CurrencyCode, settings.Locale, settings.TimeZone));
    }

    [HttpPut]
    public async Task<ActionResult<UserSettingsDto>> Update(
        UpdateUserSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var settings = await dbContext.UserSettings.FirstAsync(x => x.UserId == userContext.UserId, cancellationToken);

        settings.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        settings.Locale = request.Locale.Trim();
        settings.TimeZone = request.TimeZone.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new UserSettingsDto(settings.CurrencyCode, settings.Locale, settings.TimeZone));
    }
}
