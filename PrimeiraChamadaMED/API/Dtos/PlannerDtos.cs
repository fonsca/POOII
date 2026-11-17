using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using PrimeiraChamadaMed.Api.Models;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Dtos;

/// <summary>Formulário do bloco de estudo (modal do mentor).</summary>
public class UpdatePlannerItemRequest
{
    [AllowedValues("bio", "mat", "fis", "qui", "port", "hist", "geo", "rev",
        ErrorMessage = "Escolha uma disciplina válida.")]
    public string Subject { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o tópico principal.")]
    [StringLength(120, ErrorMessage = "O tópico deve ter no máximo 120 caracteres.")]
    public string Topic { get; init; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Os subtópicos devem ter no máximo 1000 caracteres.")]
    public string? Subtopics { get; init; }

    [AllowedValues("Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
        ErrorMessage = "Dia da semana inválido.")]
    public string Day { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o horário.")]
    [RegularExpression(Patterns.Time, ErrorMessage = "Horário inválido. Use o formato HH:mm.")]
    public string Time { get; init; } = string.Empty;

    [Range(0.5, 12, ErrorMessage = "A duração deve ficar entre 0,5 e 12 horas.")]
    public double Hours { get; init; } = 1;

    [JsonPropertyName("data_semana")]
    [Required(ErrorMessage = "Informe a semana do bloco.")]
    [IsoDate(MustBeMonday = true, ErrorMessage = "A semana deve começar numa segunda-feira (AAAA-MM-DD).")]
    public string WeekStart { get; init; } = string.Empty;
}

/// <summary>Criação de bloco: mesmo formulário + o aluno dono do bloco.</summary>
public sealed class CreatePlannerItemRequest : UpdatePlannerItemRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Aluno inválido.")]
    public long UserId { get; init; }
}

/// <summary>Marcar ou desmarcar um bloco como concluído (aluno).</summary>
public sealed class PlannerStatusRequest
{
    [Required(ErrorMessage = "Informe se o bloco foi concluído.")]
    public bool? Done { get; init; }
}

/// <summary>Tempo registrado no cronômetro (aluno).</summary>
public sealed class PlannerTimeRequest
{
    [JsonPropertyName("tempo_gasto")]
    [Required(ErrorMessage = "Informe o tempo gasto.")]
    [Range(0, 86_400, ErrorMessage = "O tempo gasto deve ficar entre 0 e 24 horas.")]
    public int? TimeSpentSeconds { get; init; }
}

/// <summary>Bloco de estudo no formato que o front já usa.</summary>
public sealed record PlannerItemResponse(
    long Id,
    string Day,
    string Time,
    string Subject,
    string Topic,
    string Subtopics,
    double Hours,
    bool Done,
    [property: JsonPropertyName("tempo_gasto_segundos")] int TimeSpentSeconds,
    [property: JsonPropertyName("data_semana")] string WeekStart)
{
    public static PlannerItemResponse From(PlannerItem item) => new(
        item.Id, item.Day, item.Time ?? string.Empty, item.Subject, item.Topic,
        item.Subtopics ?? string.Empty, item.Hours, item.Done,
        item.TimeSpentSeconds ?? 0, item.WeekStart ?? string.Empty);
}

/// <summary>Resultado de marcar um bloco: status + ofensiva atualizada.</summary>
public sealed record PlannerStatusResponse(bool Done, int Streak);