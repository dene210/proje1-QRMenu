namespace QRMenu.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int DisplayOrder { get; set; }

    // Foreign Key
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    // Navigation Property
    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
} 