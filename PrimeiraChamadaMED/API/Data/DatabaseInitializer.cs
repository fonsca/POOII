using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Models;
using PrimeiraChamadaMed.Api.Services;

namespace PrimeiraChamadaMed.Api.Data;

public static class DatabaseInitializer
{
    /// <summary>
    /// Cria o banco se ele não existir e garante ao menos um mentor para acessar o sistema.
    /// Num banco que já tem tabelas, o EnsureCreated não altera nada.
    /// </summary>
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DatabaseInitializer));

        await db.Database.EnsureCreatedAsync();

        var seed = app.Configuration.GetSection("Seed");
        var email = seed["MentorEmail"]?.Trim().ToLowerInvariant();
        var password = seed["MentorPassword"];

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password)) return;
        if (await db.Users.AnyAsync(u => u.UserType != UserTypes.Student)) return;

        var mentor = new User
        {
            Name = string.IsNullOrWhiteSpace(seed["MentorName"]) ? "Mentor" : seed["MentorName"]!.Trim(),
            Email = email,
            UserType = UserTypes.Mentor
        };
        mentor.PasswordHash = services.GetRequiredService<PasswordService>().Hash(mentor, password);

        db.Users.Add(mentor);
        await db.SaveChangesAsync();
        logger.LogInformation("Mentor inicial criado: {Email}", email);
    }
}