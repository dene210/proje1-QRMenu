using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.Features.Menu.Queries;
using System.Security.Claims;

namespace QRMenu.API.Controllers;

[ApiController]
[Authorize]
public abstract class BaseAuthorizedController : ControllerBase
{
    protected readonly IMediator _mediator;

    protected BaseAuthorizedController(IMediator mediator)
    {
        _mediator = mediator;
    }

    protected async Task<bool> IsAuthorizedForRestaurantAsync(string restaurantSlug)
    {
        // SuperAdmin can access all restaurants
        var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value == "True";
        if (isSuperAdmin)
        {
            return true;
        }

        // Restaurant admin can only access their own restaurant
        var userRestaurantId = User.FindFirst("RestaurantId")?.Value;
        if (string.IsNullOrEmpty(userRestaurantId))
        {
            return false;
        }

        // Get restaurant by slug and check if user's restaurant matches
        var query = new GetMenuAdminQuery { RestaurantSlug = restaurantSlug };
        try
        {
            var restaurant = await _mediator.Send(query);
            return restaurant.Id.ToString() == userRestaurantId;
        }
        catch
        {
            return false;
        }
    }

    protected bool IsSuperAdmin()
    {
        return User.FindFirst("IsSuperAdmin")?.Value == "True";
    }

    protected int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out int userId) ? userId : 0;
    }

    protected string? GetCurrentUserRestaurantId()
    {
        return User.FindFirst("RestaurantId")?.Value;
    }
} 