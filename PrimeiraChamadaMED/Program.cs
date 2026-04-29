using Microsoft.Data.Sqlite;
using BCrypt.Net;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
var app = builder.Build();
app.UseCors();

const string ConnStr = "Data Source=app.db";

using (var conn = new SqliteConnection(ConnStr))
{
    conn.Open();
    var cmd = conn.CreateCommand();
    cmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS Users (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Email TEXT UNIQUE NOT NULL,
            PasswordHash TEXT NOT NULL,
            Name TEXT NOT NULL,
            CreatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS Students (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            MentorId INTEGER NOT NULL,
            Name TEXT NOT NULL,
            Email TEXT NOT NULL,
            Course TEXT NOT NULL,
            CreatedAt TEXT NOT NULL,
            FOREIGN KEY(MentorId) REFERENCES Users(Id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS PlannerItems (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            StudentId INTEGER NOT NULL,
            Day TEXT NOT NULL,
            Subject TEXT NOT NULL,
            Topic TEXT NOT NULL,
            Hours REAL NOT NULL,
            Done INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(StudentId) REFERENCES Students(Id) ON DELETE CASCADE
        );";
    cmd.ExecuteNonQuery();
}

SqliteConnection Open() { var c = new SqliteConnection(ConnStr); c.Open(); return c; }

// ---------- AUTH ----------
app.MapPost("/api/auth/register", (RegisterDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.Name))
        return Results.BadRequest(new { error = "Preencha nome, e-mail e senha." });
    using var c = Open();
    var check = c.CreateCommand(); check.CommandText = "SELECT 1 FROM Users WHERE Email=@e"; check.Parameters.AddWithValue("@e", dto.Email);
    if (check.ExecuteScalar() != null) return Results.Conflict(new { error = "E-mail já cadastrado." });
    var hash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
    var ins = c.CreateCommand();
    ins.CommandText = "INSERT INTO Users (Email,PasswordHash,Name,CreatedAt) VALUES (@e,@h,@n,@d); SELECT last_insert_rowid();";
    ins.Parameters.AddWithValue("@e", dto.Email);
    ins.Parameters.AddWithValue("@h", hash);
    ins.Parameters.AddWithValue("@n", dto.Name);
    ins.Parameters.AddWithValue("@d", DateTime.UtcNow.ToString("o"));
    var id = (long)ins.ExecuteScalar()!;
    return Results.Ok(new { id, email = dto.Email, name = dto.Name });
});

app.MapPost("/api/auth/login", (LoginDto dto) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT Id,PasswordHash,Name FROM Users WHERE Email=@e";
    cmd.Parameters.AddWithValue("@e", dto.Email);
    using var r = cmd.ExecuteReader();
    if (!r.Read()) return Results.Unauthorized();
    var id = r.GetInt64(0); var hash = r.GetString(1); var name = r.GetString(2);
    if (!BCrypt.Net.BCrypt.Verify(dto.Password, hash)) return Results.Unauthorized();
    return Results.Ok(new { id, email = dto.Email, name });
});

// ---------- STUDENTS ----------
app.MapGet("/api/students", (long mentorId) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT Id,Name,Email,Course,CreatedAt FROM Students WHERE MentorId=@m ORDER BY Id DESC";
    cmd.Parameters.AddWithValue("@m", mentorId);
    var list = new List<object>();
    using var r = cmd.ExecuteReader();
    while (r.Read())
        list.Add(new { id = r.GetInt64(0), name = r.GetString(1), email = r.GetString(2), course = r.GetString(3), createdAt = r.GetString(4) });
    return Results.Ok(list);
});

