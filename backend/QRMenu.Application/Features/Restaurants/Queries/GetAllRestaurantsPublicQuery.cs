using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace QRMenu.Application.Features.Restaurants.Queries;

public class GetAllRestaurantsPublicQuery : IRequest<List<RestaurantBriefDto>> { }

public class GetAllRestaurantsPublicQueryHandler : IRequestHandler<GetAllRestaurantsPublicQuery, List<RestaurantBriefDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetAllRestaurantsPublicQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<RestaurantBriefDto>> Handle(GetAllRestaurantsPublicQuery request, CancellationToken cancellationToken)
    {
        var restaurants = await _context.Restaurants
            .Where(r => r.IsActive)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
            
        return _mapper.Map<List<RestaurantBriefDto>>(restaurants);
    }
} 