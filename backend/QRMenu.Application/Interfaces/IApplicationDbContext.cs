using Microsoft.EntityFrameworkCore;
using QRMenu.Domain.Entities;

namespace QRMenu.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Restaurant> Restaurants { get; }
    DbSet<Category> Categories { get; }
    DbSet<MenuItem> MenuItems { get; }
    DbSet<Table> Tables { get; }
    DbSet<QRCodeAccess> QRCodeAccesses { get; }
    DbSet<User> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
} 