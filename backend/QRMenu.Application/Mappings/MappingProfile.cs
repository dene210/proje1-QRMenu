using AutoMapper;
using QRMenu.Application.DTOs;
using QRMenu.Domain.Entities;

namespace QRMenu.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Restaurant Mappings
        CreateMap<Restaurant, RestaurantBriefDto>();
        CreateMap<Restaurant, RestaurantDetailDto>();
        CreateMap<CreateRestaurantDto, Restaurant>();
        CreateMap<UpdateRestaurantDto, Restaurant>();

        // Category Mappings
        CreateMap<Category, CategoryDto>();
        CreateMap<CreateCategoryDto, Category>();
        CreateMap<UpdateCategoryDto, Category>();

        // MenuItem Mappings
        CreateMap<MenuItem, MenuItemDto>();
        CreateMap<CreateMenuItemDto, MenuItem>();
        CreateMap<UpdateMenuItemDto, MenuItem>();

        // Table Mappings
        CreateMap<Table, TableDto>();
        CreateMap<CreateTableDto, Table>();

        // User Mappings
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.RestaurantName, opt => opt.MapFrom(src => src.Restaurant != null ? src.Restaurant.Name : null))
            .ForMember(dest => dest.RestaurantSlug, opt => opt.MapFrom(src => src.Restaurant != null ? src.Restaurant.Slug : null));

        // QRCodeAccess Mappings
        CreateMap<QRCodeAccess, DailyAccessStatsDto>();
        CreateMap<QRCodeAccess, HourlyAccessStatsDto>();
    }
} 