namespace PrimeiraChamadaMed.Api.Tests.Infrastructure;

/// <summary>Relógio parado numa data conhecida, para os testes não dependerem do dia em que rodam.</summary>
public sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;

    public override DateTimeOffset GetUtcNow() => Now.ToUniversalTime();

    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}