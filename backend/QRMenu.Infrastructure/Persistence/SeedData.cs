using Microsoft.EntityFrameworkCore;
using QRMenu.Domain.Entities;
using QRMenu.Application.Interfaces;

namespace QRMenu.Infrastructure.Persistence;

public static class SeedData
{
    public static async Task InitializeAsync(ApplicationDbContext context, IPasswordHashService passwordHashService)
    {
        // Seed SuperAdmin user first
        if (!await context.Users.AnyAsync(u => u.IsSuperAdmin))
        {
            var superAdmin = new User
            {
                Username = "superadmin",
                Email = "admin@qrmenu.com",
                PasswordHash = passwordHashService.HashPassword("QRMenu2024!"),
                RestaurantId = null,
                IsAdmin = false,
                IsSuperAdmin = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await context.Users.AddAsync(superAdmin);
            await context.SaveChangesAsync();
        }

        if (await context.Restaurants.AnyAsync())
        {
            return; // DB has been seeded
        }

        var restaurants = new List<Restaurant>
        {
            new Restaurant
            {
                Name = "Lezzet Sarayı",
                Slug = "lezzet-sarayi",
                Address = "Merkez Mah. 123. Sk. No:4",
                Phone = "05551112233",
                Email = "contact@lezzetsarayi.com",
                IsActive = true,
                Categories = new List<Category>
                {
                    new Category
                    {
                        Name = "Çorbalar",
                        Description = "Güne sıcak bir başlangıç",
                        DisplayOrder = 1,
                        MenuItems = new List<MenuItem>
                        {
                            new MenuItem { Name = "Mercimek Çorbası", Price = 30, DisplayOrder = 1, IsAvailable = true },
                            new MenuItem { Name = "Ezogelin Çorbası", Price = 35, DisplayOrder = 2, IsAvailable = true }
                        }
                    },
                    new Category
                    {
                        Name = "Ana Yemekler",
                        Description = "Doyurucu lezzetler",
                        DisplayOrder = 2,
                        MenuItems = new List<MenuItem>
                        {
                            new MenuItem { Name = "Adana Kebap", Price = 150, DisplayOrder = 1, IsAvailable = true, ImageUrl = "/images/default.jpg" },
                            new MenuItem { Name = "İskender", Price = 180, DisplayOrder = 2, IsAvailable = true, ImageUrl = "/images/default.jpg" }
                        }
                    }
                },
                Tables = new List<Table>
                {
                    new Table { TableNumber = "1", QRCode = "TABLE001", IsActive = true },
                    new Table { TableNumber = "2", QRCode = "TABLE002", IsActive = true }
                }
            },
            new Restaurant
            {
                Name = "Denizden Gelen",
                Slug = "denizden-gelen",
                Address = "Sahil Yolu Cd. No:10",
                Phone = "05554445566",
                Email = "info@denizdengelen.com",
                IsActive = true,
                Categories = new List<Category>
                {
                    new Category
                    {
                        Name = "Balıklar",
                        Description = "Taze ve lezzetli",
                        DisplayOrder = 1,
                        MenuItems = new List<MenuItem>
                        {
                            new MenuItem { Name = "Levrek Izgara", Price = 250, DisplayOrder = 1, IsAvailable = true },
                            new MenuItem { Name = "Çipura", Price = 240, DisplayOrder = 2, IsAvailable = true }
                        }
                    }
                },
                Tables = new List<Table>
                {
                    new Table { TableNumber = "1", QRCode = "TABLE001", IsActive = true }
                }
            }
        };

        await context.Restaurants.AddRangeAsync(restaurants);
        await context.SaveChangesAsync();

        // Seed restaurant admin users
        var restaurantAdmins = new List<User>
        {
            new User
            {
                Username = "lezzet-admin",
                Email = "admin@lezzetsarayi.com",
                PasswordHash = passwordHashService.HashPassword("LezzetAdmin123!"),
                RestaurantId = restaurants[0].Id, // Lezzet Sarayı
                IsAdmin = true,
                IsSuperAdmin = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new User
            {
                Username = "deniz-admin",
                Email = "admin@denizdengelen.com",
                PasswordHash = passwordHashService.HashPassword("DenizAdmin123!"),
                RestaurantId = restaurants[1].Id, // Denizden Gelen
                IsAdmin = true,
                IsSuperAdmin = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        await context.Users.AddRangeAsync(restaurantAdmins);
        await context.SaveChangesAsync();
    }
} 