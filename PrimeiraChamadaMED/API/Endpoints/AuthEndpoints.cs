using Microsoft.AspNetCore.Http.HttpResults;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Services;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Endpoints;

/// <summary>Módulo de autenticação: /api/auth.</summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/auth").WithTags("Autenticação");

        group.MapPost("/login", LoginAsync)
            .WithName("Login")
            .WithValidation<LoginRequest>();

        return routes;
    }

    private static async Task<Results<Ok<LoginResponse>, ProblemHttpResult>> LoginAsync(
        LoginRequest request, IAuthService auth, CancellationToken ct)
    {
        var user = await auth.LoginAsync(request, ct);
        if (user is null)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Falha no login.",
                detail: "E-mail ou senha incorretos.");
        }

        return TypedResults.Ok(user);
    }
}