using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using AutoMapper;
using QRMenu.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using FluentValidation;

namespace QRMenu.Application.Features.Restaurants.Commands;

public class UpdateRestaurantCommand : IRequest
{
    public int Id { get; set; }
    public UpdateRestaurantDto RestaurantDto { get; set; } = new();
}

public class UpdateRestaurantCommandHandler : IRequestHandler<UpdateRestaurantCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UpdateRestaurantCommandHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task Handle(UpdateRestaurantCommand request, CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants.FindAsync(request.Id);

        if (restaurant == null)
        {
            throw new NotFoundException(nameof(restaurant), request.Id);
        }

        _mapper.Map(request.RestaurantDto, restaurant);

        await _context.SaveChangesAsync(cancellationToken);
    }
}

public class UpdateRestaurantCommandValidator : AbstractValidator<UpdateRestaurantCommand>
{
    public UpdateRestaurantCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Restoran ID'si zorunludur.");
            
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
    }
} 