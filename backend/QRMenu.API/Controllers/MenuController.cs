using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.DTOs;
using QRMenu.Application.Features.Menu.Commands;
using QRMenu.Application.Features.Menu.Queries;
using QRMenu.Application.Features.Tables.Commands;
using MediatR;

namespace QRMenu.API.Controllers;

[Route("api/[controller]")]
public class MenuController : BaseAuthorizedController
{
    public MenuController(IMediator mediator) : base(mediator)
    {
    }

    // Public endpoint for customers
    [AllowAnonymous] 
    [HttpGet("{restaurantSlug}/{qrCode}")]
    public async Task<ActionResult<RestaurantDetailDto>> GetMenuByQRCode(string restaurantSlug, string qrCode)
    {
        var query = new GetMenuPublicQuery { RestaurantSlug = restaurantSlug, QRCode = qrCode };
        return Ok(await _mediator.Send(query));
    }

    // Admin endpoint for menu management
    [HttpGet("admin/{restaurantSlug}")]
    public async Task<ActionResult<RestaurantDetailDto>> GetRestaurantForAdmin(string restaurantSlug)
    {
        // Check authorization
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var query = new GetMenuAdminQuery { RestaurantSlug = restaurantSlug };
        return Ok(await _mediator.Send(query));
    }

    [HttpPost("admin/{restaurantSlug}/categories")]
    public async Task<ActionResult<int>> AddCategory(string restaurantSlug, [FromBody] CreateCategoryDto dto)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new AddCategoryCommand { RestaurantSlug = restaurantSlug, CategoryDto = dto };
        return Ok(await _mediator.Send(command));
    }

    [HttpPut("admin/{restaurantSlug}/categories/{categoryId}")]
    public async Task<IActionResult> UpdateCategory(string restaurantSlug, int categoryId, [FromBody] UpdateCategoryDto dto)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new UpdateCategoryCommand { RestaurantSlug = restaurantSlug, CategoryId = categoryId, CategoryDto = dto };
        await _mediator.Send(command);
        return NoContent();
    }
    
    [HttpDelete("admin/{restaurantSlug}/categories/{categoryId}")]
    public async Task<IActionResult> DeleteCategory(string restaurantSlug, int categoryId)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new DeleteCategoryCommand { RestaurantSlug = restaurantSlug, CategoryId = categoryId };
        await _mediator.Send(command);
        return NoContent();
    }
    
    [HttpPost("admin/{restaurantSlug}/menu-items")]
    public async Task<ActionResult<int>> AddMenuItem(string restaurantSlug, [FromBody] CreateMenuItemDto dto)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new AddMenuItemCommand { RestaurantSlug = restaurantSlug, MenuItemDto = dto };
        return Ok(await _mediator.Send(command));
    }

    [HttpPut("admin/{restaurantSlug}/menu-items/{menuItemId}")]
    public async Task<IActionResult> UpdateMenuItem(string restaurantSlug, int menuItemId, [FromBody] UpdateMenuItemDto dto)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new UpdateMenuItemCommand { RestaurantSlug = restaurantSlug, MenuItemId = menuItemId, MenuItemDto = dto };
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("admin/{restaurantSlug}/menu-items/{menuItemId}")]
    public async Task<IActionResult> DeleteMenuItem(string restaurantSlug, int menuItemId)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new DeleteMenuItemCommand { RestaurantSlug = restaurantSlug, MenuItemId = menuItemId };
        await _mediator.Send(command);
        return NoContent();
    }
    
    [HttpGet("admin/{restaurantSlug}/tables")]
    public async Task<ActionResult<List<TableDto>>> GetTables(string restaurantSlug)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var query = new GetTablesQuery { RestaurantSlug = restaurantSlug };
        return Ok(await _mediator.Send(query));
    }

    [HttpPost("admin/{restaurantSlug}/tables")]
    public async Task<ActionResult<TableDto>> AddTable(string restaurantSlug, [FromBody] CreateTableDto dto)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new AddTableCommand { RestaurantSlug = restaurantSlug, TableDto = dto };
        return Ok(await _mediator.Send(command));
    }

    [HttpDelete("admin/{restaurantSlug}/tables/{tableId}")]
    public async Task<IActionResult> DeleteTable(string restaurantSlug, int tableId)
    {
        if (!await IsAuthorizedForRestaurantAsync(restaurantSlug))
        {
            return Forbid("Access denied for this restaurant");
        }

        var command = new DeleteTableCommand { RestaurantSlug = restaurantSlug, TableId = tableId };
        await _mediator.Send(command);
        return NoContent();
    }
} 