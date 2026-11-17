using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Data;
using PrimeiraChamadaMed.Api.Dtos;
using PrimeiraChamadaMed.Api.Errors;
using PrimeiraChamadaMed.Api.Models;

namespace PrimeiraChamadaMed.Api.Services;

public interface INewsService
{
    Task<IReadOnlyList<NewsResponse>> ListAsync(CancellationToken ct);
    Task<NewsResponse> CreateAsync(NewsRequest request, CancellationToken ct);
    Task UpdateAsync(long id, NewsRequest request, CancellationToken ct);
    Task DeleteAsync(long id, CancellationToken ct);
}

public sealed class NewsService(
    AppDbContext db,
    TimeProvider clock,
    ILogger<NewsService> logger) : INewsService
{
    public async Task<IReadOnlyList<NewsResponse>> ListAsync(CancellationToken ct)
    {
        var news = await db.News.AsNoTracking().OrderByDescending(n => n.Id).ToListAsync(ct);
        return news.Select(NewsResponse.From).ToList();
    }

    public async Task<NewsResponse> CreateAsync(NewsRequest request, CancellationToken ct)
    {
        var news = new NewsPost { PublishDate = StudyCalendar.ToKey(clock.Today()) };
        Apply(news, request);

        db.News.Add(news);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Aviso {NewsId} publicado ({Institution}).", news.Id, news.Institution);
        return NewsResponse.From(news);
    }

    public async Task UpdateAsync(long id, NewsRequest request, CancellationToken ct)
    {
        var news = await GetOrThrowAsync(id, ct);
        Apply(news, request);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Aviso {NewsId} atualizado.", id);
    }

    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var news = await GetOrThrowAsync(id, ct);
        db.News.Remove(news);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Aviso {NewsId} removido.", id);
    }

    private async Task<NewsPost> GetOrThrowAsync(long id, CancellationToken ct) =>
        await db.News.FirstOrDefaultAsync(n => n.Id == id, ct)
        ?? throw new NotFoundException("Aviso não encontrado.");

    private static void Apply(NewsPost news, NewsRequest request)
    {
        news.Institution = request.Institution.Trim();
        news.Title = request.Title.Trim();
        news.Description = request.Description.Trim();
        news.Deadline = request.Deadline;
        news.Color = request.Color;
        news.Icon = request.Icon.Trim();
    }
}