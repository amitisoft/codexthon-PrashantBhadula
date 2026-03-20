using PersonalFinanceTracker.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiServices(builder.Configuration)
    .AddSwaggerDocumentation();

var app = builder.Build();

await app.InitializeDatabaseAsync();

app.UseApiPipeline();

app.Run();
