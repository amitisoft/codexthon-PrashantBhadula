using PersonalFinanceTracker.Application.DTOs.Auth;
using PersonalFinanceTracker.Domain.Entities;

namespace PersonalFinanceTracker.Application.Interfaces;

public interface IJwtTokenService
{
    AuthResponse CreateAuthResponse(User user, UserSettings settings);
}
