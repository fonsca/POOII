using System.Net;
using System.Net.Http.Json;
using PrimeiraChamadaMed.Api.Tests.Infrastructure;

namespace PrimeiraChamadaMed.Api.Tests.Integration;

public class AuthEndpointsTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Mentor_criado_na_inicializacao_consegue_entrar()
    {
        var user = await LoginMentorAsync();

        Assert.Equal("mentor", user.Role);
        Assert.Equal("Mentor de Teste", user.Name);
    }

    [Fact]
    public async Task Senha_errada_retorna_401()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new { email = ApiFactory.MentorEmail, password = "senha-errada" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("E-mail ou senha incorretos.", await ReadDetailAsync(response));
    }

    [Fact]
    public async Task Formulario_vazio_retorna_erro_em_cada_campo()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login", new { email = "", password = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var fields = await ReadInvalidFieldsAsync(response);
        Assert.Contains("email", fields);
        Assert.Contains("password", fields);
    }
}