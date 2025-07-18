using System.Net;
using System.Text.Json;
using FluentValidation;
using QRMenu.Domain.Exceptions;

namespace QRMenu.API.Middleware;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        var response = context.Response;
        
        var errorResponse = new
        {
            message = "Bir hata oluştu.",
            statusCode = (int)HttpStatusCode.InternalServerError,
            details = (string?)null
        };

        switch (exception)
        {
            case NotFoundException:
                response.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse = errorResponse with { 
                    message = "Aradığınız kayıt bulunamadı.", 
                    statusCode = (int)HttpStatusCode.NotFound 
                };
                break;
            case ValidationException validationException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                var validationErrors = validationException.Errors.Select(e => e.ErrorMessage).ToArray();
                var detailedMessage = string.Join(", ", validationErrors);
                errorResponse = errorResponse with { 
                    message = "Girdiğiniz bilgilerde hata var.", 
                    statusCode = (int)HttpStatusCode.BadRequest, 
                    details = detailedMessage 
                };
                break;
            case InvalidOperationException invalidOpException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse = errorResponse with { 
                    message = invalidOpException.Message, 
                    statusCode = (int)HttpStatusCode.BadRequest 
                };
                break;
            default:
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                errorResponse = errorResponse with { 
                    message = "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyiniz." 
                };
                _logger.LogError(exception, "Beklenmeyen bir hata oluştu.");
                break;
        }

        var result = JsonSerializer.Serialize(errorResponse);
        await context.Response.WriteAsync(result);
    }
} 