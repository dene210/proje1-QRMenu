using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using QRMenu.Domain.Exceptions;
using AutoMapper.QueryableExtensions;

namespace QRMenu.Application.Features.Menu.Queries;

public class GetMenuAdminQuery : IRequest<RestaurantDetailDto>
{
    public string RestaurantSlug { get; set; } = "";
}

public class GetMenuAdminQueryHandler : IRequestHandler<GetMenuAdminQuery, RestaurantDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetMenuAdminQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<RestaurantDetailDto> Handle(GetMenuAdminQuery request, CancellationToken cancellationToken)
    {
        var restaurantDto = await _context.Restaurants
            .Where(r => r.Slug == request.RestaurantSlug)
            .ProjectTo<RestaurantDetailDto>(_mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);

        if (restaurantDto == null)
        {
            throw new NotFoundException("Restaurant", request.RestaurantSlug);
        }

        return restaurantDto;
    }
} 