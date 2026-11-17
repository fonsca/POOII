using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PrimeiraChamadaMed.Api.Dtos;

/// <summary>Formulário de login.</summary>
public sealed class LoginRequest
{
    [Required(ErrorMessage = "Informe o e-mail.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a senha.")]
    public string Password { get; init; } = string.Empty;
}

/// <summary>Usuário autenticado, no formato que o front guarda na sessão.</summary>
public sealed record LoginResponse(
    long Id,
    string Name,
    string Role,
    [property: JsonPropertyName("foto")] string Photo);