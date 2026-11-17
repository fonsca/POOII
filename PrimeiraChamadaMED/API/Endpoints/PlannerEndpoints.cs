using Microsoft.AspNetCore.Http.HttpResults;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Services;
using PrimeiraChamadaMed.Api.Validation;

namespace PrimeiraChamadaMed.Api.Endpoints;

/// <summary>Módulo do planner: /api/planner.</summary>
public static class PlannerEndpoints
{
    public static IEndpointRouteBuilder MapPlannerEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/planner").WithTags("Planner");

        group.MapPost("/", CreateAsync).WithName("CreatePlannerItem")
            .WithValidation<CreatePlannerItemRequest>();
        group.MapPut("/{id:long}", UpdateAsync).WithName("UpdatePlannerItem")
            .WithValidation<UpdatePlannerItemRequest>();
        group.MapPatch("/{id:long}/status", SetStatusAsync).WithName("SetPlannerItemStatus")
            .WithValidation<PlannerStatusRequest>();
        group.MapPatch("/{id:long}/time", SetTimeAsync).WithName("SetPlannerItemTime")
            .WithValidation<PlannerTimeRequest>();
        group.MapDelete("/{id:long}", DeleteAsync).WithName("DeletePlannerItem");

        return routes;
    }

    private static async Task<Created<PlannerItemResponse>> CreateAsync(
        CreatePlannerItemRequest request, IPlannerService planner, CancellationToken ct)
    {
        var item = await planner.CreateAsync(request, ct);
        return TypedResults.Created($"/api/planner/{item.Id}", item);
    }

    private static async Task<Ok<PlannerItemResponse>> UpdateAsync(
        long id, UpdatePlannerItemRequest request, IPlannerService planner, CancellationToken ct) =>
        TypedResults.Ok(await planner.UpdateAsync(id, request, ct));

    private static async Task<Ok<PlannerStatusResponse>> SetStatusAsync(
        long id, PlannerStatusRequest request, IPlannerService planner, CancellationToken ct) =>
        TypedResults.Ok(await planner.SetStatusAsync(id, request.Done == true, ct));

    private static async Task<NoContent> SetTimeAsync(
        long id, PlannerTimeRequest request, IPlannerService planner, CancellationToken ct)
    {
        await planner.SetTimeSpentAsync(id, request.TimeSpentSeconds ?? 0, ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> DeleteAsync(long id, IPlannerService planner, CancellationToken ct)
    {
        await planner.DeleteAsync(id, ct);
        return TypedResults.NoContent();
    }
}