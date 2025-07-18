using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using AutoMapper;
using QRMenu.Domain.Entities;
using FluentValidation;
using QRMenu.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace QRMenu.Application.Features.Menu.Commands;

// Add Category
public class AddCategoryCommand : IRequest<int>
{
    public string RestaurantSlug { get; set; } = "";
    public CreateCategoryDto CategoryDto { get; set; } = new();
}

public class AddCategoryCommandHandler : IRequestHandler<AddCategoryCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AddCategoryCommandHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<int> Handle(AddCategoryCommand request, CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.Slug == request.RestaurantSlug, cancellationToken);
        if (restaurant == null) throw new NotFoundException("Restaurant", request.RestaurantSlug);

        var category = _mapper.Map<Category>(request.CategoryDto);
        category.RestaurantId = restaurant.Id;
        
        await _context.Categories.AddAsync(category, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return category.Id;
    }
}

// Update Category
public class UpdateCategoryCommand : IRequest
{
    public string RestaurantSlug { get; set; } = "";
    public int CategoryId { get; set; }
    public UpdateCategoryDto CategoryDto { get; set; } = new();
}

public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UpdateCategoryCommandHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (category == null) throw new NotFoundException("Category", request.CategoryId);

        _mapper.Map(request.CategoryDto, category);
        await _context.SaveChangesAsync(cancellationToken);
    }
}


// Delete Category
public class DeleteCategoryCommand : IRequest
{
    public string RestaurantSlug { get; set; } = "";
    public int CategoryId { get; set; }
}

public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _storageService;
    public DeleteCategoryCommandHandler(IApplicationDbContext context, IFileStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    public async Task Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .Include(c => c.MenuItems)
            .Include(c => c.Restaurant)
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (category == null) throw new NotFoundException("Category", request.CategoryId);

        // Delete images of related menu items
        foreach (var menuItem in category.MenuItems)
        {
            if (!string.IsNullOrWhiteSpace(menuItem.ImageUrl))
            {
                var fileName = Path.GetFileName(menuItem.ImageUrl);
                await _storageService.DeleteImageAsync(fileName);
            }
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

// Validators
public class AddCategoryCommandValidator : AbstractValidator<AddCategoryCommand>
{
    public AddCategoryCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .WithMessage("Restoran bilgisi zorunludur.");
            
        RuleFor(x => x.CategoryDto.Name)
            .NotEmpty()
            .WithMessage("Kategori adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Kategori adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.CategoryDto.Description)
            .MaximumLength(500)
            .WithMessage("Kategori açıklaması en fazla 500 karakter olabilir.");
    }
}

public class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .WithMessage("Restoran bilgisi zorunludur.");
            
        RuleFor(x => x.CategoryId)
            .NotEmpty()
            .WithMessage("Kategori ID'si zorunludur.");
            
        RuleFor(x => x.CategoryDto.Name)
            .NotEmpty()
            .WithMessage("Kategori adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Kategori adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.CategoryDto.Description)
            .MaximumLength(500)
            .WithMessage("Kategori açıklaması en fazla 500 karakter olabilir.");
    }
} 