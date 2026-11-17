using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PrimeiraChamadaMed.Api.Validation;

/// <summary>
/// Valida o corpo da requisição com DataAnnotations antes de chegar na rota
/// (papel equivalente ao validate_on_submit() do Flask-WTF).
/// </summary>
public sealed class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var model = context.Arguments.OfType<T>().FirstOrDefault();
        if (model is null)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Requisição inválida.",
                detail: "O corpo da requisição não foi enviado.");
        }

        var results = new List<ValidationResult>();
        if (Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true))
        {
            return await next(context);
        }

        // Agrupa as mensagens por campo, usando o mesmo nome do JSON (ex.: "email").
        var errors = new Dictionary<string, List<string>>();
        foreach (var result in results)
        {
            var members = result.MemberNames.Any() ? result.MemberNames : new[] { string.Empty };
            foreach (var member in members)
            {
                var key = ToJsonName(member);
                if (!errors.ContainsKey(key)) errors[key] = new List<string>();
                errors[key].Add(result.ErrorMessage ?? "Valor inválido.");
            }
        }

        return TypedResults.ValidationProblem(
            errors.ToDictionary(e => e.Key, e => e.Value.ToArray()),
            title: "Existem campos inválidos.");
    }

    private static string ToJsonName(string member)
    {
        if (string.IsNullOrEmpty(member)) return string.Empty;
        var jsonName = typeof(T).GetProperty(member)?.GetCustomAttribute<JsonPropertyNameAttribute>()?.Name;
        return jsonName ?? JsonNamingPolicy.CamelCase.ConvertName(member);
    }
}

public static class ValidationExtensions
{
    /// <summary>Aplica a validação do DTO <typeparamref name="T"/> à rota.</summary>
    public static RouteHandlerBuilder WithValidation<T>(this RouteHandlerBuilder builder) where T : class
        => builder.AddEndpointFilter<ValidationFilter<T>>().ProducesValidationProblem();
}