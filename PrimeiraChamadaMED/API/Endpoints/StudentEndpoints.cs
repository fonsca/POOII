using Microsoft.AspNetCore.Http.HttpResults;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Services;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Endpoints;

/// <summary>Módulo de alunos: /api/students.</summary>
public static class StudentEndpoints
{
    public static IEndpointRouteBuilder MapStudentEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/students").WithTags("Alunos");

        group.MapGet("/", ListAsync).WithName("ListStudents");
        group.MapGet("/{id:long}", GetAsync).WithName("GetStudent");
        group.MapPost("/", CreateAsync).WithName("CreateStudent")
            .WithValidation<CreateStudentRequest>();
        group.MapPut("/{id:long}", UpdateAsync).WithName("UpdateStudent")
            .WithValidation<UpdateStudentRequest>();
        group.MapPut("/{id:long}/profile", UpdateProfileAsync).WithName("UpdateStudentProfile")
            .WithValidation<UpdateProfileRequest>();
        group.MapDelete("/{id:long}", DeleteAsync).WithName("DeleteStudent");

        return routes;
    }

    // GET /api/students?mentorId=1
    private static async Task<Ok<IReadOnlyList<StudentSummaryResponse>>> ListAsync(
        long mentorId, IStudentService students, CancellationToken ct) =>
        TypedResults.Ok(await students.ListByMentorAsync(mentorId, ct));

    // GET /api/students/5?semana=2026-11-16
    private static async Task<Ok<StudentDetailResponse>> GetAsync(
        long id, string? semana, IStudentService students, CancellationToken ct) =>
        TypedResults.Ok(await students.GetDetailAsync(id, semana, ct));

    private static async Task<Created<StudentSummaryResponse>> CreateAsync(
        CreateStudentRequest request, IStudentService students, CancellationToken ct)
    {
        var student = await students.CreateAsync(request, ct);
        return TypedResults.Created($"/api/students/{student.Id}", student);
    }

    private static async Task<NoContent> UpdateAsync(
        long id, UpdateStudentRequest request, IStudentService students, CancellationToken ct)
    {
        await students.UpdateAsync(id, request, ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> UpdateProfileAsync(
        long id, UpdateProfileRequest request, IStudentService students, CancellationToken ct)
    {
        await students.UpdateProfileAsync(id, request, ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> DeleteAsync(long id, IStudentService students, CancellationToken ct)
    {
        await students.DeleteAsync(id, ct);
        return TypedResults.NoContent();
    }
}