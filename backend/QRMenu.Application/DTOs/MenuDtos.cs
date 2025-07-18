namespace QRMenu.Application.DTOs;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DisplayOrder { get; set; }
    public ICollection<MenuItemDto> MenuItems { get; set; } = new List<MenuItemDto>();
}

public class MenuItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsAvailable { get; set; }
}

public class CreateCategoryDto
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DisplayOrder { get; set; }
}

public class UpdateCategoryDto : CreateCategoryDto { }

public class CreateMenuItemDto
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public string ImageUrl { get; set; } = "";
    public int DisplayOrder { get; set; }
    public bool IsAvailable { get; set; }
}

public class UpdateMenuItemDto : CreateMenuItemDto { } 