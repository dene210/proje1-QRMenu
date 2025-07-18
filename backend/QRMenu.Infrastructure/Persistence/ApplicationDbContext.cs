using Microsoft.EntityFrameworkCore;
using QRMenu.Application.Interfaces;
using QRMenu.Domain.Entities;
using System.Reflection;

namespace QRMenu.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Table> Tables => Set<Table>();
    public DbSet<QRCodeAccess> QRCodeAccesses => Set<QRCodeAccess>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly()); // Removed to prevent warning

        // Relationships
        modelBuilder.Entity<Restaurant>()
            .HasMany(r => r.Categories)
            .WithOne(c => c.Restaurant)
            .HasForeignKey(c => c.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Category>()
            .HasMany(c => c.MenuItems)
            .WithOne(mi => mi.Category)
            .HasForeignKey(mi => mi.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Restaurant>()
            .HasMany(r => r.Tables)
            .WithOne(t => t.Restaurant)
            .HasForeignKey(t => t.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<Restaurant>()
           .HasIndex(r => r.Slug)
           .IsUnique();
        
        modelBuilder.Entity<Table>()
            .HasIndex(t => new { t.RestaurantId, t.QRCode })
            .IsUnique();

        modelBuilder.Entity<QRCodeAccess>()
            .HasOne(q => q.Restaurant)
            .WithMany(r => r.QRCodeAccesses)
            .HasForeignKey(q => q.RestaurantId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<QRCodeAccess>()
            .HasOne(q => q.Table)
            .WithMany(t => t.QRCodeAccesses)
            .HasForeignKey(q => q.TableId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure decimal precision
        modelBuilder.Entity<MenuItem>()
            .Property(p => p.Price)
            .HasColumnType("decimal(18,2)");

        // User entity configuration
        modelBuilder.Entity<User>()
            .HasOne(u => u.Restaurant)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RestaurantId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Check constraint for SuperAdmin logic
        modelBuilder.Entity<User>()
            .HasCheckConstraint("CK_Users_AdminLogic", 
                "(IsSuperAdmin = 1 AND RestaurantId IS NULL) OR (IsSuperAdmin = 0)");

        base.OnModelCreating(modelBuilder);
    }
} 