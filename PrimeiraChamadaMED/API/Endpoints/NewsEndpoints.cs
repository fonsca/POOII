using Microsoft.AspNetCore.Http.HttpResults;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Services;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Endpoints;

/// <summary>Módulo do mural de avisos: /api/news.</summary>
public static class NewsEndpoints
{
    public static IEndpointRouteBuilder MapNewsEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/news").WithTags("Mural de avisos");

        group.MapGet("/", ListAsync).WithName("ListNews");
        group.MapPost("/", CreateAsync).WithName("CreateNews").WithValidation<NewsRequest>();
        group.MapPut("/{id:long}", UpdateAsync).WithName("UpdateNews").WithValidation<NewsRequest>();
        group.MapDelete("/{id:long}", DeleteAsync).WithName("DeleteNews");

        return routes;
    }

    private static async Task<Ok<IReadOnlyList<NewsResponse>>> ListAsync(INewsService news, CancellationToken ct) =>
        TypedResults.Ok(await news.ListAsync(ct));

    private static async Task<Created<NewsResponse>> CreateAsync(
        NewsRequest request, INewsService news, CancellationToken ct)
    {
        var created = await news.CreateAsync(request, ct);
        return TypedResults.Created($"/api/news/{created.Id}", created);
    }

    private static async Task<NoContent> UpdateAsync(
        long id, NewsRequest request, INewsService news, CancellationToken ct)
    {
        await news.UpdateAsync(id, request, ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> DeleteAsync(long id, INewsService news, CancellationToken ct)
    {
        await news.DeleteAsync(id, ct);
        return TypedResults.NoContent();
    }
}