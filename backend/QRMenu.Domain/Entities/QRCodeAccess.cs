namespace QRMenu.Domain.Entities;

public class QRCodeAccess
{
    public int Id { get; set; }
    public DateTime AccessTime { get; set; }

    // Foreign Keys
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    public int? TableId { get; set; }
    public Table? Table { get; set; }
} 