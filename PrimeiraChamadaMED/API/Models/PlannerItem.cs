namespace PrimeiraChamadaMed.Api.Models;

/// <summary>Bloco de estudo do planner semanal (tabela PLANNER_ITEM).</summary>
public class PlannerItem
{
    public long Id { get; set; }
    public long UserId { get; set; }
    /// <summary>Dia da semana por extenso: "Segunda" ... "Domingo".</summary>
    public string Day { get; set; } = string.Empty;
    /// <summary>Horário de início (HH:mm).</summary>
    public string? Time { get; set; }
    /// <summary>Código da disciplina: bio, mat, fis, qui, port, hist, geo ou rev.</summary>
    public string Subject { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Subtopics { get; set; }
    public double Hours { get; set; } = 1;
    public bool Done { get; set; }
    public int? TimeSpentSeconds { get; set; } = 0;
    /// <summary>Segunda-feira da semana do bloco (AAAA-MM-DD).</summary>
    public string? WeekStart { get; set; } = string.Empty;

    public User? User { get; set; }
}