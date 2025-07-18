using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.DTOs;
using QRMenu.Application.Features.Users.Commands;
using QRMenu.Application.Common;
using MediatR;

namespace QRMenu.API.Controllers;

[Route("api/[controller]")]
public class UsersController : BaseAuthorizedController
{
    public UsersController(IMediator mediator) : base(mediator)
    {
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        // Only SuperAdmin can see all users
        if (!IsSuperAdmin())
        {
            return Forbid("Access denied");
        }

        var result = await _mediator.Send(new GetUsersQuery());
        return result.IsSuccess ? Ok(result.Data) : BadRequest(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage });
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] RegisterDto registerDto)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can create users");
        }

        try
        {
            var result = await _mediator.Send(new CreateUserCommand { RegisterDto = registerDto });
            
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage });
            }

            return CreatedAtAction(nameof(GetUser), new { id = result.Data.Id }, result.Data);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message, userFriendlyMessage = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        var query = new GetUserByIdQuery
        {
            UserId = id,
            RequestingUserId = GetCurrentUserId(),
            IsSuperAdmin = IsSuperAdmin(),
            RequestingUserRestaurantId = GetCurrentUserRestaurantId()
        };

        var result = await _mediator.Send(query);
        
        if (!result.IsSuccess)
        {
            return result.ErrorMessage == "Kullanıcı bulunamadı." 
                ? NotFound(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage }) 
                : Forbid(result.ErrorMessage);
        }

        return Ok(result.Data);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserDto>> UpdateUser(int id, [FromBody] RegisterDto updateDto)
    {
        var command = new UpdateUserCommand
        {
            UserId = id,
            UpdateDto = updateDto,
            RequestingUserId = GetCurrentUserId(),
            IsSuperAdmin = IsSuperAdmin()
        };

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
        {
            if (result.ErrorMessage == "Kullanıcı bulunamadı.")
            {
                return NotFound(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage });
            }
            
            return BadRequest(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage });
        }

        return Ok(result.Data);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!IsSuperAdmin())
        {
            return Forbid("Only SuperAdmin can delete users");
        }

        var result = await _mediator.Send(new DeleteUserCommand { UserId = id });
        
        if (!result.IsSuccess)
        {
            return result.ErrorMessage == "Kullanıcı bulunamadı." 
                ? NotFound(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage }) 
                : BadRequest(new { message = result.ErrorMessage, userFriendlyMessage = result.ErrorMessage });
        }

        return NoContent();
    }
} 