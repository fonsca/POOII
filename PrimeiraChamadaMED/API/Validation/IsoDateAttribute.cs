using System.ComponentModel.DataAnnotations;
using PrimeiraChamadaMed.Api.Services;

namespace PrimeiraChamadaMed.Api.Validation;

/// <summary>Validador próprio: data no formato AAAA-MM-DD, opcionalmente exigindo segunda-feira.</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class IsoDateAttribute : ValidationAttribute
{
    public IsoDateAttribute() : base("Informe uma data válida (AAAA-MM-DD).") { }

    public bool MustBeMonday { get; set; }

    public override bool IsValid(object? value)
    {
        if (value is null || value is string { Length: 0 }) return true; // [Required] cuida do obrigatório
        if (value is not string text || !StudyCalendar.TryParseKey(text, out var date)) return false;
        return !MustBeMonday || date.DayOfWeek == DayOfWeek.Monday;
    }
}