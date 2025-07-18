using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.DTOs;
using QRMenu.Application.Features.Statistics.Queries;
using MediatR;

namespace QRMenu.API.Controllers;

[Route("api/[controller]")]
public class StatisticsController : BaseAuthorizedController
{
    public StatisticsController(IMediator mediator) : base(mediator)
    {
    }

    [HttpGet("{restaurantSlug}/daily-access")]
    public async Task<ActionResult<List<DailyAccessStatsDto>>> GetDailyAccessStats(string restaurantSlug, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] int? tableId)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var query = new GetDailyAccessStatsQuery
        {
            RestaurantSlug = restaurantSlug,
            StartDate = startDate,
            EndDate = endDate,
            TableId = tableId
        };
        return Ok(await _mediator.Send(query));
    }
    
    [HttpGet("{restaurantSlug}/qr-access")]
    public async Task<ActionResult<HourlyAccessStatsDto>> GetHourlyAccessStats(string restaurantSlug, [FromQuery] DateTime date, [FromQuery] int? tableId)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var query = new GetHourlyAccessStatsQuery
        {
            RestaurantSlug = restaurantSlug,
            Date = date,
            TableId = tableId
        };
        return Ok(await _mediator.Send(query));
    }
} 