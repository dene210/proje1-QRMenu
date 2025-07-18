using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace QRMenu.Application.Features.Statistics.Queries;

// Daily Access Stats
public class GetDailyAccessStatsQuery : IRequest<List<DailyAccessStatsDto>>
{
    public string RestaurantSlug { get; set; } = "";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int? TableId { get; set; }
}

public class GetDailyAccessStatsQueryHandler : IRequestHandler<GetDailyAccessStatsQuery, List<DailyAccessStatsDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDailyAccessStatsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DailyAccessStatsDto>> Handle(GetDailyAccessStatsQuery request, CancellationToken cancellationToken)
    {
        // Önce restaurant ID'sini al
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Slug == request.RestaurantSlug, cancellationToken);
        
        if (restaurant == null)
        {
            return new List<DailyAccessStatsDto>();
        }

        var query = _context.QRCodeAccesses
            .Where(a => a.RestaurantId == restaurant.Id && a.AccessTime >= request.StartDate && a.AccessTime < request.EndDate.AddDays(1));

        if (request.TableId.HasValue)
        {
            query = query.Where(a => a.TableId == request.TableId.Value);
        }

        var stats = await query
            .GroupBy(a => a.AccessTime.Date)
            .Select(g => new DailyAccessStatsDto
            {
                Date = DateOnly.FromDateTime(g.Key),
                TotalAccesses = g.Count()
            })
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);

        return stats;
    }
}

// Hourly Access Stats
public class GetHourlyAccessStatsQuery : IRequest<HourlyAccessStatsDto>
{
    public string RestaurantSlug { get; set; } = "";
    public DateTime Date { get; set; }
    public int? TableId { get; set; }
}

public class GetHourlyAccessStatsQueryHandler : IRequestHandler<GetHourlyAccessStatsQuery, HourlyAccessStatsDto>
{
    private readonly IApplicationDbContext _context;

    public GetHourlyAccessStatsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<HourlyAccessStatsDto> Handle(GetHourlyAccessStatsQuery request, CancellationToken cancellationToken)
    {
        // Önce restaurant ID'sini al
        var restaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Slug == request.RestaurantSlug, cancellationToken);
        
        if (restaurant == null)
        {
            return new HourlyAccessStatsDto();
        }

        var query = _context.QRCodeAccesses
            .Where(a => a.RestaurantId == restaurant.Id && a.AccessTime.Date == request.Date.Date);

        if (request.TableId.HasValue)
        {
            query = query.Where(a => a.TableId == request.TableId.Value);
        }

        var hourlyCounts = await query
            .GroupBy(a => a.AccessTime.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Hour, g => g.Count, cancellationToken);
            
        // Ensure all hours from 0 to 23 are present
        for(int i = 0; i < 24; i++)
        {
            if (!hourlyCounts.ContainsKey(i))
            {
                hourlyCounts[i] = 0;
            }
        }

        return new HourlyAccessStatsDto { HourlyAccessCounts = hourlyCounts };
    }
} 