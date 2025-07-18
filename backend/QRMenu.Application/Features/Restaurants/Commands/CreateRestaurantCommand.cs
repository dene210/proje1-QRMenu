using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using AutoMapper;
using QRMenu.Domain.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace QRMenu.Application.Features.Restaurants.Commands;

public class CreateRestaurantCommand : IRequest<int>
{
    public CreateRestaurantDto RestaurantDto { get; set; } = new();
}

public class CreateRestaurantCommandHandler : IRequestHandler<CreateRestaurantCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPasswordHashService _passwordHashService;

    public CreateRestaurantCommandHandler(IApplicationDbContext context, IMapper mapper, IPasswordHashService passwordHashService)
    {
        _context = context;
        _mapper = mapper;
        _passwordHashService = passwordHashService;
    }

    public async Task<int> Handle(CreateRestaurantCommand request, CancellationToken cancellationToken)
    {
        // Slug'ın unique olduğunu kontrol et
        var existingRestaurant = await _context.Restaurants
            .FirstOrDefaultAsync(r => r.Slug == request.RestaurantDto.Slug, cancellationToken);
        
        if (existingRestaurant != null)
        {
            throw new InvalidOperationException("Bu URL (slug) zaten kullanılıyor.");
        }

        // Admin kullanıcısının username ve email'inin unique olduğunu kontrol et
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == request.RestaurantDto.AdminUsername || 
                                     u.Email == request.RestaurantDto.AdminEmail, cancellationToken);
        
        if (existingUser != null)
        {
            throw new InvalidOperationException("Admin kullanıcı adı veya e-posta adresi zaten kullanılıyor.");
        }

        // Restoranı oluştur
        var restaurant = _mapper.Map<Restaurant>(request.RestaurantDto);
        await _context.Restaurants.AddAsync(restaurant, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Admin kullanıcısını oluştur
        var adminUser = new User
        {
            Username = request.RestaurantDto.AdminUsername,
            Email = request.RestaurantDto.AdminEmail,
            PasswordHash = _passwordHashService.HashPassword(request.RestaurantDto.AdminPassword),
            RestaurantId = restaurant.Id,
            IsAdmin = true,
            IsSuperAdmin = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(adminUser);
        await _context.SaveChangesAsync(cancellationToken);
        
        return restaurant.Id;
    }
}

public class CreateRestaurantCommandValidator : AbstractValidator<CreateRestaurantCommand>
{
    public CreateRestaurantCommandValidator()
    {
        RuleFor(x => x.RestaurantDto.Name)
            .NotEmpty()
            .WithMessage("Restoran adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Restoran adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.RestaurantDto.Slug)
            .NotEmpty()
            .WithMessage("URL (slug) zorunludur.")
            .MaximumLength(100)
            .WithMessage("URL (slug) en fazla 100 karakter olabilir.")
            .Matches("^[a-z0-9-]+$")
            .WithMessage("URL sadece küçük harf, rakam ve tire (-) içerebilir.");
            
        RuleFor(x => x.RestaurantDto.Email)
            .NotEmpty()
            .WithMessage("E-posta adresi zorunludur.")
            .EmailAddress()
            .WithMessage("Geçerli bir e-posta adresi giriniz.");
            
        RuleFor(x => x.RestaurantDto.Phone)
            .NotEmpty()
            .WithMessage("Telefon numarası zorunludur.")
            .MinimumLength(10)
            .WithMessage("Telefon numarası en az 10 karakter olmalıdır.")
            .MaximumLength(20)
            .WithMessage("Telefon numarası en fazla 20 karakter olabilir.");
            
        RuleFor(x => x.RestaurantDto.Address)
            .MaximumLength(500)
            .WithMessage("Adres en fazla 500 karakter olabilir.");

        // Admin kullanıcısı validation'ları
        RuleFor(x => x.RestaurantDto.AdminUsername)
            .NotEmpty()
            .WithMessage("Admin kullanıcı adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Admin kullanıcı adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.RestaurantDto.AdminEmail)
            .NotEmpty()
            .WithMessage("Admin e-posta adresi zorunludur.")
            .EmailAddress()
            .WithMessage("Geçerli bir admin e-posta adresi giriniz.");
            
        RuleFor(x => x.RestaurantDto.AdminPassword)
            .NotEmpty()
            .WithMessage("Admin şifresi zorunludur.")
            .MinimumLength(8)
            .WithMessage("Admin şifresi en az 8 karakter olmalıdır.");
            
        RuleFor(x => x.RestaurantDto.AdminConfirmPassword)
            .Equal(x => x.RestaurantDto.AdminPassword)
            .WithMessage("Admin şifreleri eşleşmiyor.");
    }
} 