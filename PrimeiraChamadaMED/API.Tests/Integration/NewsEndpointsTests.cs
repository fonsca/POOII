using System.Net;
using System.Net.Http.Json;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Tests.Infrastructure;

namespace PrimeiraChamadaMed.Api.Tests.Integration;

public class NewsEndpointsTests(ApiFactory factory) : ApiTestBase(factory)
{
    private static object ValidNews(string title = "FUVEST abre inscrições") => new
    {
        institution = "FUVEST",
        title,
        description = "Inscrições abertas até o fim do mês.",
        deadline = "2026-12-01",
        color = "#3b82f6",
        icon = "📝"
    };

    [Fact]
    public async Task Aviso_publicado_aparece_no_mural_com_a_data_de_hoje()
    {
        var response = await Client.PostAsJsonAsync("/api/news", ValidNews());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<NewsResponse>();
        Assert.Equal("2026-11-18", created!.PublishDate);

        var news = await Client.GetFromJsonAsync<List<NewsResponse>>("/api/news");
        Assert.Contains(news!, n => n.Id == created.Id);
    }

    [Fact]
    public async Task Aviso_com_cor_invalida_retorna_erro_no_campo()
    {
        var response = await Client.PostAsJsonAsync("/api/news", new
        {
            institution = "ENEM", title = "Cronograma do ENEM", description = "Texto do aviso.",
            deadline = "2026-12-01", color = "azul", icon = "📝"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("color", await ReadInvalidFieldsAsync(response));
    }

    [Fact]
    public async Task Aviso_pode_ser_editado_e_excluido()
    {
        var createResponse = await Client.PostAsJsonAsync("/api/news", ValidNews());
        var created = await createResponse.Content.ReadFromJsonAsync<NewsResponse>();

        var update = await Client.PutAsJsonAsync($"/api/news/{created!.Id}", ValidNews("Título corrigido"));
        var delete = await Client.DeleteAsync($"/api/news/{created.Id}");
        var updateAfterDelete = await Client.PutAsJsonAsync($"/api/news/{created.Id}", ValidNews());

        Assert.Equal(HttpStatusCode.NoContent, update.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateAfterDelete.StatusCode);
    }
}