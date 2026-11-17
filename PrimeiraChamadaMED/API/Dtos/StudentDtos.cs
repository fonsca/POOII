using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using PrimeiraChamadaMed.Api.Services;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Dtos;

/// <summary>Formulário de edição do aluno (tela do mentor).</summary>
public class UpdateStudentRequest
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 100 caracteres.")]
    public string Name { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o e-mail.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(150, ErrorMessage = "O e-mail deve ter no máximo 150 caracteres.")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o curso ou objetivo.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "O curso deve ter entre 2 e 100 caracteres.")]
    public string Course { get; init; } = string.Empty;

    [RegularExpression(Patterns.Phone, ErrorMessage = "Telefone inválido. Use o formato (XX) XXXXX-XXXX.")]
    public string? Phone { get; init; }
}

/// <summary>Formulário de cadastro: reaproveita as regras da edição e acrescenta os dados iniciais.</summary>
public sealed class CreateStudentRequest : UpdateStudentRequest, IValidatableObject
{
    [Range(1, long.MaxValue, ErrorMessage = "Mentor inválido.")]
    public long MentorId { get; init; }

    [IsoDate]
    public string? BirthDate { get; init; }

    [StringLength(500, ErrorMessage = "As observações devem ter no máximo 500 caracteres.")]
    public string? Notes { get; init; }

    [Required(ErrorMessage = "Defina a senha inicial do aluno.")]
    [StringLength(64, MinimumLength = 6, ErrorMessage = "A senha inicial deve ter entre 6 e 64 caracteres.")]
    public string InitialPassword { get; init; } = string.Empty;

    /// <summary>Regra que depende do valor, não só do formato.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StudyCalendar.TryParseKey(BirthDate, out var birthDate)
            && birthDate > DateOnly.FromDateTime(DateTime.Today))
        {
            yield return new ValidationResult(
                "A data de nascimento não pode ser no futuro.", new[] { nameof(BirthDate) });
        }
    }
}

/// <summary>Edição do próprio perfil pelo aluno (nome e foto).</summary>
public sealed class UpdateProfileRequest
{
    [Required(ErrorMessage = "Informe o nome.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 100 caracteres.")]
    public string Name { get; init; } = string.Empty;

    /// <summary>Imagem em Base64 (data URL), até 2 MB.</summary>
    [JsonPropertyName("foto")]
    [MaxLength(3_000_000, ErrorMessage = "A foto deve ter no máximo 2 MB.")]
    [RegularExpression(Patterns.ImageDataUrl, ErrorMessage = "Envie uma imagem PNG, JPEG ou WEBP.")]
    public string? Photo { get; init; }
}

/// <summary>Item da lista de alunos do mentor.</summary>
public sealed record StudentSummaryResponse(long Id, string Name, string Email, string Course, string Phone);

/// <summary>Dados do aluno exibidos no planner e no perfil.</summary>
public sealed record StudentResponse(
    long Id,
    string Name,
    string Email,
    string Course,
    string Phone,
    [property: JsonPropertyName("foto")] string Photo,
    int Streak);

/// <summary>Aluno + blocos da semana pedida.</summary>
public sealed record StudentDetailResponse(
    StudentResponse Student,
    IReadOnlyList<PlannerItemResponse> Planner,
    [property: JsonPropertyName("semanaAtual")] string CurrentWeek);