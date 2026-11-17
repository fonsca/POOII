using Microsoft.EntityFrameworkCore;
using PrimeiraChamadaMed.Api.Models;

namespace PrimeiraChamadaMed.Api.Data;

/// <summary>
/// Contexto do EF Core. O mapeamento usa as tabelas e colunas já existentes no SQLite.db,
/// então o banco atual continua funcionando sem perder dados.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<PlannerItem> PlannerItems => Set<PlannerItem>();
    public DbSet<NewsPost> News => Set<NewsPost>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("USUARIO");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id_usuario");
            entity.Property(u => u.Name).HasColumnName("nome").IsRequired();
            entity.Property(u => u.Email).HasColumnName("email").IsRequired();
            entity.Property(u => u.PasswordHash).HasColumnName("senha").IsRequired();
            entity.Property(u => u.UserType).HasColumnName("tipo_usuario").IsRequired();
            entity.Property(u => u.StudyStreak).HasColumnName("streak_estudos").HasDefaultValue(0);
            entity.Property(u => u.Photo).HasColumnName("foto").HasDefaultValue("");
            entity.Property(u => u.LastStreakDate).HasColumnName("data_ultima_ofensiva").HasDefaultValue("");
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<StudentProfile>(entity =>
        {
            entity.ToTable("STUDENT_PROFILE");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id_student");
            entity.Property(p => p.UserId).HasColumnName("id_usuario");
            entity.Property(p => p.MentorId).HasColumnName("id_mentor");
            entity.Property(p => p.Course).HasColumnName("course").IsRequired();
            entity.Property(p => p.Phone).HasColumnName("phone");
            entity.Property(p => p.BirthDate).HasColumnName("birth_date");
            entity.Property(p => p.Notes).HasColumnName("notes");
            entity.HasIndex(p => p.UserId).IsUnique();

            // 1:1 — cada aluno (USUARIO) tem um perfil
            entity.HasOne(p => p.User)
                  .WithOne(u => u.StudentProfile)
                  .HasForeignKey<StudentProfile>(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // N:1 — um mentor acompanha vários alunos
            entity.HasOne(p => p.Mentor)
                  .WithMany(u => u.MentoredStudents)
                  .HasForeignKey(p => p.MentorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PlannerItem>(entity =>
        {
            entity.ToTable("PLANNER_ITEM");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");
            entity.Property(p => p.UserId).HasColumnName("id_usuario");
            entity.Property(p => p.Day).HasColumnName("day").IsRequired();
            entity.Property(p => p.Time).HasColumnName("time");
            entity.Property(p => p.Subject).HasColumnName("subject").IsRequired();
            entity.Property(p => p.Topic).HasColumnName("topic").IsRequired();
            entity.Property(p => p.Subtopics).HasColumnName("subtopics");
            entity.Property(p => p.Hours).HasColumnName("hours");
            entity.Property(p => p.Done).HasColumnName("done");
            entity.Property(p => p.TimeSpentSeconds).HasColumnName("tempo_gasto_segundos").HasDefaultValue(0);
            entity.Property(p => p.WeekStart).HasColumnName("data_semana").HasDefaultValue("");
            entity.HasIndex(p => new { p.UserId, p.WeekStart });

            // N:1 — um aluno tem vários blocos de estudo
            entity.HasOne(p => p.User)
                  .WithMany(u => u.PlannerItems)
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NewsPost>(entity =>
        {
            entity.ToTable("NOTICIA");
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasColumnName("id");
            entity.Property(n => n.Institution).HasColumnName("institution").IsRequired();
            entity.Property(n => n.Title).HasColumnName("title").IsRequired();
            entity.Property(n => n.Description).HasColumnName("description").IsRequired();
            entity.Property(n => n.PublishDate).HasColumnName("publish_date").IsRequired();
            entity.Property(n => n.Deadline).HasColumnName("deadline").IsRequired();
            entity.Property(n => n.Color).HasColumnName("color").HasDefaultValue("#3b82f6");
            entity.Property(n => n.Icon).HasColumnName("icon").HasDefaultValue("📰");
        });
    }
}