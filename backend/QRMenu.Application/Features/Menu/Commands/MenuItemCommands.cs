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

// Add MenuItem
public class AddMenuItemCommand : IRequest<int>
{
    public string RestaurantSlug { get; set; } = "";
    public CreateMenuItemDto MenuItemDto { get; set; } = new();
}

public class AddMenuItemCommandHandler : IRequestHandler<AddMenuItemCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AddMenuItemCommandHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<int> Handle(AddMenuItemCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == request.MenuItemDto.CategoryId && c.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (category == null) throw new NotFoundException("Category", request.MenuItemDto.CategoryId);

        var menuItem = _mapper.Map<MenuItem>(request.MenuItemDto);
        
        await _context.MenuItems.AddAsync(menuItem, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return menuItem.Id;
    }
}

// Update MenuItem
public class UpdateMenuItemCommand : IRequest
{
    public string RestaurantSlug { get; set; } = "";
    public int MenuItemId { get; set; }
    public UpdateMenuItemDto MenuItemDto { get; set; } = new();
}

public class UpdateMenuItemCommandHandler : IRequestHandler<UpdateMenuItemCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IFileStorageService _storageService;

    public UpdateMenuItemCommandHandler(IApplicationDbContext context, IMapper mapper, IFileStorageService storageService)
    {
        _context = context;
        _mapper = mapper;
        _storageService = storageService;
    }

    public async Task Handle(UpdateMenuItemCommand request, CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems.Include(mi => mi.Category).ThenInclude(c => c!.Restaurant)
            .FirstOrDefaultAsync(mi => mi.Id == request.MenuItemId && mi.Category!.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (menuItem == null) throw new NotFoundException("MenuItem", request.MenuItemId);

        // Store original values before mapping
        var originalCategoryId = menuItem.CategoryId;
        var originalImageUrl = menuItem.ImageUrl;
        
        // Map other properties
        _mapper.Map(request.MenuItemDto, menuItem);
        
        // Validate and update CategoryId only if it's a valid value
        if (request.MenuItemDto.CategoryId > 0)
        {
            // Check if the new CategoryId exists and belongs to the same restaurant
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == request.MenuItemDto.CategoryId && c.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
            
            if (!categoryExists)
            {
                // Restore original CategoryId if new one is invalid
                menuItem.CategoryId = originalCategoryId;
            }
        }
        else
        {
            // Restore original CategoryId if new one is 0 or negative
            menuItem.CategoryId = originalCategoryId;
        }
        
        // Handle image update: Delete old image if a new one is provided
        var newImageUrl = request.MenuItemDto.ImageUrl?.Trim();
        if (!string.IsNullOrEmpty(originalImageUrl) && 
            originalImageUrl != newImageUrl && 
            !string.IsNullOrEmpty(newImageUrl))
        {
            try
            {
                // Delete the old image file
                var oldFileName = Path.GetFileName(originalImageUrl);
                if (!string.IsNullOrEmpty(oldFileName))
                {
                    await _storageService.DeleteImageAsync(oldFileName);
                }
            }
            catch (Exception)
            {
                // Log the error but don't fail the update operation
                // The old image file might already be deleted or not exist
            }
        }
        
        await _context.SaveChangesAsync(cancellationToken);
    }
}


// Delete MenuItem
public class DeleteMenuItemCommand : IRequest
{
    public string RestaurantSlug { get; set; } = "";
    public int MenuItemId { get; set; }
}

public class DeleteMenuItemCommandHandler : IRequestHandler<DeleteMenuItemCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorageService _storageService;

    public DeleteMenuItemCommandHandler(IApplicationDbContext context, IFileStorageService storageService)
    {
        _context = context;
        _storageService = storageService;
    }

    public async Task Handle(DeleteMenuItemCommand request, CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems.Include(mi => mi.Category).ThenInclude(c => c!.Restaurant)
            .FirstOrDefaultAsync(mi => mi.Id == request.MenuItemId && mi.Category!.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (menuItem == null) throw new NotFoundException("MenuItem", request.MenuItemId);

        // Delete image file if exists
        if (!string.IsNullOrWhiteSpace(menuItem.ImageUrl))
        {
            var fileName = Path.GetFileName(menuItem.ImageUrl);
            await _storageService.DeleteImageAsync(fileName);
        }
        
        _context.MenuItems.Remove(menuItem);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

// Validators
public class AddMenuItemCommandValidator : AbstractValidator<AddMenuItemCommand>
{
    public AddMenuItemCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .WithMessage("Restoran bilgisi zorunludur.");
            
        RuleFor(x => x.MenuItemDto.Name)
            .NotEmpty()
            .WithMessage("Ürün adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Ürün adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.MenuItemDto.Price)
            .GreaterThan(0)
            .WithMessage("Ürün fiyatı 0'dan büyük olmalıdır.");
            
        RuleFor(x => x.MenuItemDto.CategoryId)
            .NotEmpty()
            .WithMessage("Kategori seçimi zorunludur.");
            
        RuleFor(x => x.MenuItemDto.Description)
            .MaximumLength(1000)
            .WithMessage("Ürün açıklaması en fazla 1000 karakter olabilir.");
    }
}

public class UpdateMenuItemCommandValidator : AbstractValidator<UpdateMenuItemCommand>
{
    public UpdateMenuItemCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .WithMessage("Restoran bilgisi zorunludur.");
            
        RuleFor(x => x.MenuItemId)
            .NotEmpty()
            .WithMessage("Ürün ID'si zorunludur.");
            
        RuleFor(x => x.MenuItemDto.Name)
            .NotEmpty()
            .WithMessage("Ürün adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Ürün adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.MenuItemDto.Price)
            .GreaterThan(0)
            .WithMessage("Ürün fiyatı 0'dan büyük olmalıdır.");
            
        RuleFor(x => x.MenuItemDto.CategoryId)
            .GreaterThan(0)
            .When(x => x.MenuItemDto.CategoryId != 0)
            .WithMessage("Geçerli bir kategori seçiniz.");
            
        RuleFor(x => x.MenuItemDto.Description)
            .MaximumLength(1000)
            .WithMessage("Ürün açıklaması en fazla 1000 karakter olabilir.");
    }
} 