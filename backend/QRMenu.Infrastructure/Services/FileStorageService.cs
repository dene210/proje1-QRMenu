using Microsoft.AspNetCore.Hosting;
using QRMenu.Application.Interfaces;

namespace QRMenu.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly string _uploadsFolderPath;

    public FileStorageService(IWebHostEnvironment env)
    {
        // Save images to wwwroot/images to make them publicly accessible
        _uploadsFolderPath = Path.Combine(env.WebRootPath, "images");
        if (!Directory.Exists(_uploadsFolderPath))
        {
            Directory.CreateDirectory(_uploadsFolderPath);
        }
    }

    public async Task<string> SaveImageAsync(Stream imageStream, string fileName)
    {
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetExtension(fileName)}";
        var filePath = Path.Combine(_uploadsFolderPath, uniqueFileName);

        await using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await imageStream.CopyToAsync(fileStream);
        }

        // Return the public URL path
        return $"/images/{uniqueFileName}";
    }

    public Task DeleteImageAsync(string fileName)
    {
        var filePath = Path.Combine(_uploadsFolderPath, fileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
        
        return Task.CompletedTask;
    }
} 