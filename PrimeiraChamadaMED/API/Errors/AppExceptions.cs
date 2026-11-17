namespace PrimeiraChamadaMed.Api.Errors;

/// <summary>Erro de regra de negócio que já carrega o status HTTP correspondente.</summary>
public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class NotFoundException(string message)
    : AppException(message, StatusCodes.Status404NotFound) { }

public sealed class ConflictException(string message)
    : AppException(message, StatusCodes.Status409Conflict) { }

public sealed class BusinessRuleException(string message)
    : AppException(message, StatusCodes.Status400BadRequest) { }