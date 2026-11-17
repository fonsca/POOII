using System.Net;
using System.Text;
using PrimeiraChamadaMed.Api.Tests.Infrastructure;

namespace PrimeiraChamadaMed.Api.Tests.Integration;

/// <summary>Tratamento de erros centralizado (GlobalExceptionHandler + Problem Details).</summary>
public class ErrorHandlingTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Json_malformado_retorna_400_e_nao_erro_interno()
    {
        using var content = new StringContent("{ isto não é json", Encoding.UTF8, "application/json");

        var response = await Client.PostAsync("/api/news", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Erros_seguem_o_formato_problem_details()
    {
        var response = await Client.DeleteAsync("/api/planner/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("Bloco de estudo não encontrado.", await ReadDetailAsync(response));
    }
}