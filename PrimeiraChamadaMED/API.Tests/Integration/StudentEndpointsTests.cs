using System.Net;
using System.Net.Http.Json;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Tests.Infrastructure;

namespace PrimeiraChamadaMed.Api.Tests.Integration;

public class StudentEndpointsTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Aluno_cadastrado_aparece_na_lista_do_mentor()
    {
        var mentor = await LoginMentorAsync();
        var email = UniqueEmail();
        var id = await CreateStudentAsync(email);

        var students = await Client.GetFromJsonAsync<List<StudentSummaryResponse>>($"/api/students?mentorId={mentor.Id}");

        Assert.Contains(students!, s => s.Id == id && s.Email == email);
    }

    [Fact]
    public async Task Aluno_cadastrado_entra_com_a_senha_inicial()
    {
        var email = UniqueEmail();
        await CreateStudentAsync(email, password: "minhasenha");

        var user = await LoginAsync(email, "minhasenha");

        Assert.Equal("student", user.Role);
    }

    [Fact]
    public async Task Cadastro_invalido_retorna_400_com_os_campos_errados()
    {
        var mentor = await LoginMentorAsync();

        var response = await Client.PostAsJsonAsync("/api/students", new
        {
            mentorId = mentor.Id,
            name = "Ana Lima",
            email = "nao-e-email",
            course = "Medicina",
            phone = "123",
            initialPassword = "1"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var fields = await ReadInvalidFieldsAsync(response);
        Assert.Contains("email", fields);
        Assert.Contains("phone", fields);
        Assert.Contains("initialPassword", fields);
    }

    [Fact]
    public async Task Email_repetido_retorna_409()
    {
        var email = UniqueEmail();
        await CreateStudentAsync(email);
        var mentor = await LoginMentorAsync();

        var response = await Client.PostAsJsonAsync("/api/students", new
        {
            mentorId = mentor.Id, name = "Outro Aluno", email, course = "Direito", initialPassword = "senha123"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("Já existe um usuário com este e-mail.", await ReadDetailAsync(response));
    }

    [Fact]
    public async Task Detalhe_do_aluno_usa_a_semana_atual_por_padrao()
    {
        var id = await CreateStudentAsync();

        var detail = await GetStudentAsync(id);

        Assert.Equal(CurrentWeek, detail.CurrentWeek);
        Assert.Empty(detail.Planner);
        Assert.Equal(0, detail.Student.Streak);
    }

    [Fact]
    public async Task Edicao_atualiza_os_dados_do_aluno()
    {
        var id = await CreateStudentAsync();
        var newEmail = UniqueEmail();

        var response = await Client.PutAsJsonAsync($"/api/students/{id}", new
        {
            name = "Nome Atualizado", email = newEmail, course = "Odontologia", phone = "(27) 3333-4444"
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var student = (await GetStudentAsync(id)).Student;
        Assert.Equal("Nome Atualizado", student.Name);
        Assert.Equal(newEmail, student.Email);
        Assert.Equal("Odontologia", student.Course);
    }

    [Fact]
    public async Task Exclusao_remove_o_aluno_junto_com_os_blocos()
    {
        var id = await CreateStudentAsync();
        await CreateBlockAsync(id);

        var response = await Client.DeleteAsync($"/api/students/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/students/{id}")).StatusCode);
    }

    [Fact]
    public async Task Aluno_inexistente_retorna_404()
    {
        var response = await Client.GetAsync("/api/students/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Aluno não encontrado.", await ReadDetailAsync(response));
    }
}