using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors();

// helper: caminho do banco
string DbPath() {
    var p1 = Path.Combine(Directory.GetCurrentDirectory(), "..", "SQLite.db");
    if (File.Exists(p1)) return Path.GetFullPath(p1);
    var p2 = Path.Combine(Directory.GetCurrentDirectory(), "SQLite.db");
    if (File.Exists(p2)) return Path.GetFullPath(p2);
    throw new FileNotFoundException("SQLite.db nao encontrado.");
}
SqliteConnection OpenDb() {
    var conn = new SqliteConnection($"Data Source={DbPath()}");
    conn.Open();
    return conn;
}

// migracao automatica: cria tabelas se nao existirem (resolve erro "no such column")
using (var db = OpenDb()) {
    var m = db.CreateCommand();
    m.CommandText = @"
        CREATE TABLE IF NOT EXISTS STUDENT_PROFILE (
            id_student  INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario  INTEGER NOT NULL UNIQUE,
            id_mentor   INTEGER NOT NULL,
            course      TEXT NOT NULL,
            phone       TEXT,
            birth_date  TEXT,
            notes       TEXT,
            FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario),
            FOREIGN KEY (id_mentor)  REFERENCES USUARIO(id_usuario)
        );
        CREATE TABLE IF NOT EXISTS PLANNER_ITEM (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario  INTEGER NOT NULL,
            day         TEXT NOT NULL,
            subject     TEXT NOT NULL,
            topic       TEXT NOT NULL,
            hours       REAL NOT NULL DEFAULT 1,
            done        INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
        );";
    m.ExecuteNonQuery();
}

// POST /api/auth/login
app.MapPost("/api/auth/login", (LoginRequest req) => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id_usuario, nome, tipo_usuario FROM USUARIO WHERE email = $email AND senha = $senha";
        cmd.Parameters.AddWithValue("$email",  req.email    ?? "");
        cmd.Parameters.AddWithValue("$senha",  req.password ?? "");
        using var r = cmd.ExecuteReader();
        if (!r.Read())
            return Results.Json(new { mensagem = "E-mail ou senha incorretos." }, statusCode: 401);
        var tipo = r.GetString(2);
        var role = tipo.Equals("Estudante", StringComparison.OrdinalIgnoreCase) ? "student" : "mentor";
        return Results.Ok(new { id = r.GetInt64(0), name = r.GetString(1), role });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = "Erro: " + ex.Message }, statusCode: 500);
    }
});

