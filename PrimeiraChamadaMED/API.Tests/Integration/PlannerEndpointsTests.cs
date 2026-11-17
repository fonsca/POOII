using System.Net;
using System.Net.Http.Json;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Tests.Infrastructure;

namespace PrimeiraChamadaMed.Api.Tests.Integration;

public class PlannerEndpointsTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Bloco_criado_aparece_no_planner_da_semana()
    {
        var studentId = await CreateStudentAsync();

        var block = await CreateBlockAsync(studentId, day: "Quinta", time: "14:00");

        var saved = Assert.Single((await GetStudentAsync(studentId, CurrentWeek)).Planner);
        Assert.Equal(block.Id, saved.Id);
        Assert.Equal("Quinta", saved.Day);
        Assert.False(saved.Done);
    }

    [Fact]
    public async Task Bloco_nao_aparece_em_outra_semana()
    {
        var studentId = await CreateStudentAsync();
        await CreateBlockAsync(studentId);

        var nextWeek = await GetStudentAsync(studentId, "2026-11-23");

        Assert.Empty(nextWeek.Planner);
    }

    [Fact]
    public async Task Dois_blocos_no_mesmo_horario_retornam_409()
    {
        var studentId = await CreateStudentAsync();
        await CreateBlockAsync(studentId, day: "Sexta", time: "09:00");

        var response = await PostBlockAsync(studentId, "Sexta", "09:00", CurrentWeek);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Semana_que_nao_comeca_na_segunda_e_recusada()
    {
        var studentId = await CreateStudentAsync();

        var response = await PostBlockAsync(studentId, "Segunda", "08:00", week: "2026-11-18");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("data_semana", await ReadInvalidFieldsAsync(response));
    }

    [Fact]
    public async Task Concluir_bloco_de_hoje_inicia_a_ofensiva()
    {
        var studentId = await CreateStudentAsync();
        var block = await CreateBlockAsync(studentId, day: "Quarta"); // 18/11, o "hoje" dos testes

        var response = await Client.PatchAsJsonAsync($"/api/planner/{block.Id}/status", new { done = true });

        response.EnsureSuccessStatusCode();
        var status = await response.Content.ReadFromJsonAsync<PlannerStatusResponse>();
        Assert.True(status!.Done);
        Assert.Equal(1, status.Streak);
        Assert.Equal(1, (await GetStudentAsync(studentId)).Student.Streak);
    }

    [Fact]
    public async Task Concluir_bloco_de_outro_dia_nao_conta_para_a_ofensiva()
    {
        var studentId = await CreateStudentAsync();
        var block = await CreateBlockAsync(studentId, day: "Segunda");

        var response = await Client.PatchAsJsonAsync($"/api/planner/{block.Id}/status", new { done = true });

        var status = await response.Content.ReadFromJsonAsync<PlannerStatusResponse>();
        Assert.True(status!.Done);
        Assert.Equal(0, status.Streak);
    }

    [Fact]
    public async Task Estudar_em_dias_seguidos_aumenta_a_ofensiva()
    {
        var studentId = await CreateStudentAsync();
        var wednesday = await CreateBlockAsync(studentId, day: "Quarta");
        var thursday = await CreateBlockAsync(studentId, day: "Quinta");
        var originalNow = Factory.Clock.Now;

        try
        {
            await Client.PatchAsJsonAsync($"/api/planner/{wednesday.Id}/status", new { done = true });
            Factory.Clock.Now = originalNow.AddDays(1); // o relógio avança para quinta-feira
            var response = await Client.PatchAsJsonAsync($"/api/planner/{thursday.Id}/status", new { done = true });

            var status = await response.Content.ReadFromJsonAsync<PlannerStatusResponse>();
            Assert.Equal(2, status!.Streak);
        }
        finally
        {
            Factory.Clock.Now = originalNow;
        }
    }

    [Fact]
    public async Task Tempo_do_cronometro_e_salvo()
    {
        var studentId = await CreateStudentAsync();
        var block = await CreateBlockAsync(studentId);

        var response = await Client.PatchAsJsonAsync($"/api/planner/{block.Id}/time", new { tempo_gasto = 1500 });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var saved = Assert.Single((await GetStudentAsync(studentId)).Planner);
        Assert.Equal(1500, saved.TimeSpentSeconds);
    }

    [Fact]
    public async Task Bloco_excluido_nao_pode_mais_ser_alterado()
    {
        var studentId = await CreateStudentAsync();
        var block = await CreateBlockAsync(studentId);

        var delete = await Client.DeleteAsync($"/api/planner/{block.Id}");
        var update = await Client.PatchAsJsonAsync($"/api/planner/{block.Id}/status", new { done = true });

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
    }
}