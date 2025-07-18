using MediatR;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using AutoMapper;
using QRMenu.Domain.Entities;
using FluentValidation;
using QRMenu.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using AutoMapper.QueryableExtensions;

namespace QRMenu.Application.Features.Tables.Commands;

// Get Tables
public class GetTablesQuery : IRequest<List<TableDto>>
{
    public string RestaurantSlug { get; set; } = "";
}

public class GetTablesQueryHandler : IRequestHandler<GetTablesQuery, List<TableDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetTablesQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<TableDto>> Handle(GetTablesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Tables
            .Where(t => t.Restaurant!.Slug == request.RestaurantSlug)
            .ProjectTo<TableDto>(_mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
    }
}

// Add Table
public class AddTableCommand : IRequest<TableDto>
{
    public string RestaurantSlug { get; set; } = "";
    public CreateTableDto TableDto { get; set; } = new();
}

public class AddTableCommandHandler : IRequestHandler<AddTableCommand, TableDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public AddTableCommandHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<TableDto> Handle(AddTableCommand request, CancellationToken cancellationToken)
    {
        var restaurant = await _context.Restaurants.FirstOrDefaultAsync(r => r.Slug == request.RestaurantSlug, cancellationToken);
        if (restaurant == null) throw new NotFoundException("Restaurant", request.RestaurantSlug);

        var table = _mapper.Map<Table>(request.TableDto);
        table.RestaurantId = restaurant.Id;
        // Generate a QR code in the format TABLE001, TABLE006, etc.
        table.QRCode = $"TABLE{request.TableDto.TableNumber.PadLeft(3, '0')}";

        await _context.Tables.AddAsync(table, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<TableDto>(table);
    }
}

// Delete Table
public class DeleteTableCommand : IRequest
{
    public string RestaurantSlug { get; set; } = "";
    public int TableId { get; set; }
}

public class DeleteTableCommandHandler : IRequestHandler<DeleteTableCommand>
{
    private readonly IApplicationDbContext _context;
    public DeleteTableCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task Handle(DeleteTableCommand request, CancellationToken cancellationToken)
    {
        var table = await _context.Tables.FirstOrDefaultAsync(t => t.Id == request.TableId && t.Restaurant!.Slug == request.RestaurantSlug, cancellationToken);
        if (table == null) throw new NotFoundException("Table", request.TableId);
        
        _context.Tables.Remove(table);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

// Validator
public class AddTableCommandValidator : AbstractValidator<AddTableCommand>
{
    public AddTableCommandValidator()
    {
        RuleFor(x => x.RestaurantSlug)
            .NotEmpty()
            .WithMessage("Restoran bilgisi zorunludur.");
            
        RuleFor(x => x.TableDto.TableNumber)
            .NotEmpty()
            .WithMessage("Masa numarası zorunludur.")
            .MaximumLength(50)
            .WithMessage("Masa numarası en fazla 50 karakter olabilir.");
    }
} 