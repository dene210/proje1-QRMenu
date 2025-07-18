namespace QRMenu.Domain.Entities;

public class Restaurant
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Address { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Table> Tables { get; set; } = new List<Table>();
    public ICollection<QRCodeAccess> QRCodeAccesses { get; set; } = new List<QRCodeAccess>();
    public ICollection<User> Users { get; set; } = new List<User>();
} 