// GET /api/students?mentorId={id}
app.MapGet("/api/students", (long mentorId) => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = @"
            SELECT u.id_usuario, u.nome, u.email, sp.course, sp.phone
            FROM USUARIO u
            JOIN STUDENT_PROFILE sp ON sp.id_usuario = u.id_usuario
            WHERE sp.id_mentor = $mid ORDER BY u.nome";
        cmd.Parameters.AddWithValue("$mid", mentorId);
        var list = new List<object>();
        using var r = cmd.ExecuteReader();
        while (r.Read())
            list.Add(new {
                id     = r.GetInt64(0),
                name   = r.GetString(1),
                email  = r.GetString(2),
                course = r.GetString(3),
                phone  = r.IsDBNull(4) ? "" : r.GetString(4)
            });
        return Results.Ok(list);
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// POST /api/students
app.MapPost("/api/students", async (HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        string Str(string k) => root.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
        long   Lng(string k) => root.TryGetProperty(k, out var v) ? v.GetInt64()        : 0;

        var name     = Str("name");
        var email    = Str("email");
        var course   = Str("course");
        var phone    = Str("phone");
        var birth    = Str("birthDate");
        var notes    = Str("notes");
        var initPwd  = Str("initialPassword");
        var mentorId = Lng("mentorId");

        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(course))
            return Results.Json(new { mensagem = "Nome, e-mail e curso sao obrigatorios." }, statusCode: 400);

        using var db = OpenDb();
        var chk = db.CreateCommand();
        chk.CommandText = "SELECT COUNT(*) FROM USUARIO WHERE email = $email";
        chk.Parameters.AddWithValue("$email", email);
        if ((long)chk.ExecuteScalar()! > 0)
            return Results.Json(new { mensagem = "Ja existe um usuario com este e-mail." }, statusCode: 409);

        var senha = string.IsNullOrWhiteSpace(initPwd) ? email : initPwd;

        var ins = db.CreateCommand();
        ins.CommandText = @"
            INSERT INTO USUARIO (nome, email, senha, tipo_usuario, streak_estudos)
            VALUES ($nome, $email, $senha, 'Estudante', 0);
            SELECT last_insert_rowid();";
        ins.Parameters.AddWithValue("$nome",  name);
        ins.Parameters.AddWithValue("$email", email);
        ins.Parameters.AddWithValue("$senha", senha);
        var newId = (long)ins.ExecuteScalar()!;

        var prof = db.CreateCommand();
        prof.CommandText = @"
            INSERT INTO STUDENT_PROFILE (id_usuario, id_mentor, course, phone, birth_date, notes)
            VALUES ($uid, $mid, $course, $phone, $birth, $notes)";
        prof.Parameters.AddWithValue("$uid",    newId);
        prof.Parameters.AddWithValue("$mid",    mentorId);
        prof.Parameters.AddWithValue("$course", course);
        prof.Parameters.AddWithValue("$phone",  string.IsNullOrWhiteSpace(phone) ? DBNull.Value : (object)phone);
        prof.Parameters.AddWithValue("$birth",  string.IsNullOrWhiteSpace(birth) ? DBNull.Value : (object)birth);
        prof.Parameters.AddWithValue("$notes",  string.IsNullOrWhiteSpace(notes) ? DBNull.Value : (object)notes);
        prof.ExecuteNonQuery();

        return Results.Ok(new { id = newId, name, email, course });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// GET /api/students/{id}
app.MapGet("/api/students/{id:long}", (long id) => {
    try {
        using var db = OpenDb();
        var sc = db.CreateCommand();
        sc.CommandText = @"
            SELECT u.id_usuario, u.nome, u.email, sp.course, sp.phone
            FROM USUARIO u
            JOIN STUDENT_PROFILE sp ON sp.id_usuario = u.id_usuario
            WHERE u.id_usuario = $id";
        sc.Parameters.AddWithValue("$id", id);
        using var sr = sc.ExecuteReader();
        if (!sr.Read())
            return Results.Json(new { mensagem = "Aluno nao encontrado." }, statusCode: 404);
        var student = new {
            id     = sr.GetInt64(0),
            name   = sr.GetString(1),
            email  = sr.GetString(2),
            course = sr.GetString(3),
            phone  = sr.IsDBNull(4) ? "" : sr.GetString(4)
        };
        sr.Close();

        var pc = db.CreateCommand();
        pc.CommandText = "SELECT id, day, subject, topic, hours, done FROM PLANNER_ITEM WHERE id_usuario = $uid ORDER BY id";
        pc.Parameters.AddWithValue("$uid", id);
        var planner = new List<object>();
        using var pr = pc.ExecuteReader();
        while (pr.Read())
            planner.Add(new {
                id      = pr.GetInt64(0),
                day     = pr.GetString(1),
                subject = pr.GetString(2),
                topic   = pr.GetString(3),
                hours   = pr.GetDouble(4),
                done    = pr.GetInt64(5) == 1
            });
        return Results.Ok(new { student, planner });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// DELETE /api/students/{id}
app.MapDelete("/api/students/{id:long}", (long id) => {
    try {
        using var db = OpenDb();
        foreach (var sql in new[] {
            "DELETE FROM PLANNER_ITEM    WHERE id_usuario = $id",
            "DELETE FROM STUDENT_PROFILE WHERE id_usuario = $id",
            "DELETE FROM USUARIO         WHERE id_usuario = $id"
        }) {
            var c = db.CreateCommand();
            c.CommandText = sql;
            c.Parameters.AddWithValue("$id", id);
            c.ExecuteNonQuery();
        }
        return Results.NoContent();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// POST /api/students/{id}/planner
app.MapPost("/api/students/{id:long}/planner", async (long id, HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        string Str(string k) => root.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
        double Dbl(string k) => root.TryGetProperty(k, out var v) ? v.GetDouble() : 1;

        using var db = OpenDb();
        var ins = db.CreateCommand();
        ins.CommandText = @"
            INSERT INTO PLANNER_ITEM (id_usuario, day, subject, topic, hours, done)
            VALUES ($uid, $day, $sub, $top, $hrs, 0);
            SELECT last_insert_rowid();";
        ins.Parameters.AddWithValue("$uid", id);
        ins.Parameters.AddWithValue("$day", Str("day"));
        ins.Parameters.AddWithValue("$sub", Str("subject"));
        ins.Parameters.AddWithValue("$top", Str("topic"));
        ins.Parameters.AddWithValue("$hrs", Dbl("hours"));
        var newId = (long)ins.ExecuteScalar()!;
        return Results.Ok(new { id = newId });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// PUT /api/planner/{id}
app.MapPut("/api/planner/{id:long}", async (long id, HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        bool done = root.TryGetProperty("done", out var dv) && dv.GetBoolean();
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "UPDATE PLANNER_ITEM SET done = $done WHERE id = $id";
        cmd.Parameters.AddWithValue("$done", done ? 1 : 0);
        cmd.Parameters.AddWithValue("$id",   id);
        cmd.ExecuteNonQuery();
        return Results.NoContent();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// DELETE /api/planner/{id}
app.MapDelete("/api/planner/{id:long}", (long id) => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "DELETE FROM PLANNER_ITEM WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
        return Results.NoContent();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// GET /api/me/planner?userId={id}
app.MapGet("/api/me/planner", (long userId) => {
    try {
        using var db = OpenDb();
        var sc = db.CreateCommand();
        sc.CommandText = @"
            SELECT u.id_usuario, u.nome, u.email, sp.course
            FROM USUARIO u
            JOIN STUDENT_PROFILE sp ON sp.id_usuario = u.id_usuario
            WHERE u.id_usuario = $uid";
        sc.Parameters.AddWithValue("$uid", userId);
        using var sr = sc.ExecuteReader();
        if (!sr.Read())
            return Results.Ok(new { student = (object?)null, planner = new List<object>() });
        var student = new {
            id     = sr.GetInt64(0),
            name   = sr.GetString(1),
            email  = sr.GetString(2),
            course = sr.GetString(3)
        };
        sr.Close();

        var pc = db.CreateCommand();
        pc.CommandText = "SELECT id, day, subject, topic, hours, done FROM PLANNER_ITEM WHERE id_usuario = $uid ORDER BY id";
        pc.Parameters.AddWithValue("$uid", userId);
        var planner = new List<object>();
        using var pr = pc.ExecuteReader();
        while (pr.Read())
            planner.Add(new {
                id      = pr.GetInt64(0),
                day     = pr.GetString(1),
                subject = pr.GetString(2),
                topic   = pr.GetString(3),
                hours   = pr.GetDouble(4),
                done    = pr.GetInt64(5) == 1
            });
        return Results.Ok(new { student, planner });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

app.Run("http://localhost:5000");

record LoginRequest(string email, string password);
