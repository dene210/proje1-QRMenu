namespace QRMenu.Application.Models;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 1440; // 24 hours
    public int RefreshTokenExpiryDays { get; set; } = 7; // 7 days
} 