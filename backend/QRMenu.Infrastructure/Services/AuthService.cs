using Microsoft.EntityFrameworkCore;
using QRMenu.Application.DTOs;
using QRMenu.Application.Interfaces;
using QRMenu.Domain.Entities;
using QRMenu.Domain.Exceptions;

namespace QRMenu.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHashService _passwordHashService;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHashService passwordHashService,
        IJwtTokenService jwtTokenService)
    {
        _context = context;
        _passwordHashService = passwordHashService;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _context.Users
            .Include(u => u.Restaurant)
            .FirstOrDefaultAsync(u => 
                (u.Username == loginDto.UsernameOrEmail || u.Email == loginDto.UsernameOrEmail) 
                && u.IsActive);

        if (user == null || !_passwordHashService.VerifyPassword(loginDto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Kullanıcı adı/e-posta veya şifre hatalı.");
        }

        var token = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Update user's last login (you might want to add this field to User entity)
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(CancellationToken.None);

        return new LoginResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            User = MapToUserDto(user),
            ExpiresAt = DateTime.UtcNow.AddMinutes(1440) // 24 hours
        };
    }

    public async Task<UserDto> RegisterAsync(RegisterDto registerDto)
    {
        // Check if username or email already exists
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == registerDto.Username || u.Email == registerDto.Email);

        if (existingUser != null)
        {
            throw new InvalidOperationException("Bu kullanıcı adı veya e-posta adresi zaten kullanılıyor.");
        }

        // Validate password
        if (registerDto.Password != registerDto.ConfirmPassword)
        {
            throw new InvalidOperationException("Şifreler eşleşmiyor.");
        }

        // Validate SuperAdmin logic
        if (registerDto.IsSuperAdmin && registerDto.RestaurantId.HasValue)
        {
            throw new InvalidOperationException("Süper yönetici bir restorana atananamaz.");
        }

        // Validate Restaurant exists if RestaurantId is provided
        if (registerDto.RestaurantId.HasValue)
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.Id == registerDto.RestaurantId.Value);
            if (restaurant == null)
            {
                throw new NotFoundException("Seçilen restoran bulunamadı.");
            }
        }

        var user = new User
        {
            Username = registerDto.Username,
            Email = registerDto.Email,
            PasswordHash = _passwordHashService.HashPassword(registerDto.Password),
            RestaurantId = registerDto.RestaurantId,
            IsAdmin = registerDto.IsAdmin,
            IsSuperAdmin = registerDto.IsSuperAdmin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Load user with restaurant for DTO mapping
        var createdUser = await _context.Users
            .Include(u => u.Restaurant)
            .FirstAsync(u => u.Id == user.Id);

        return MapToUserDto(createdUser);
    }

    public async Task<LoginResponseDto> RefreshTokenAsync(string refreshToken)
    {
        // For simplicity, we're not storing refresh tokens in DB
        // In production, you should store and validate refresh tokens
        throw new NotImplementedException("Refresh token functionality not implemented yet");
    }

    public async Task<bool> LogoutAsync(string refreshToken)
    {
        // For simplicity, we're not implementing logout logic
        // In production, you would invalidate the refresh token
        return await Task.FromResult(true);
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Restaurant)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

        return user != null ? MapToUserDto(user) : null;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user == null)
        {
            return false;
        }

        if (!_passwordHashService.VerifyPassword(changePasswordDto.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Mevcut şifre hatalı.");
        }

        if (changePasswordDto.NewPassword != changePasswordDto.ConfirmPassword)
        {
            throw new InvalidOperationException("Yeni şifreler eşleşmiyor.");
        }

        user.PasswordHash = _passwordHashService.HashPassword(changePasswordDto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(CancellationToken.None);
        return true;
    }

    public async Task<bool> ValidateTokenAsync(string token)
    {
        return await Task.FromResult(_jwtTokenService.ValidateToken(token));
    }

    private static UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            RestaurantId = user.RestaurantId,
            RestaurantName = user.Restaurant?.Name,
            RestaurantSlug = user.Restaurant?.Slug,
            IsAdmin = user.IsAdmin,
            IsSuperAdmin = user.IsSuperAdmin,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
} 