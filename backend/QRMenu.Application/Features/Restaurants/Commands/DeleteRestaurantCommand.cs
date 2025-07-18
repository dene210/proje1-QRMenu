using MediatR;
using QRMenu.Application.Interfaces;
using QRMenu.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace QRMenu.Application.Features.Restaurants.Commands;

public class DeleteRestaurantCommand : IRequest
{
    public int Id { get; set; }
}

public class DeleteRestaurantCommandHandler : IRequestHandler<DeleteRestaurantCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _storageService;

    public DeleteRestaurantCommandHandler(IApplicationDbContext context, IFileStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    public async Task Handle(DeleteRestaurantCommand request, CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants
            .Include(r => r.QRCodeAccesses)
            .Include(r => r.Categories)
                .ThenInclude(c => c.MenuItems)
            .Include(r => r.Users)  // Kullanıcıları da dahil et
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (restaurant == null)
        {
            throw new NotFoundException(nameof(restaurant), request.Id);
        }

        // Remove related QRCodeAccess records explicitly to satisfy FK constraint (DeleteBehavior.NoAction)
        if (restaurant.QRCodeAccesses.Any())
        {
            _context.QRCodeAccesses.RemoveRange(restaurant.QRCodeAccesses);
        }

        // Delete menu item images
        foreach (var category in restaurant.Categories)
        {
            foreach (var menuItem in category.MenuItems)
            {
                if (!string.IsNullOrWhiteSpace(menuItem.ImageUrl))
                {
                    var fileName = Path.GetFileName(menuItem.ImageUrl);
                    await _storageService.DeleteImageAsync(fileName);
                }
            }
        }

        // Remove related Users (restaurant admins)
        if (restaurant.Users.Any())
        {
            _context.Users.RemoveRange(restaurant.Users);
        }

        _context.Restaurants.Remove(restaurant);
        await _context.SaveChangesAsync(cancellationToken);
    }
} 