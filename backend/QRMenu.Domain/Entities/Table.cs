namespace QRMenu.Domain.Entities;

public class Table
{
    public int Id { get; set; }
    public string TableNumber { get; set; } = "";
    public string QRCode { get; set; } = "";
    public bool IsActive { get; set; } = true;

    // Foreign Key
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    // Navigation Property
    public ICollection<QRCodeAccess> QRCodeAccesses { get; set; } = new List<QRCodeAccess>();
} 