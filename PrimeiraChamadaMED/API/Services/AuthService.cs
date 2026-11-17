using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Data;
using PrimeiraChamadaMed.Api.Dtos;

namespace PrimeiraChamadaMed.Api.Services;

public interface IAuthService
{
    /// <summary>Confere e-mail e senha. Retorna null quando não conferem.</summary>
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct);
}

public sealed class AuthService(
    AppDbContext db,
    PasswordService passwords,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

        var check = user is null ? PasswordCheck.Invalid : passwords.Verify(user, request.Password);
        if (user is null || check == PasswordCheck.Invalid)
        {
            logger.LogWarning("Tentativa de login recusada.");
            return null;
        }

        if (check == PasswordCheck.ValidButNeedsRehash)
        {
            // Senhas antigas (texto puro) viram hash no primeiro login de cada usuário.
            user.PasswordHash = passwords.Hash(user, request.Password);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Senha do usuário {UserId} convertida para hash.", user.Id);
        }

        var role = user.IsStudent ? "student" : "mentor";
        logger.LogInformation("Login do usuário {UserId} ({Role}).", user.Id, role);
        return new LoginResponse(user.Id, user.Name, role, user.Photo ?? string.Empty);
    }
}