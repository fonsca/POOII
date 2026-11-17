using System.Net.Http.Json;
using System.Text.Json;
using PrimeiraChamadaMed.Api.Dtos;

namespace PrimeiraChamadaMed.Api.Tests.Infrastructure;

/// <summary>Base dos testes de rota: cliente HTTP e atalhos para montar os cenários.</summary>
public abstract class ApiTestBase : IClassFixture<ApiFactory>
{
    /// <summary>Segunda-feira da semana do relógio de teste.</summary>
    protected const string CurrentWeek = "2026-11-16";

    protected ApiTestBase(ApiFactory factory)
    {
        Factory = factory;
        Factory.EnsureTestDatabase();
        Client = factory.CreateClient();
    }

    protected ApiFactory Factory { get; }
    protected HttpClient Client { get; }

    protected static string UniqueEmail() => $"aluno-{Guid.NewGuid():N}@teste.com";

    protected async Task<LoginResponse> LoginAsync(string email, string password)
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    protected Task<LoginResponse> LoginMentorAsync() =>
        LoginAsync(ApiFactory.MentorEmail, ApiFactory.MentorPassword);

    /// <summary>Cadastra um aluno válido pelo mentor de teste e devolve o id.</summary>
    protected async Task<long> CreateStudentAsync(string? email = null, string password = "senha123")
    {
        var mentor = await LoginMentorAsync();
        var response = await Client.PostAsJsonAsync("/api/students", new
        {
            mentorId = mentor.Id,
            name = "Aluno de Teste",
            email = email ?? UniqueEmail(),
            course = "Medicina",
            phone = "(27) 99999-0000",
            initialPassword = password
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<StudentSummaryResponse>())!.Id;
    }

    protected Task<HttpResponseMessage> PostBlockAsync(long studentId, string day, string time, string week) =>
        Client.PostAsJsonAsync("/api/planner", new
        {
            userId = studentId,
            subject = "bio",
            topic = "Citologia",
            subtopics = "Exercícios da página 40",
            day,
            time,
            hours = 1,
            data_semana = week
        });

    protected async Task<PlannerItemResponse> CreateBlockAsync(
        long studentId, string day = "Quarta", string time = "08:00", string week = CurrentWeek)
    {
        var response = await PostBlockAsync(studentId, day, time, week);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PlannerItemResponse>())!;
    }

    protected async Task<StudentDetailResponse> GetStudentAsync(long id, string? week = null)
    {
        var url = week is null ? $"/api/students/{id}" : $"/api/students/{id}?semana={week}";
        return (await Client.GetFromJsonAsync<StudentDetailResponse>(url))!;
    }

    /// <summary>Texto "detail" de uma resposta de erro (Problem Details).</summary>
    protected static async Task<string?> ReadDetailAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("detail", out var detail) ? detail.GetString() : null;
    }

    /// <summary>Nomes dos campos com erro numa resposta de validação.</summary>
    protected static async Task<string[]> ReadInvalidFieldsAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("errors").EnumerateObject().Select(field => field.Name).ToArray();
    }
}