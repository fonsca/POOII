using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Data;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Errors;
using PrimeiraChamadaMed.Api.Models;

namespace PrimeiraChamadaMed.Api.Services;

public interface IStudentService
{
    Task<IReadOnlyList<StudentSummaryResponse>> ListByMentorAsync(long mentorId, CancellationToken ct);
    Task<StudentDetailResponse> GetDetailAsync(long id, string? week, CancellationToken ct);
    Task<StudentSummaryResponse> CreateAsync(CreateStudentRequest request, CancellationToken ct);
    Task UpdateAsync(long id, UpdateStudentRequest request, CancellationToken ct);
    Task UpdateProfileAsync(long id, UpdateProfileRequest request, CancellationToken ct);
    Task DeleteAsync(long id, CancellationToken ct);
}

public sealed class StudentService(
    AppDbContext db,
    PasswordService passwords,
    TimeProvider clock,
    ILogger<StudentService> logger) : IStudentService
{
    public async Task<IReadOnlyList<StudentSummaryResponse>> ListByMentorAsync(long mentorId, CancellationToken ct) =>
        await db.StudentProfiles
            .AsNoTracking()
            .Where(p => p.MentorId == mentorId)
            .OrderBy(p => p.User!.Name)
            .Select(p => new StudentSummaryResponse(
                p.UserId, p.User!.Name, p.User!.Email, p.Course, p.Phone ?? string.Empty))
            .ToListAsync(ct);

    public async Task<StudentDetailResponse> GetDetailAsync(long id, string? week, CancellationToken ct)
    {
        var today = clock.Today();
        if (!StudyCalendar.TryResolveWeek(week, today, out var weekStart))
            throw new BusinessRuleException("Semana inválida. Use o formato AAAA-MM-DD.");

        var profile = await db.StudentProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == id, ct)
            ?? throw new NotFoundException("Aluno não encontrado.");
        var user = profile.User!;

        var weekKey = StudyCalendar.ToKey(weekStart);
        var items = await db.PlannerItems
            .AsNoTracking()
            .Where(p => p.UserId == id && p.WeekStart == weekKey)
            .OrderBy(p => p.Id)
            .ToListAsync(ct);

        var student = new StudentResponse(
            user.Id, user.Name, user.Email, profile.Course, profile.Phone ?? string.Empty,
            user.Photo ?? string.Empty,
            StudyCalendar.CurrentStreak(user.StudyStreak ?? 0, user.LastStreakDate, today));

        return new StudentDetailResponse(student, items.Select(PlannerItemResponse.From).ToList(), weekKey);
    }

    public async Task<StudentSummaryResponse> CreateAsync(CreateStudentRequest request, CancellationToken ct)
    {
        var mentorExists = await db.Users
            .AnyAsync(u => u.Id == request.MentorId && u.UserType != UserTypes.Student, ct);
        if (!mentorExists) throw new BusinessRuleException("Mentor não encontrado.");

        var email = NormalizeEmail(request.Email);
        await EnsureEmailIsAvailableAsync(email, exceptUserId: null, ct);

        var profile = new StudentProfile
        {
            MentorId = request.MentorId,
            Course = request.Course.Trim(),
            Phone = EmptyToNull(request.Phone),
            BirthDate = EmptyToNull(request.BirthDate),
            Notes = EmptyToNull(request.Notes)
        };
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            UserType = UserTypes.Student,
            StudentProfile = profile
        };
        user.PasswordHash = passwords.Hash(user, request.InitialPassword);

        // Um único SaveChanges grava USUARIO e STUDENT_PROFILE na mesma transação.
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Aluno {StudentId} cadastrado pelo mentor {MentorId}.", user.Id, request.MentorId);
        return new StudentSummaryResponse(user.Id, user.Name, user.Email, profile.Course, profile.Phone ?? string.Empty);
    }

    public async Task UpdateAsync(long id, UpdateStudentRequest request, CancellationToken ct)
    {
        var profile = await db.StudentProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == id, ct)
            ?? throw new NotFoundException("Aluno não encontrado.");

        var email = NormalizeEmail(request.Email);
        await EnsureEmailIsAvailableAsync(email, exceptUserId: id, ct);

        var user = profile.User!;
        user.Name = request.Name.Trim();
        user.Email = email;
        profile.Course = request.Course.Trim();
        profile.Phone = EmptyToNull(request.Phone);

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Cadastro do aluno {StudentId} atualizado.", id);
    }

    public async Task UpdateProfileAsync(long id, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == id && u.UserType == UserTypes.Student, ct)
            ?? throw new NotFoundException("Aluno não encontrado.");

        user.Name = request.Name.Trim();
        if (request.Photo is not null) user.Photo = request.Photo;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Perfil do aluno {StudentId} atualizado.", id);
    }

    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        if (!await db.StudentProfiles.AnyAsync(p => p.UserId == id, ct))
            throw new NotFoundException("Aluno não encontrado.");

        // Apaga blocos, perfil e usuário numa transação: ou remove tudo, ou nada.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.PlannerItems.Where(p => p.UserId == id).ExecuteDeleteAsync(ct);
        await db.StudentProfiles.Where(p => p.UserId == id).ExecuteDeleteAsync(ct);
        await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Aluno {StudentId} removido.", id);
    }

    private async Task EnsureEmailIsAvailableAsync(string email, long? exceptUserId, CancellationToken ct)
    {
        var query = db.Users.Where(u => u.Email.ToLower() == email);
        if (exceptUserId is long userId) query = query.Where(u => u.Id != userId);

        if (await query.AnyAsync(ct))
            throw new ConflictException("Já existe um usuário com este e-mail.");
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string? EmptyToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}