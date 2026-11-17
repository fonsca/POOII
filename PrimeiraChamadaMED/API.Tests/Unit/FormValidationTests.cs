using System.ComponentModel.DataAnnotations;
using System.Globalization;
using PrimeiraChamadaMed.Api.Dtos;

namespace PrimeiraChamadaMed.Api.Tests.Unit;

/// <summary>Regras dos formulários, testadas direto nos DTOs (sem subir a API).</summary>
public class FormValidationTests
{
    private static CreateStudentRequest ValidStudent(string birthDate = "2008-03-10") => new()
    {
        MentorId = 1,
        Name = "Maria Souza",
        Email = "maria@teste.com",
        Course = "Medicina",
        Phone = "(27) 99999-0000",
        BirthDate = birthDate,
        InitialPassword = "senha123"
    };

    private static string[] InvalidMembers(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results.SelectMany(result => result.MemberNames).ToArray();
    }

    [Fact]
    public void Cadastro_valido_nao_tem_erros()
    {
        Assert.Empty(InvalidMembers(ValidStudent()));
    }

    [Fact]
    public void Cadastro_aponta_cada_campo_invalido()
    {
        var request = new CreateStudentRequest
        {
            MentorId = 1,
            Name = "Al",               // curto demais
            Email = "email-invalido",
            Course = "Medicina",
            Phone = "27999",           // fora do formato (XX) XXXXX-XXXX
            InitialPassword = "123"    // menos de 6 caracteres
        };

        var invalid = InvalidMembers(request);

        Assert.Contains(nameof(CreateStudentRequest.Name), invalid);
        Assert.Contains(nameof(CreateStudentRequest.Email), invalid);
        Assert.Contains(nameof(CreateStudentRequest.Phone), invalid);
        Assert.Contains(nameof(CreateStudentRequest.InitialPassword), invalid);
    }

    [Fact]
    public void Data_de_nascimento_no_futuro_e_recusada()
    {
        var future = DateTime.Today.AddYears(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        Assert.Contains(nameof(CreateStudentRequest.BirthDate), InvalidMembers(ValidStudent(future)));
    }

    [Theory]
    [InlineData("2026-11-16", true)]   // segunda-feira
    [InlineData("2026-11-18", false)]  // quarta-feira
    [InlineData("16/11/2026", false)]  // formato errado
    public void Semana_do_bloco_precisa_comecar_na_segunda(string week, bool valid)
    {
        var request = new UpdatePlannerItemRequest
        {
            Subject = "bio", Topic = "Citologia", Day = "Segunda", Time = "08:00", Hours = 1, WeekStart = week
        };

        var weekIsInvalid = InvalidMembers(request).Contains(nameof(UpdatePlannerItemRequest.WeekStart));

        Assert.Equal(!valid, weekIsInvalid);
    }
}