using System.Globalization;
using PrimeiraChamadaMed.Api.Services;

namespace PrimeiraChamadaMed.Api.Tests.Unit;

/// <summary>Regras de calendário e de ofensiva (funções puras, sem banco e sem HTTP).</summary>
public class StudyCalendarTests
{
    private static readonly DateOnly Today = Date("2026-11-18"); // quarta-feira

    private static DateOnly Date(string text) =>
        DateOnly.ParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    [Theory]
    [InlineData("2026-11-16", "2026-11-16")] // segunda
    [InlineData("2026-11-18", "2026-11-16")] // quarta
    [InlineData("2026-11-22", "2026-11-16")] // domingo ainda é da semana que começou na segunda
    [InlineData("2026-11-23", "2026-11-23")] // segunda seguinte
    public void StartOfWeek_volta_para_a_segunda_feira(string date, string expectedMonday)
    {
        Assert.Equal(Date(expectedMonday), StudyCalendar.StartOfWeek(Date(date)));
    }

    [Theory]
    [InlineData("2026-11-17", "Terça")]
    [InlineData("2026-11-21", "Sábado")]
    [InlineData("2026-11-22", "Domingo")]
    public void DayName_usa_os_mesmos_nomes_do_planner(string date, string expected)
    {
        Assert.Equal(expected, StudyCalendar.DayName(Date(date)));
    }

    [Fact]
    public void DateOf_junta_a_semana_e_o_dia_do_bloco()
    {
        Assert.Equal(Date("2026-11-18"), StudyCalendar.DateOf("2026-11-16", "Quarta"));
        Assert.Null(StudyCalendar.DateOf("2026-11-16", "Feriado"));
        Assert.Null(StudyCalendar.DateOf("semana-invalida", "Quarta"));
    }

    [Fact]
    public void TryResolveWeek_usa_a_semana_atual_quando_nada_e_informado()
    {
        Assert.True(StudyCalendar.TryResolveWeek(null, Today, out var week));
        Assert.Equal(Date("2026-11-16"), week);
    }

    [Fact]
    public void TryResolveWeek_recusa_data_fora_do_formato()
    {
        Assert.False(StudyCalendar.TryResolveWeek("16/11/2026", Today, out _));
    }

    [Theory]
    [InlineData(0, "", 1)]            // primeiro dia de estudo
    [InlineData(3, "2026-11-17", 4)]  // estudou ontem: a ofensiva continua
    [InlineData(5, "2026-11-14", 1)]  // ficou dias sem estudar: recomeça do 1
    public void NextStreak_calcula_a_nova_ofensiva(int stored, string lastStudyDay, int expected)
    {
        Assert.Equal(expected, StudyCalendar.NextStreak(stored, lastStudyDay, Today));
    }

    [Fact]
    public void NextStreak_nao_conta_o_mesmo_dia_duas_vezes()
    {
        Assert.Null(StudyCalendar.NextStreak(2, "2026-11-18", Today));
    }

    [Theory]
    [InlineData("2026-11-18", 4)] // estudou hoje
    [InlineData("2026-11-17", 4)] // estudou ontem: ainda pode manter hoje
    [InlineData("2026-11-16", 0)] // ontem passou sem estudo
    [InlineData("", 0)]           // nunca estudou
    public void CurrentStreak_zera_quando_o_aluno_perde_um_dia(string lastStudyDay, int expected)
    {
        Assert.Equal(expected, StudyCalendar.CurrentStreak(4, lastStudyDay, Today));
    }
}