using Microsoft.AspNetCore.Identity;
using PrimeiraChamadaMed.Api.Models;
using PrimeiraChamadaMed.Api.Services;

namespace PrimeiraChamadaMed.Api.Tests.Unit;

public class PasswordServiceTests
{
    private readonly PasswordService _passwords = new(new PasswordHasher<User>());
    private readonly User _user = new() { Email = "aluno@teste.com" };

    [Fact]
    public void Hash_nao_guarda_a_senha_em_texto_puro()
    {
        var hash = _passwords.Hash(_user, "senha123");

        Assert.NotEqual("senha123", hash);
        Assert.True(PasswordService.IsHashed(hash));
    }

    [Fact]
    public void Verify_aceita_a_senha_certa_e_recusa_a_errada()
    {
        _user.PasswordHash = _passwords.Hash(_user, "senha123");

        Assert.Equal(PasswordCheck.Valid, _passwords.Verify(_user, "senha123"));
        Assert.Equal(PasswordCheck.Invalid, _passwords.Verify(_user, "outra-senha"));
    }

    [Fact]
    public void Senha_antiga_em_texto_puro_e_aceita_e_marcada_para_conversao()
    {
        _user.PasswordHash = "1234";

        Assert.Equal(PasswordCheck.ValidButNeedsRehash, _passwords.Verify(_user, "1234"));
        Assert.Equal(PasswordCheck.Invalid, _passwords.Verify(_user, "4321"));
    }
}