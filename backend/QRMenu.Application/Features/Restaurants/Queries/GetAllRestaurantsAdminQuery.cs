using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace QRMenu.Application.Features.Restaurants.Queries;

public class GetAllRestaurantsAdminQuery : IRequest<List<RestaurantBriefDto>> { }

public class GetAllRestaurantsAdminQueryHandler : IRequestHandler<GetAllRestaurantsAdminQuery, List<RestaurantBriefDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetAllRestaurantsAdminQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<RestaurantBriefDto>> Handle(GetAllRestaurantsAdminQuery request, CancellationToken cancellationToken)
    {
        var restaurants = await _context.Restaurants.AsNoTracking().ToListAsync(cancellationToken);
        return _mapper.Map<List<RestaurantBriefDto>>(restaurants);
    }
} 