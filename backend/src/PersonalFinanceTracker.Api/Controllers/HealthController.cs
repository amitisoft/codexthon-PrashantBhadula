using Microsoft.AspNetCore.Mvc;

namespace PersonalFinanceTracker.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        Ok(new
        {
            status = "ok",
            service = "Fitra API",
        });
}