app.MapPost("/api/students", (StudentDto dto) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "INSERT INTO Students (MentorId,Name,Email,Course,CreatedAt) VALUES (@m,@n,@e,@co,@d); SELECT last_insert_rowid();";
    cmd.Parameters.AddWithValue("@m", dto.MentorId);
    cmd.Parameters.AddWithValue("@n", dto.Name);
    cmd.Parameters.AddWithValue("@e", dto.Email);
    cmd.Parameters.AddWithValue("@co", dto.Course);
    cmd.Parameters.AddWithValue("@d", DateTime.UtcNow.ToString("o"));
    var id = (long)cmd.ExecuteScalar()!;
    return Results.Ok(new { id });
});

app.MapGet("/api/students/{id:long}", (long id) =>
{
    using var c = Open();
    var s = c.CreateCommand();
    s.CommandText = "SELECT Id,Name,Email,Course,CreatedAt FROM Students WHERE Id=@i";
    s.Parameters.AddWithValue("@i", id);
    using var rs = s.ExecuteReader();
    if (!rs.Read()) return Results.NotFound();
    var student = new { id = rs.GetInt64(0), name = rs.GetString(1), email = rs.GetString(2), course = rs.GetString(3), createdAt = rs.GetString(4) };
    rs.Close();
    var p = c.CreateCommand();
    p.CommandText = "SELECT Id,Day,Subject,Topic,Hours,Done FROM PlannerItems WHERE StudentId=@i ORDER BY Id";
    p.Parameters.AddWithValue("@i", id);
    var items = new List<object>();
    using var rp = p.ExecuteReader();
    while (rp.Read())
        items.Add(new { id = rp.GetInt64(0), day = rp.GetString(1), subject = rp.GetString(2), topic = rp.GetString(3), hours = rp.GetDouble(4), done = rp.GetInt64(5) == 1 });
    return Results.Ok(new { student, planner = items });
});

app.MapDelete("/api/students/{id:long}", (long id) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "DELETE FROM Students WHERE Id=@i";
    cmd.Parameters.AddWithValue("@i", id);
    cmd.ExecuteNonQuery();
    return Results.NoContent();
});

// ---------- PLANNER ----------
app.MapPost("/api/students/{id:long}/planner", (long id, PlannerDto dto) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "INSERT INTO PlannerItems (StudentId,Day,Subject,Topic,Hours,Done) VALUES (@s,@d,@su,@t,@h,@dn); SELECT last_insert_rowid();";
    cmd.Parameters.AddWithValue("@s", id);
    cmd.Parameters.AddWithValue("@d", dto.Day);
    cmd.Parameters.AddWithValue("@su", dto.Subject);
    cmd.Parameters.AddWithValue("@t", dto.Topic);
    cmd.Parameters.AddWithValue("@h", dto.Hours);
    cmd.Parameters.AddWithValue("@dn", dto.Done ? 1 : 0);
    var newId = (long)cmd.ExecuteScalar()!;
    return Results.Ok(new { id = newId });
});

app.MapPut("/api/planner/{itemId:long}", (long itemId, PlannerDto dto) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "UPDATE PlannerItems SET Day=@d,Subject=@su,Topic=@t,Hours=@h,Done=@dn WHERE Id=@i";
    cmd.Parameters.AddWithValue("@d", dto.Day);
    cmd.Parameters.AddWithValue("@su", dto.Subject);
    cmd.Parameters.AddWithValue("@t", dto.Topic);
    cmd.Parameters.AddWithValue("@h", dto.Hours);
    cmd.Parameters.AddWithValue("@dn", dto.Done ? 1 : 0);
    cmd.Parameters.AddWithValue("@i", itemId);
    cmd.ExecuteNonQuery();
    return Results.NoContent();
});

app.MapDelete("/api/planner/{itemId:long}", (long itemId) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "DELETE FROM PlannerItems WHERE Id=@i";
    cmd.Parameters.AddWithValue("@i", itemId);
    cmd.ExecuteNonQuery();
    return Results.NoContent();
});

app.Run();

record RegisterDto(string Name, string Email, string Password);
record LoginDto(string Email, string Password);
record StudentDto(long MentorId, string Name, string Email, string Course);
record PlannerDto(string Day, string Subject, string Topic, double Hours, bool Done);
