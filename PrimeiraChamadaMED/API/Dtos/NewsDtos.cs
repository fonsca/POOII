using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using PrimeiraChamadaMed.Api.Models;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Dtos;

/// <summary>Formulário de aviso do mural (criar e editar).</summary>
public sealed class NewsRequest
{
    [Required(ErrorMessage = "Informe a instituição.")]
    [StringLength(60, ErrorMessage = "A instituição deve ter no máximo 60 caracteres.")]
    public string Institution { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe o título.")]
    [StringLength(150, MinimumLength = 5, ErrorMessage = "O título deve ter entre 5 e 150 caracteres.")]
    public string Title { get; init; } = string.Empty;

    [Required(ErrorMessage = "Escreva o texto do aviso.")]
    [StringLength(1000, ErrorMessage = "O texto deve ter no máximo 1000 caracteres.")]
    public string Description { get; init; } = string.Empty;

    [Required(ErrorMessage = "Informe a data limite.")]
    [IsoDate]
    public string Deadline { get; init; } = string.Empty;

    [Required(ErrorMessage = "Escolha uma cor.")]
    [RegularExpression(Patterns.HexColor, ErrorMessage = "Cor inválida. Use o formato #RRGGBB.")]
    public string Color { get; init; } = "#3b82f6";

    [Required(ErrorMessage = "Informe um ícone.")]
    [StringLength(16, ErrorMessage = "Use um emoji como ícone.")]
    public string Icon { get; init; } = "📰";
}

/// <summary>Aviso no formato que o front já usa.</summary>
public sealed record NewsResponse(
    long Id,
    string Institution,
    string Title,
    string Description,
    [property: JsonPropertyName("publish_date")] string PublishDate,
    string Deadline,
    string Color,
    string Icon)
{
    public static NewsResponse From(NewsPost news) => new(
        news.Id, news.Institution, news.Title, news.Description, news.PublishDate,
        news.Deadline, news.Color ?? "#3b82f6", news.Icon ?? "📰");
}