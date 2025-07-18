namespace QRMenu.Application.Interfaces;
 
public interface IFileStorageService
{
    Task<string> SaveImageAsync(Stream imageStream, string fileName);
    Task DeleteImageAsync(string fileName);
} 