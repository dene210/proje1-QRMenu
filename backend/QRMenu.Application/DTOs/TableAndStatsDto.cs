namespace QRMenu.Application.DTOs;

// api.ts: statisticsService.getTables
public class TableDto
{
    public int Id { get; set; }
    public string TableNumber { get; set; } = "";
    public bool IsActive { get; set; }
    public string QRCode { get; set; } = "";
}

// api.ts: statisticsService.addTable
public class CreateTableDto
{
    public string TableNumber { get; set; } = "";
}

// api.ts: statisticsService.getQRCodeStats
public class DailyAccessStatsDto
{
    public DateOnly Date { get; set; }
    public int TotalAccesses { get; set; }
}

// api.ts: statisticsService.getHourlyStats
public class HourlyAccessStatsDto
{
    public Dictionary<int, int> HourlyAccessCounts { get; set; } = new();
} 