namespace PrimeiraChamadaMed.Api.Models;

/// <summary>Usuário do sistema (tabela USUARIO): aluno ou mentor.</summary>
public class User
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string UserType { get; set; } = UserTypes.Student;
    public int? StudyStreak { get; set; } = 0;
    public string? Photo { get; set; } = string.Empty;
    public string? LastStreakDate { get; set; } = string.Empty;

    public StudentProfile? StudentProfile { get; set; }
    public List<StudentProfile> MentoredStudents { get; set; } = [];
    public List<PlannerItem> PlannerItems { get; set; } = [];

    /// <summary>Calculado em memória (não é coluna do banco).</summary>
    public bool IsStudent => UserType.Equals(UserTypes.Student, StringComparison.OrdinalIgnoreCase);
}

public static class UserTypes
{
    public const string Student = "Estudante";
    public const string Mentor = "Mentor";
}