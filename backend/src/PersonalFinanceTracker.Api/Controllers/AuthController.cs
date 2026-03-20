using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Auth;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    ApplicationDbContext dbContext,
    DatabaseInitializer databaseInitializer,
    IJwtTokenService jwtTokenService,
    IEmailSender emailSender,
    IUserContext userContext,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken))
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        };

        var settings = new UserSettings
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            CurrencyCode = "INR",
            Locale = "en-IN",
            TimeZone = "Asia/Kolkata",
        };

        dbContext.Users.Add(user);
        dbContext.UserSettings.Add(settings);
        await dbContext.SaveChangesAsync(cancellationToken);
        await databaseInitializer.SeedDefaultCategoriesForUserAsync(user.Id, cancellationToken);

        var authResponse = jwtTokenService.CreateAuthResponse(user, settings);
        return Ok(authResponse);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var settings = await dbContext.UserSettings.FirstAsync(x => x.UserId == user.Id, cancellationToken);
        var authResponse = jwtTokenService.CreateAuthResponse(user, settings);
        return Ok(authResponse);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken cancellationToken)
    {
        var refreshToken = await dbContext.RefreshTokens
            .Where(x => x.Token == request.RefreshToken && x.RevokedAtUtc == null && x.ExpiresAtUtc > DateTime.UtcNow)
            .FirstOrDefaultAsync(cancellationToken);

        if (refreshToken is null)
        {
            return Unauthorized(new { message = "Refresh token is invalid or expired." });
        }

        refreshToken.RevokedAtUtc = DateTime.UtcNow;

        var user = await dbContext.Users.FirstAsync(x => x.Id == refreshToken.UserId, cancellationToken);
        var settings = await dbContext.UserSettings.FirstAsync(x => x.UserId == user.Id, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var authResponse = jwtTokenService.CreateAuthResponse(user, settings);
        return Ok(authResponse);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null)
        {
            return Ok();
        }

        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        dbContext.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        var frontendBaseUrl = configuration["App:FrontendBaseUrl"] ?? "http://localhost:5173";
        var resetLink = $"{frontendBaseUrl}/auth/reset-password?token={Uri.EscapeDataString(rawToken)}";
        await emailSender.SendPasswordResetAsync(user.Email, user.DisplayName, resetLink, cancellationToken);

        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Token)));
        var resetToken = await dbContext.PasswordResetTokens
            .Where(x => x.TokenHash == tokenHash && x.UsedAtUtc == null && x.ExpiresAtUtc > DateTime.UtcNow)
            .FirstOrDefaultAsync(cancellationToken);

        if (resetToken is null)
        {
            return BadRequest(new { message = "Reset token is invalid or expired." });
        }

        var user = await dbContext.Users.FirstAsync(x => x.Id == resetToken.UserId, cancellationToken);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        resetToken.UsedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me(CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstAsync(x => x.Id == userContext.UserId, cancellationToken);
        var settings = await dbContext.UserSettings.FirstAsync(x => x.UserId == user.Id, cancellationToken);

        return Ok(new AuthUserDto(user.Id, user.Email, user.DisplayName, settings.CurrencyCode, settings.Locale));
    }
}
