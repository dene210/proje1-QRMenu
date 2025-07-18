using MediatR;
using Microsoft.EntityFrameworkCore;
using QRMenu.Application.Common;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using QRMenu.Domain.Entities;
using FluentValidation;
using AutoMapper;

namespace QRMenu.Application.Features.Users.Commands;

// Get Users Query
public class GetUsersQuery : IRequest<Result<List<UserDto>>> { }

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, Result<List<UserDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetUsersQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<Result<List<UserDto>>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .Include(u => u.Restaurant)
            .Where(u => u.IsActive)
            .ToListAsync(cancellationToken);

        var userDtos = _mapper.Map<List<UserDto>>(users);
        return Result<List<UserDto>>.Success(userDtos);
    }
}

// Get User By Id Query
public class GetUserByIdQuery : IRequest<Result<UserDto>>
{
    public int UserId { get; set; }
    public int RequestingUserId { get; set; }
    public bool IsSuperAdmin { get; set; }
    public string? RequestingUserRestaurantId { get; set; }
}

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, Result<UserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetUserByIdQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<Result<UserDto>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.Restaurant)
            .FirstOrDefaultAsync(u => u.Id == request.UserId && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Result<UserDto>.Failure("User not found");
        }

        // Authorization check
        if (request.RequestingUserId != request.UserId && 
            !request.IsSuperAdmin && 
            (request.RequestingUserRestaurantId != user.RestaurantId?.ToString() || user.RestaurantId == null))
        {
            return Result<UserDto>.Failure("Access denied");
        }

        var userDto = _mapper.Map<UserDto>(user);
        return Result<UserDto>.Success(userDto);
    }
}

// Update User Command
public class UpdateUserCommand : IRequest<Result<UserDto>>
{
    public int UserId { get; set; }
    public RegisterDto UpdateDto { get; set; } = new();
    public int RequestingUserId { get; set; }
    public bool IsSuperAdmin { get; set; }
}

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result<UserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPasswordHashService _passwordHashService;

    public UpdateUserCommandHandler(IApplicationDbContext context, IMapper mapper, IPasswordHashService passwordHashService)
    {
        _context = context;
        _mapper = mapper;
        _passwordHashService = passwordHashService;
    }

    public async Task<Result<UserDto>> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.Restaurant)
            .FirstOrDefaultAsync(u => u.Id == request.UserId && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Result<UserDto>.Failure("Kullanıcı bulunamadı.");
        }

        // Authorization check
        if (request.RequestingUserId != request.UserId && !request.IsSuperAdmin)
        {
            return Result<UserDto>.Failure("Erişim reddedildi.");
        }

        // Only SuperAdmin can change admin privileges
        if (!request.IsSuperAdmin && 
            (request.UpdateDto.IsAdmin != user.IsAdmin || request.UpdateDto.IsSuperAdmin != user.IsSuperAdmin))
        {
            return Result<UserDto>.Failure("Sadece süper yönetici admin yetkilerini değiştirebilir.");
        }

        // Check if username or email already exists (excluding current user)
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id != request.UserId && 
                (u.Username == request.UpdateDto.Username || u.Email == request.UpdateDto.Email), cancellationToken);

        if (existingUser != null)
        {
            return Result<UserDto>.Failure("Bu kullanıcı adı veya e-posta adresi zaten kullanılıyor.");
        }

        // Update user properties
        user.Username = request.UpdateDto.Username;
        user.Email = request.UpdateDto.Email;
        user.RestaurantId = request.UpdateDto.RestaurantId;
        user.IsAdmin = request.UpdateDto.IsAdmin;
        user.IsSuperAdmin = request.UpdateDto.IsSuperAdmin;
        user.UpdatedAt = DateTime.UtcNow;

        // Update password if provided
        if (!string.IsNullOrEmpty(request.UpdateDto.Password))
        {
            if (request.UpdateDto.Password != request.UpdateDto.ConfirmPassword)
            {
                return Result<UserDto>.Failure("Şifreler eşleşmiyor.");
            }
            user.PasswordHash = _passwordHashService.HashPassword(request.UpdateDto.Password);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var userDto = _mapper.Map<UserDto>(user);
        return Result<UserDto>.Success(userDto);
    }
}

// Delete User Command
public class DeleteUserCommand : IRequest<Result>
{
    public int UserId { get; set; }
}

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user == null)
        {
            return Result.Failure("Kullanıcı bulunamadı.");
        }

        // Prevent deleting the last SuperAdmin
        if (user.IsSuperAdmin)
        {
            var superAdminCount = await _context.Users.CountAsync(u => u.IsSuperAdmin && u.IsActive, cancellationToken);
            if (superAdminCount <= 1)
            {
                return Result.Failure("Son süper yönetici silinemez.");
            }
        }

        // Soft delete
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

