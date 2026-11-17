using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Data;
using PrimeiraChamadaMed.Api.Endpoints;
using PrimeiraChamadaMed.Api.Errors;
using PrimeiraChamadaMed.Api.Models;
using PrimeiraChamadaMed.Api.Services;

namespace PrimeiraChamadaMed.Api;

/// <summary>
/// Fábrica da aplicação: registra serviços (injeção de dependência), middlewares e rotas.
/// Papel equivalente ao padrão Application Factory (create_app) do Flask.
/// </summary>
public static class AppFactory
{
    public static WebApplication Create(string[] args)
    {
        // Carrega o arquivo .env (se existir) para as variáveis de ambiente.
        DotNetEnv.Env.TraversePath().Load();

        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.UseUrls(builder.Configuration["Api:Url"] ?? "http://localhost:5000");

        ConfigureServices(builder.Services, builder.Configuration);

        var app = builder.Build();
        ConfigurePipeline(app);
        MapEndpoints(app);
        return app;
    }

    private static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Banco (EF Core + SQLite). A connection string é lida ao criar o DbContext,
        // o que permite aos testes trocarem o banco só pela configuração.
        services.AddDbContext<AppDbContext>((provider, options) =>
            options.UseSqlite(BuildConnectionString(
                provider.GetRequiredService<IConfiguration>(),
                provider.GetRequiredService<IHostEnvironment>())));

        // Serviços da aplicação
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<PasswordService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IPlannerService, PlannerService>();
        services.AddScoped<INewsService, NewsService>();

        // Erros padronizados no formato Problem Details (RFC 9457)
        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();

        // CORS liberado só para as origens do front definidas no .env
        var origins = (configuration["Cors:AllowedOrigins"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        services.AddCors(options => options.AddDefaultPolicy(policy =>
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));
    }

    private static void ConfigurePipeline(WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseCors();
    }

    private static void MapEndpoints(WebApplication app)
    {
        // Cada módulo registra seu próprio grupo de rotas (equivalente aos Blueprints).
        var api = app.MapGroup("/api");
        api.MapAuthEndpoints();
        api.MapStudentEndpoints();
        api.MapPlannerEndpoints();
        api.MapNewsEndpoints();
    }

    private static string BuildConnectionString(IConfiguration configuration, IHostEnvironment environment)
    {
        var raw = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Configure ConnectionStrings__Default no arquivo .env.");

        // Caminhos relativos são resolvidos a partir da pasta da API.
        var connection = new SqliteConnectionStringBuilder(raw);
        if (!Path.IsPathRooted(connection.DataSource) && connection.DataSource != ":memory:")
        {
            connection.DataSource = Path.GetFullPath(
                Path.Combine(environment.ContentRootPath, connection.DataSource));
        }
        return connection.ToString();
    }
}