using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Data;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Errors;
using PrimeiraChamadaMed.Api.Models;

namespace PrimeiraChamadaMed.Api.Services;

public interface IPlannerService
{
    Task<PlannerItemResponse> CreateAsync(CreatePlannerItemRequest request, CancellationToken ct);
    Task<PlannerItemResponse> UpdateAsync(long id, UpdatePlannerItemRequest request, CancellationToken ct);
    Task<PlannerStatusResponse> SetStatusAsync(long id, bool done, CancellationToken ct);
    Task SetTimeSpentAsync(long id, int seconds, CancellationToken ct);
    Task DeleteAsync(long id, CancellationToken ct);
}

public sealed class PlannerService(
    AppDbContext db,
    TimeProvider clock,
    ILogger<PlannerService> logger) : IPlannerService
{
    public async Task<PlannerItemResponse> CreateAsync(CreatePlannerItemRequest request, CancellationToken ct)
    {
        if (!await db.StudentProfiles.AnyAsync(p => p.UserId == request.UserId, ct))
            throw new NotFoundException("Aluno não encontrado.");

        await EnsureSlotIsFreeAsync(request.UserId, request, exceptItemId: null, ct);

        var item = new PlannerItem { UserId = request.UserId };
        Apply(item, request);
        db.PlannerItems.Add(item);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Bloco {ItemId} criado para o aluno {StudentId} ({Day} {Time}, semana {Week}).",
            item.Id, item.UserId, item.Day, item.Time, item.WeekStart);
        return PlannerItemResponse.From(item);
    }

    public async Task<PlannerItemResponse> UpdateAsync(long id, UpdatePlannerItemRequest request, CancellationToken ct)
    {
        var item = await GetOrThrowAsync(id, ct);
        await EnsureSlotIsFreeAsync(item.UserId, request, exceptItemId: id, ct);

        Apply(item, request);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Bloco {ItemId} atualizado.", id);
        return PlannerItemResponse.From(item);
    }

    public async Task<PlannerStatusResponse> SetStatusAsync(long id, bool done, CancellationToken ct)
    {
        var item = await GetOrThrowAsync(id, ct);
        var user = await db.Users.FirstAsync(u => u.Id == item.UserId, ct);
        var today = clock.Today();

        item.Done = done;
        if (done && await ReachedDailyGoalAsync(item, today, ct))
        {
            var next = StudyCalendar.NextStreak(user.StudyStreak ?? 0, user.LastStreakDate, today);
            if (next is int streak)
            {
                user.StudyStreak = streak;
                user.LastStreakDate = StudyCalendar.ToKey(today);
                logger.LogInformation("Ofensiva do aluno {StudentId}: {Streak} dia(s).", user.Id, streak);
            }
        }

        // Status do bloco e ofensiva são gravados juntos.
        await db.SaveChangesAsync(ct);

        var currentStreak = StudyCalendar.CurrentStreak(user.StudyStreak ?? 0, user.LastStreakDate, today);
        return new PlannerStatusResponse(item.Done, currentStreak);
    }

    public async Task SetTimeSpentAsync(long id, int seconds, CancellationToken ct)
    {
        var item = await GetOrThrowAsync(id, ct);
        item.TimeSpentSeconds = seconds;
        await db.SaveChangesAsync(ct);
        logger.LogDebug("Tempo do bloco {ItemId}: {Seconds}s.", id, seconds);
    }

    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var item = await GetOrThrowAsync(id, ct);
        db.PlannerItems.Remove(item);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Bloco {ItemId} removido.", id);
    }

    /// <summary>
    /// A ofensiva só considera blocos de hoje (semana + dia da semana) e exige
    /// pelo menos <see cref="StudyCalendar.MinimumHoursForStreak"/> hora concluída no dia.
    /// </summary>
    private async Task<bool> ReachedDailyGoalAsync(PlannerItem item, DateOnly today, CancellationToken ct)
    {
        if (StudyCalendar.DateOf(item.WeekStart, item.Day) != today) return false;

        var otherHours = await db.PlannerItems
            .Where(p => p.UserId == item.UserId && p.Id != item.Id && p.Done
                        && p.WeekStart == item.WeekStart && p.Day == item.Day)
            .SumAsync(p => p.Hours, ct);

        return otherHours + item.Hours >= StudyCalendar.MinimumHoursForStreak;
    }

    private async Task EnsureSlotIsFreeAsync(
        long userId, UpdatePlannerItemRequest slot, long? exceptItemId, CancellationToken ct)
    {
        var query = db.PlannerItems.Where(p => p.UserId == userId
            && p.WeekStart == slot.WeekStart && p.Day == slot.Day && p.Time == slot.Time);
        if (exceptItemId is long itemId) query = query.Where(p => p.Id != itemId);

        if (await query.AnyAsync(ct))
            throw new ConflictException("Já existe um bloco de estudo neste dia e horário.");
    }

    private async Task<PlannerItem> GetOrThrowAsync(long id, CancellationToken ct) =>
        await db.PlannerItems.FirstOrDefaultAsync(p => p.Id == id, ct)
        ?? throw new NotFoundException("Bloco de estudo não encontrado.");

    private static void Apply(PlannerItem item, UpdatePlannerItemRequest request)
    {
        item.Subject = request.Subject;
        item.Topic = request.Topic.Trim();
        item.Subtopics = string.IsNullOrWhiteSpace(request.Subtopics) ? null : request.Subtopics.Trim();
        item.Day = request.Day;
        item.Time = request.Time;
        item.Hours = request.Hours;
        item.WeekStart = request.WeekStart;
    }
}