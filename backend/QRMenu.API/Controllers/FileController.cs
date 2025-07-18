using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QRMenu.Application.Features.Files.Commands;
using MediatR;

namespace QRMenu.API.Controllers;

[Route("api/[controller]")]
public class FileController : BaseAuthorizedController
{
    public FileController(IMediator mediator) : base(mediator)
    {
    }

    [HttpPost("upload-image")]
    public async Task<ActionResult<UploadImageResponse>> UploadImage(IFormFile file)
    {
        var command = new UploadImageCommand { File = file };
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("delete-image/{fileName}")]
    public async Task<IActionResult> DeleteImage(string fileName)
    {
        var command = new DeleteImageCommand { FileName = fileName };
        await _mediator.Send(command);
        return NoContent();
    }
} 