using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PrimeiraChamadaMed.Api.Data;

namespace PrimeiraChamadaMed.Api.Tests.Infrastructure;

/// <summary>
/// Sobe a API em memória (TestServer) com um banco SQLite temporário e um relógio fixo.
/// No Flask, equivale a create_app() com configuração de teste + test_client().
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string MentorEmail = "admin@primeirachamada.com";
    public const string MentorPassword = "senha@123";

    private readonly string _databasePath =
        Path.Combine(Path.GetTempPath(), $"primeira-chamada-tests-{Guid.NewGuid():N}.db");

    /// <summary>"Agora" dos testes: quarta-feira, 18/11/2026, 10h. A semana começa em 16/11/2026.</summary>
    public FixedTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 11, 18, 10, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Mesmas chaves do .env, apontando para um banco descartável
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_databasePath}");
        builder.UseSetting("Seed:MentorName", "Mentor de Teste");
        builder.UseSetting("Seed:MentorEmail", MentorEmail);
        builder.UseSetting("Seed:MentorPassword", MentorPassword);

        // Troca o relógio real pelo relógio fixo, via injeção de dependência
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    /// <summary>Garante que os testes usam o banco temporário, nunca o SQLite.db de verdade.</summary>
    public void EnsureTestDatabase()
    {
        using var scope = Services.CreateScope();
        var dataSource = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.GetDbConnection().DataSource;
        if (!string.Equals(dataSource, _databasePath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Os testes não estão usando o banco temporário: {dataSource}");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;

        SqliteConnection.ClearAllPools(); // libera o arquivo para poder apagá-lo
        try { File.Delete(_databasePath); }
        catch (IOException) { /* arquivo temporário: se não der para apagar agora, o sistema limpa depois */ }
    }
}