namespace PrimeiraChamadaMed.Api.Models;

/// <summary>Aviso do mural (tabela NOTICIA).</summary>
public class NewsPost
{
    public long Id { get; set; }
    public string Institution { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PublishDate { get; set; } = string.Empty;
    public string Deadline { get; set; } = string.Empty;
    public string? Color { get; set; }
    public string? Icon { get; set; }
}