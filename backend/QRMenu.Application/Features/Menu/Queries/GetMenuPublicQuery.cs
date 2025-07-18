using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using QRMenu.Domain.Exceptions;
using AutoMapper.QueryableExtensions;
using QRMenu.Domain.Entities;

namespace QRMenu.Application.Features.Menu.Queries;

public class GetMenuPublicQuery : IRequest<RestaurantDetailDto>
{
    public string RestaurantSlug { get; set; } = "";
    public string QRCode { get; set; } = "";
}

public class GetMenuPublicQueryHandler : IRequestHandler<GetMenuPublicQuery, RestaurantDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetMenuPublicQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<RestaurantDetailDto> Handle(GetMenuPublicQuery request, CancellationToken cancellationToken)
    {
        var table = await _context.Tables
            .Include(t => t.Restaurant)
            .FirstOrDefaultAsync(t => t.Restaurant!.Slug == request.RestaurantSlug && t.QRCode == request.QRCode, cancellationToken);

        if (table == null || table.Restaurant == null)
        {
            throw new NotFoundException($"Menu for QR Code '{request.QRCode}' not found in restaurant '{request.RestaurantSlug}'.");
        }

        var restaurantDto = await _context.Restaurants
            .Where(r => r.Id == table.RestaurantId)
            .ProjectTo<RestaurantDetailDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);
            
        if (restaurantDto == null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantSlug);
        }

        // Log access for statistics
        var accessLog = new QRCodeAccess
        {
            RestaurantId = table.RestaurantId,
            TableId = table.Id,
            AccessTime = DateTime.UtcNow
        };
        _context.QRCodeAccesses.Add(accessLog);
        await _context.SaveChangesAsync(cancellationToken);

        return restaurantDto;
    }
} 