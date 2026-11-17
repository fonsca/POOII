using System.Globalization;

namespace PrimeiraChamadaMed.Api.Services;

/// <summary>
/// Regras de calendário do planner: semanas (começam na segunda), dias da semana e ofensiva.
/// São funções puras, fáceis de testar.
/// </summary>
public static class StudyCalendar
{
    public const string DateFormat = "yyyy-MM-dd";

    /// <summary>Horas de estudo concluídas no dia necessárias para manter a ofensiva.</summary>
    public const double MinimumHoursForStreak = 0.5;

    private static readonly string[] Days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

    /// <summary>Dias na ordem do planner, com os mesmos nomes que o front grava.</summary>
    public static IReadOnlyList<string> DayNames => Days;

    /// <summary>Data de hoje no fuso local do servidor.</summary>
    public static DateOnly Today(this TimeProvider clock) => DateOnly.FromDateTime(clock.GetLocalNow().DateTime);

    public static string ToKey(DateOnly date) => date.ToString(DateFormat, CultureInfo.InvariantCulture);

    public static bool TryParseKey(string? text, out DateOnly date) =>
        DateOnly.TryParseExact(text, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    /// <summary>Segunda-feira da semana de <paramref name="date"/>.</summary>
    public static DateOnly StartOfWeek(DateOnly date) => date.AddDays(-DayIndex(date));

    /// <summary>Nome do dia como o planner usa ("Segunda" ... "Domingo").</summary>
    public static string DayName(DateOnly date) => Days[DayIndex(date)];

    /// <summary>Semana pedida pelo front (qualquer data dela) ou a semana atual, se nada for informado.</summary>
    public static bool TryResolveWeek(string? requested, DateOnly today, out DateOnly weekStart)
    {
        if (string.IsNullOrWhiteSpace(requested))
        {
            weekStart = StartOfWeek(today);
            return true;
        }

        var valid = TryParseKey(requested, out var date);
        weekStart = valid ? StartOfWeek(date) : default;
        return valid;
    }

    /// <summary>Data real de um bloco: semana 2026-11-16 + "Terça" = 2026-11-17.</summary>
    public static DateOnly? DateOf(string? weekStart, string day)
    {
        var index = Array.IndexOf(Days, day);
        if (index < 0 || !TryParseKey(weekStart, out var monday)) return null;
        return monday.AddDays(index);
    }

    /// <summary>Ofensiva exibida: vale enquanto o último dia de estudo for hoje ou ontem.</summary>
    public static int CurrentStreak(int storedStreak, string? lastStudyDay, DateOnly today) =>
        TryParseKey(lastStudyDay, out var last) && last >= today.AddDays(-1) ? storedStreak : 0;

    /// <summary>Nova ofensiva quando o aluno cumpre a meta do dia. Retorna null se hoje já foi contado.</summary>
    public static int? NextStreak(int storedStreak, string? lastStudyDay, DateOnly today)
    {
        if (!TryParseKey(lastStudyDay, out var last)) return 1;
        if (last >= today) return null;
        return last == today.AddDays(-1) ? storedStreak + 1 : 1;
    }

    private static int DayIndex(DateOnly date) => ((int)date.DayOfWeek + 6) % 7;
}