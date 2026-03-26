using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PersonalFinanceTracker.Api.Auth;
using PersonalFinanceTracker.Application.Interfaces;
using PersonalFinanceTracker.Infrastructure.Access;
using PersonalFinanceTracker.Infrastructure.Activity;
using PersonalFinanceTracker.Infrastructure.Analytics;
using PersonalFinanceTracker.Infrastructure.Auth;
using PersonalFinanceTracker.Infrastructure.Automation;
using PersonalFinanceTracker.Infrastructure.Backups;
using PersonalFinanceTracker.Infrastructure.Email;
using PersonalFinanceTracker.Infrastructure.Persistence;
using PersonalFinanceTracker.Infrastructure.Rules;
using System.Threading.RateLimiting;

namespace PersonalFinanceTracker.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        var jwtKey = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var allowedOrigins = BuildAllowedOrigins(configuration);

        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddHttpContextAccessor();
        services.AddHttpClient();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddFixedWindowLimiter("auth", limiterOptions =>
            {
                limiterOptions.PermitLimit = 8;
                limiterOptions.Window = TimeSpan.FromMinutes(1);
                limiterOptions.QueueLimit = 0;
                limiterOptions.AutoReplenishment = true;
            });
        });
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .SetIsOriginAllowed(origin => IsAllowedOrigin(origin, allowedOrigins))
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });
        services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<DatabaseInitializer>();
        services.AddScoped<IAccountAccessService, AccountAccessService>();
        services.AddScoped<IActivityLogService, ActivityLogService>();
        services.AddScoped<IProductEventService, ProductEventService>();
        services.AddScoped<IUserContext, HttpUserContext>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRulesEngineService, RulesEngineService>();
        services.AddScoped<IEmailSender, ResendEmailSender>();
        services.AddHostedService<RecurringAutomationService>();
        services.AddHostedService<JsonBackupService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            });

        services.AddAuthorization();

        return services;
    }

    private static string[] BuildAllowedOrigins(IConfiguration configuration)
    {
        var origins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        };

        var configuredFrontendUrl = configuration["App:FrontendBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredFrontendUrl))
        {
            origins.Add(configuredFrontendUrl.TrimEnd('/'));
        }

        return origins.ToArray();
    }

    private static bool IsAllowedOrigin(string? origin, IReadOnlyCollection<string> allowedOrigins)
    {
        if (string.IsNullOrWhiteSpace(origin))
        {
            return false;
        }

        if (allowedOrigins.Contains(origin))
        {
            return true;
        }

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.Scheme is "http" or "https"
            && (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
                || string.Equals(uri.Host, "127.0.0.1", StringComparison.OrdinalIgnoreCase));
    }

    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Fitra API",
                Version = "v1",
                Description = "API for Fitra, a modern way to manage money.",
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Enter a bearer token to access protected endpoints.",
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer",
                        },
                    },
                    Array.Empty<string>()
                },
            });
        });

        return services;
    }
}
