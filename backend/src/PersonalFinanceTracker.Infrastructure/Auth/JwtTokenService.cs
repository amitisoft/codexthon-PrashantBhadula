using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PersonalFinanceTracker.Application.DTOs.Auth;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Domain.Entities;
using PersonalFinanceTracker.Infrastructure.Persistence;

namespace PersonalFinanceTracker.Infrastructure.Auth;

public sealed class JwtTokenService(IConfiguration configuration, ApplicationDbContext dbContext) : IJwtTokenService
{
    public AuthResponse CreateAuthResponse(User user, UserSettings settings)
    {
        var issuer = configuration["Jwt:Issuer"] ?? "personal-finance-tracker";
        var audience = configuration["Jwt:Audience"] ?? "personal-finance-tracker-client";
        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key is missing.");
        var accessTokenMinutes = int.TryParse(configuration["Jwt:AccessTokenMinutes"], out var minutes) ? minutes : 15;
        var refreshTokenDays = int.TryParse(configuration["Jwt:RefreshTokenDays"], out var days) ? days : 14;

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(accessTokenMinutes);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName),
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwt);
        var refreshTokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(refreshTokenDays),
        });

        dbContext.SaveChanges();

        return new AuthResponse(
            accessToken,
            refreshTokenValue,
            expiresAtUtc,
            new AuthUserDto(user.Id, user.Email, user.DisplayName, settings.CurrencyCode, settings.Locale));
    }
}
