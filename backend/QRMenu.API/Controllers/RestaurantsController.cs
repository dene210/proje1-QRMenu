using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.DTOs;
using QRMenu.Application.Features.Restaurants.Commands;
using QRMenu.Application.Features.Restaurants.Queries;
using QRMenu.Application.Features.Users.Commands;
using MediatR;

namespace QRMenu.API.Controllers;

[Route("api/[controller]")]
public class RestaurantsController : BaseAuthorizedController
{
    public RestaurantsController(IMediator mediator) : base(mediator)
    {
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<RestaurantBriefDto>>> GetAll()
    {
        return Ok(await _mediator.Send(new GetAllRestaurantsPublicQuery()));
    }

    [HttpGet("admin/all")]
    public async Task<ActionResult<List<RestaurantBriefDto>>> GetAllForAdmin()
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can access this resource");
        }

        return Ok(await _mediator.Send(new GetAllRestaurantsAdminQuery()));
    }

    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] CreateRestaurantDto dto)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can create restaurants");
        }

        var command = new CreateRestaurantCommand { RestaurantDto = dto };
        return Ok(await _mediator.Send(command));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRestaurantDto dto)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can update restaurants");
        }

        var command = new UpdateRestaurantCommand { Id = id, RestaurantDto = dto };
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can delete restaurants");
        }

        await _mediator.Send(new DeleteRestaurantCommand { Id = id });
        return NoContent();
    }

    [HttpGet("{id}/users")]
    public async Task<ActionResult<List<UserDto>>> GetRestaurantUsers(int id)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can access restaurant users");
        }

        var result = await _mediator.Send(new GetUsersByRestaurantQuery { RestaurantId = id });
        return result.IsSuccess ? Ok(result.Data) : BadRequest(result.ErrorMessage);
    }
} 