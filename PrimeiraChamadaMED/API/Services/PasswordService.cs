using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using PrimeiraChamadaMed.Api.Models;

namespace PrimeiraChamadaMed.Api.Services;

public enum PasswordCheck { Invalid, Valid, ValidButNeedsRehash }

/// <summary>Gera e confere hashes de senha com o PasswordHasher do ASP.NET Core Identity (PBKDF2).</summary>
public sealed class PasswordService(IPasswordHasher<User> hasher)
{
    public string Hash(User user, string password) => hasher.HashPassword(user, password);

    public PasswordCheck Verify(User user, string password)
    {
        if (!IsHashed(user.PasswordHash))
        {
            // Senha antiga, gravada em texto puro antes da refatoração.
            var matches = CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(user.PasswordHash),
                Encoding.UTF8.GetBytes(password));
            return matches ? PasswordCheck.ValidButNeedsRehash : PasswordCheck.Invalid;
        }

        return hasher.VerifyHashedPassword(user, user.PasswordHash, password) switch
        {
            PasswordVerificationResult.Success => PasswordCheck.Valid,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.ValidButNeedsRehash,
            _ => PasswordCheck.Invalid
        };
    }

    /// <summary>O hash do Identity (formato v3) é Base64 e começa pelo byte 0x01.</summary>
    public static bool IsHashed(string stored)
    {
        var buffer = new byte[stored.Length];
        return Convert.TryFromBase64String(stored, buffer, out var length)
            && length > 13
            && buffer[0] == 0x01;
    }
}