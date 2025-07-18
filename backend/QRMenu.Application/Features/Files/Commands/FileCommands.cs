using MediatR;
using Microsoft.AspNetCore.Http;
using QRMenu.Application.Interfaces;
using FluentValidation;

namespace QRMenu.Application.Features.Files.Commands;

// Upload Image
public class UploadImageCommand : IRequest<UploadImageResponse>
{
    public IFormFile File { get; set; } = null!;
}

public class UploadImageResponse
{
    public string ImageUrl { get; set; } = "";
    public string FileName { get; set; } = "";
}

public class UploadImageCommandHandler : IRequestHandler<UploadImageCommand, UploadImageResponse>
{
    private readonly IFileStorageService _fileStorageService;

    public UploadImageCommandHandler(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    public async Task<UploadImageResponse> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        await using var stream = request.File.OpenReadStream();
        var imageUrl = await _fileStorageService.SaveImageAsync(stream, request.File.FileName);
        
        return new UploadImageResponse
        {
            ImageUrl = imageUrl,
            FileName = Path.GetFileName(imageUrl) // Extract file name from the URL path
        };
    }
}


// Delete Image
public class DeleteImageCommand : IRequest
{
    public string FileName { get; set; } = "";
}

public class DeleteImageCommandHandler : IRequestHandler<DeleteImageCommand>
{
    private readonly IFileStorageService _fileStorageService;

    public DeleteImageCommandHandler(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    public async Task Handle(DeleteImageCommand request, CancellationToken cancellationToken)
    {
        await _fileStorageService.DeleteImageAsync(request.FileName);
    }
}

// Validator
public class UploadImageCommandValidator : AbstractValidator<UploadImageCommand>
{
    public UploadImageCommandValidator()
    {
        RuleFor(x => x.File)
            .NotNull()
            .WithMessage("Dosya seçimi zorunludur.");
            
        RuleFor(x => x.File.Length)
            .LessThanOrEqualTo(5 * 1024 * 1024)
            .WithMessage("Dosya boyutu en fazla 5MB olabilir.");
            
        RuleFor(x => x.File.ContentType)
            .Must(contentType => contentType == "image/jpeg" || contentType == "image/png" || contentType == "image/webp")
            .WithMessage("Sadece JPEG, PNG ve WebP formatları kabul edilir.");
    }
} 