// Get Users By Restaurant Query
public class GetUsersByRestaurantQuery : IRequest<Result<List<UserDto>>>
{
    public int RestaurantId { get; set; }
}

public class GetUsersByRestaurantQueryHandler : IRequestHandler<GetUsersByRestaurantQuery, Result<List<UserDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetUsersByRestaurantQueryHandler(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<Result<List<UserDto>>> Handle(GetUsersByRestaurantQuery request, CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .Include(u => u.Restaurant)
            .Where(u => u.RestaurantId == request.RestaurantId && u.IsActive)
            .ToListAsync(cancellationToken);

        var userDtos = _mapper.Map<List<UserDto>>(users);
        return Result<List<UserDto>>.Success(userDtos);
    }
}

// Create User Command
public class CreateUserCommand : IRequest<Result<UserDto>>
{
    public RegisterDto RegisterDto { get; set; } = new();
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result<UserDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IPasswordHashService _passwordHashService;

    public CreateUserCommandHandler(IApplicationDbContext context, IMapper mapper, IPasswordHashService passwordHashService)
    {
        _context = context;
        _mapper = mapper;
        _passwordHashService = passwordHashService;
    }

    public async Task<Result<UserDto>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        // Check if username or email already exists
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == request.RegisterDto.Username || u.Email == request.RegisterDto.Email, cancellationToken);

        if (existingUser != null)
        {
            return Result<UserDto>.Failure("Bu kullanıcı adı veya e-posta adresi zaten kullanılıyor.");
        }

        // Validate password
        if (request.RegisterDto.Password != request.RegisterDto.ConfirmPassword)
        {
            return Result<UserDto>.Failure("Şifreler eşleşmiyor.");
        }

        // Validate SuperAdmin logic
        if (request.RegisterDto.IsSuperAdmin && request.RegisterDto.RestaurantId.HasValue)
        {
            return Result<UserDto>.Failure("Süper yönetici bir restorana atananamaz.");
        }

        // Validate Restaurant exists if RestaurantId is provided
        if (request.RegisterDto.RestaurantId.HasValue)
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.Id == request.RegisterDto.RestaurantId.Value, cancellationToken);
            if (restaurant == null)
            {
                return Result<UserDto>.Failure("Seçilen restoran bulunamadı.");
            }
        }

        var user = new User
        {
            Username = request.RegisterDto.Username,
            Email = request.RegisterDto.Email,
            PasswordHash = _passwordHashService.HashPassword(request.RegisterDto.Password),
            RestaurantId = request.RegisterDto.RestaurantId,
            IsAdmin = request.RegisterDto.IsAdmin,
            IsSuperAdmin = request.RegisterDto.IsSuperAdmin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        // Load user with restaurant for DTO mapping
        var createdUser = await _context.Users
            .Include(u => u.Restaurant)
            .FirstAsync(u => u.Id == user.Id, cancellationToken);

        var userDto = _mapper.Map<UserDto>(createdUser);
        return Result<UserDto>.Success(userDto);
    }
}

// Validators
public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.RegisterDto.Username)
            .NotEmpty()
            .WithMessage("Kullanıcı adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Kullanıcı adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.RegisterDto.Email)
            .NotEmpty()
            .WithMessage("E-posta adresi zorunludur.")
            .EmailAddress()
            .WithMessage("Geçerli bir e-posta adresi giriniz.");
            
        RuleFor(x => x.RegisterDto.Password)
            .NotEmpty()
            .WithMessage("Şifre zorunludur.")
            .MinimumLength(8)
            .WithMessage("Şifre en az 8 karakter olmalıdır.");
            
        RuleFor(x => x.RegisterDto.ConfirmPassword)
            .Equal(x => x.RegisterDto.Password)
            .WithMessage("Şifreler eşleşmiyor.");
    }
}

public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThan(0)
            .WithMessage("Geçerli bir kullanıcı ID'si gereklidir.");
            
        RuleFor(x => x.UpdateDto.Username)
            .NotEmpty()
            .WithMessage("Kullanıcı adı zorunludur.")
            .MaximumLength(100)
            .WithMessage("Kullanıcı adı en fazla 100 karakter olabilir.");
            
        RuleFor(x => x.UpdateDto.Email)
            .NotEmpty()
            .WithMessage("E-posta adresi zorunludur.")
            .EmailAddress()
            .WithMessage("Geçerli bir e-posta adresi giriniz.");
            
        RuleFor(x => x.UpdateDto.Password)
            .Equal(x => x.UpdateDto.ConfirmPassword)
            .When(x => !string.IsNullOrEmpty(x.UpdateDto.Password))
            .WithMessage("Şifreler eşleşmiyor.");
    }
} 