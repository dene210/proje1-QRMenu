namespace QRMenu.Application.DTOs;

// api.ts: restaurantService.getAll & restaurantService.getAllForAdmin
public class RestaurantBriefDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Address { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsActive { get; set; }
}

// api.ts: menuService.getMenuByQRCode & menuService.getRestaurantForAdmin
public class RestaurantDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public ICollection<CategoryDto> Categories { get; set; } = new List<CategoryDto>();
}

// api.ts: restaurantService.create
public class CreateRestaurantDto
{
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Address { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    
    // Admin kullanıcısı bilgileri (zorunlu)
    public string AdminUsername { get; set; } = "";
    public string AdminEmail { get; set; } = "";
    public string AdminPassword { get; set; } = "";
    public string AdminConfirmPassword { get; set; } = "";
}

// api.ts: restaurantService.update
public class UpdateRestaurantDto
{
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Address { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsActive { get; set; }
} 