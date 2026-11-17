namespace PrimeiraChamadaMed.Api.Models;

/// <summary>Dados acadêmicos do aluno (tabela STUDENT_PROFILE).</summary>
public class StudentProfile
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long MentorId { get; set; }
    public string Course { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? BirthDate { get; set; }
    public string? Notes { get; set; }

    public User? User { get; set; }
    public User? Mentor { get; set; }
}