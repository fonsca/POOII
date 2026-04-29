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
            Role TEXT NOT NULL DEFAULT 'mentor',
            CreatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS Students (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            MentorId INTEGER NOT NULL,
            UserId INTEGER NULL,
            Name TEXT NOT NULL,
            Email TEXT NOT NULL,
            Course TEXT NOT NULL,
            Phone TEXT NULL,
            BirthDate TEXT NULL,
            Notes TEXT NULL,
            CreatedAt TEXT NOT NULL,
            FOREIGN KEY(MentorId) REFERENCES Users(Id) ON DELETE CASCADE,
            FOREIGN KEY(UserId) REFERENCES Users(Id) ON DELETE SET NULL
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

    // Migração leve: garante colunas novas em bancos antigos
    void EnsureColumn(string table, string column, string ddl)
    {
        var check = conn.CreateCommand();
        check.CommandText = $"PRAGMA table_info({table})";
        using var rr = check.ExecuteReader();
        bool found = false;
        while (rr.Read()) { if (rr.GetString(1).Equals(column, StringComparison.OrdinalIgnoreCase)) { found = true; break; } }
        rr.Close();
        if (!found)
        {
            var alter = conn.CreateCommand();
            alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {ddl}";
            alter.ExecuteNonQuery();
        }
    }
    EnsureColumn("Users", "Role", "TEXT NOT NULL DEFAULT 'mentor'");
    EnsureColumn("Students", "UserId", "INTEGER NULL");
    EnsureColumn("Students", "Phone", "TEXT NULL");
    EnsureColumn("Students", "BirthDate", "TEXT NULL");
    EnsureColumn("Students", "Notes", "TEXT NULL");
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
    ins.CommandText = "INSERT INTO Users (Email,PasswordHash,Name,Role,CreatedAt) VALUES (@e,@h,@n,'mentor',@d); SELECT last_insert_rowid();";
    ins.Parameters.AddWithValue("@e", dto.Email);
    ins.Parameters.AddWithValue("@h", hash);
    ins.Parameters.AddWithValue("@n", dto.Name);
    ins.Parameters.AddWithValue("@d", DateTime.UtcNow.ToString("o"));
    var id = (long)ins.ExecuteScalar()!;
    return Results.Ok(new { id, email = dto.Email, name = dto.Name, role = "mentor" });
});

app.MapPost("/api/auth/login", (LoginDto dto) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT Id,PasswordHash,Name,Role FROM Users WHERE Email=@e";
    cmd.Parameters.AddWithValue("@e", dto.Email);
    using var r = cmd.ExecuteReader();
    if (!r.Read()) return Results.Unauthorized();
    var id = r.GetInt64(0); var hash = r.GetString(1); var name = r.GetString(2); var role = r.GetString(3);
    if (!BCrypt.Net.BCrypt.Verify(dto.Password, hash)) return Results.Unauthorized();
    return Results.Ok(new { id, email = dto.Email, name, role });
});

// ---------- STUDENTS ----------
app.MapGet("/api/students", (long mentorId) =>
{
    using var c = Open();
    var cmd = c.CreateCommand();
    cmd.CommandText = "SELECT Id,Name,Email,Course,Phone,BirthDate,Notes,CreatedAt FROM Students WHERE MentorId=@m ORDER BY Id DESC";
    cmd.Parameters.AddWithValue("@m", mentorId);
    var list = new List<object>();
    using var r = cmd.ExecuteReader();
    while (r.Read())
        list.Add(new {
            id = r.GetInt64(0), name = r.GetString(1), email = r.GetString(2), course = r.GetString(3),
            phone = r.IsDBNull(4) ? null : r.GetString(4),
            birthDate = r.IsDBNull(5) ? null : r.GetString(5),
            notes = r.IsDBNull(6) ? null : r.GetString(6),
            createdAt = r.GetString(7)
        });
    return Results.Ok(list);
});

app.MapPost("/api/students", (StudentDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Course))
        return Results.BadRequest(new { error = "Preencha nome, e-mail e curso." });

    using var c = Open();

    // E-mail único entre Users (porque vamos criar login p/ o aluno)
    var check = c.CreateCommand();
    check.CommandText = "SELECT 1 FROM Users WHERE Email=@e";
    check.Parameters.AddWithValue("@e", dto.Email);
    if (check.ExecuteScalar() != null)
        return Results.Conflict(new { error = "Já existe um usuário com este e-mail." });

    using var tx = c.BeginTransaction();
    try
    {
        long? userId = null;
        if (!string.IsNullOrWhiteSpace(dto.InitialPassword))
        {
            var hash = BCrypt.Net.BCrypt.HashPassword(dto.InitialPassword);
            var u = c.CreateCommand();
            u.Transaction = tx;
            u.CommandText = "INSERT INTO Users (Email,PasswordHash,Name,Role,CreatedAt) VALUES (@e,@h,@n,'student',@d); SELECT last_insert_rowid();";
            u.Parameters.AddWithValue("@e", dto.Email);
            u.Parameters.AddWithValue("@h", hash);
            u.Parameters.AddWithValue("@n", dto.Name);
            u.Parameters.AddWithValue("@d", DateTime.UtcNow.ToString("o"));
            userId = (long)u.ExecuteScalar()!;
        }

        var cmd = c.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"INSERT INTO Students (MentorId,UserId,Name,Email,Course,Phone,BirthDate,Notes,CreatedAt)
                            VALUES (@m,@u,@n,@e,@co,@ph,@bd,@no,@d); SELECT last_insert_rowid();";
        cmd.Parameters.AddWithValue("@m", dto.MentorId);
        cmd.Parameters.AddWithValue("@u", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@n", dto.Name);
        cmd.Parameters.AddWithValue("@e", dto.Email);
        cmd.Parameters.AddWithValue("@co", dto.Course);
        cmd.Parameters.AddWithValue("@ph", (object?)dto.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@bd", (object?)dto.BirthDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@no", (object?)dto.Notes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@d", DateTime.UtcNow.ToString("o"));
        var id = (long)cmd.ExecuteScalar()!;

        tx.Commit();
        return Results.Ok(new { id, userId, hasLogin = userId.HasValue });
    }
    catch (Exception ex)
    {
        tx.Rollback();
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/students/{id:long}", (long id) =>
{
    using var c = Open();
    var s = c.CreateCommand();
    s.CommandText = "SELECT Id,Name,Email,Course,Phone,BirthDate,Notes,CreatedAt FROM Students WHERE Id=@i";
    s.Parameters.AddWithValue("@i", id);
    using var rs = s.ExecuteReader();
    if (!rs.Read()) return Results.NotFound();
    var student = new {
        id = rs.GetInt64(0), name = rs.GetString(1), email = rs.GetString(2), course = rs.GetString(3),
        phone = rs.IsDBNull(4) ? null : rs.GetString(4),
        birthDate = rs.IsDBNull(5) ? null : rs.GetString(5),
        notes = rs.IsDBNull(6) ? null : rs.GetString(6),
        createdAt = rs.GetString(7)
    };
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

app.Run("http://localhost:5000");

record RegisterDto(string Name, string Email, string Password);
record LoginDto(string Email, string Password);
record StudentDto(long MentorId, string Name, string Email, string Course,
                  string? Phone, string? BirthDate, string? Notes, string? InitialPassword);
record PlannerDto(string Day, string Subject, string Topic, double Hours, bool Done);
