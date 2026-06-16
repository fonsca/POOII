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

// migracao automatica: cria tabelas se nao existirem
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
            time        TEXT,
            subject     TEXT NOT NULL,
            topic       TEXT NOT NULL,
            subtopics   TEXT,
            hours       REAL NOT NULL DEFAULT 1,
            done        INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
        );
        CREATE TABLE IF NOT EXISTS NOTICIA (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            institution     TEXT NOT NULL,
            title           TEXT NOT NULL,
            description     TEXT NOT NULL,
            publish_date    TEXT NOT NULL,
            deadline        TEXT NOT NULL,
            color           TEXT DEFAULT '#3b82f6',
            icon            TEXT DEFAULT '📰'
        );";
    m.ExecuteNonQuery();

    void AddColumn(string table, string column, string type) {
        try {
            var alt = db.CreateCommand();
            alt.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {type};";
            alt.ExecuteNonQuery();
        } catch { }
        
        try {
        var alt = db.CreateCommand();
        alt.CommandText = "ALTER TABLE USUARIO ADD COLUMN foto TEXT DEFAULT '';";
        alt.ExecuteNonQuery();
        } catch { }
        try {
            var alt = db.CreateCommand();
            alt.CommandText = "ALTER TABLE USUARIO ADD COLUMN data_ultima_ofensiva TEXT DEFAULT '';";
            alt.ExecuteNonQuery();
        } catch { }
        try {
        var alt = db.CreateCommand();
        alt.CommandText = "ALTER TABLE PLANNER_ITEM ADD COLUMN tempo_gasto_segundos INTEGER DEFAULT 0;";
        alt.ExecuteNonQuery();
        } catch { }
        try {
            var cmdSemana = db.CreateCommand();
            cmdSemana.CommandText = "ALTER TABLE PLANNER_ITEM ADD COLUMN data_semana TEXT DEFAULT '';";
            cmdSemana.ExecuteNonQuery();
        } catch { }
    }
    
    AddColumn("PLANNER_ITEM", "time", "TEXT");
    AddColumn("PLANNER_ITEM", "subtopics", "TEXT");
}

// PUT /api/students/{id} (Editar Cadastro Geral do Aluno)
app.MapPut("/api/students/{id:long}", async (long id, HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        string Str(string k) => root.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";

        var name = Str("name");
        var email = Str("email");
        var course = Str("course");
        var phone = Str("phone");

        using var db = OpenDb();
        
        // 1. Atualiza o NOME e EMAIL na tabela principal
        var cmdUser = db.CreateCommand();
        cmdUser.CommandText = "UPDATE USUARIO SET nome = $nome, email = $email WHERE id_usuario = $id";
        cmdUser.Parameters.AddWithValue("$nome", name);
        cmdUser.Parameters.AddWithValue("$email", email);
        cmdUser.Parameters.AddWithValue("$id", id);
        cmdUser.ExecuteNonQuery();

        // 2. Atualiza o CURSO e TELEFONE no perfil do estudante
        var cmdProfile = db.CreateCommand();
        cmdProfile.CommandText = "UPDATE STUDENT_PROFILE SET course = $course, phone = $phone WHERE id_usuario = $id";
        cmdProfile.Parameters.AddWithValue("$course", course);
        cmdProfile.Parameters.AddWithValue("$phone", string.IsNullOrWhiteSpace(phone) ? DBNull.Value : (object)phone);
        cmdProfile.Parameters.AddWithValue("$id", id);
        cmdProfile.ExecuteNonQuery();

        return Results.Ok(new { mensagem = "Cadastro atualizado com sucesso!" });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});


// POST /api/auth/login
app.MapPost("/api/auth/login", (LoginRequest req) => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        // 👉 1. ADICIONEI A COLUNA 'foto' AQUI NO SELECT
        cmd.CommandText = "SELECT id_usuario, nome, tipo_usuario, foto FROM USUARIO WHERE email = $email AND senha = $senha";
        cmd.Parameters.AddWithValue("$email",  req.email    ?? "");
        cmd.Parameters.AddWithValue("$senha",  req.password ?? "");
        using var r = cmd.ExecuteReader();
        if (!r.Read())
            return Results.Json(new { mensagem = "E-mail ou senha incorretos." }, statusCode: 401);
            
        var tipo = r.GetString(2);
        var role = tipo.Equals("Estudante", StringComparison.OrdinalIgnoreCase) ? "student" : "mentor";
        // 👉 2. PEGO A FOTO DO BANCO DE DADOS
        var foto = r.IsDBNull(3) ? "" : r.GetString(3); 
        
        // 👉 3. RETORNO A FOTO PARA O JAVASCRIPT
        return Results.Ok(new { id = r.GetInt64(0), name = r.GetString(1), role, foto }); 
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

// POST /api/planner
app.MapPost("/api/planner", async (HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        
        // Pega os dados básicos
        long userId = root.GetProperty("userId").GetInt64();
        string day = root.GetProperty("day").GetString() ?? "";
        string subject = root.GetProperty("subject").GetString() ?? "";
        string topic = root.GetProperty("topic").GetString() ?? "";
        string time = root.GetProperty("time").GetString() ?? "";
        string subtopics = root.GetProperty("subtopics").GetString() ?? "";
        
        // 👉 ATUALIZADO: Pega a semana do Javascript (ou calcula hoje se vier vazio)
        string dataSemana = "";
        if (root.TryGetProperty("data_semana", out var semanaProp)) {
            dataSemana = semanaProp.GetString() ?? "";
        }
        if (string.IsNullOrEmpty(dataSemana)) {
            DateTime hoje = DateTime.Now;
            int diff = (7 + (hoje.DayOfWeek - DayOfWeek.Monday)) % 7;
            dataSemana = hoje.AddDays(-1 * diff).ToString("yyyy-MM-dd");
        }

        using var db = OpenDb();
        var cmd = db.CreateCommand();
        // 👉 ATUALIZADO: Inserindo a coluna data_semana
        cmd.CommandText = @"INSERT INTO PLANNER_ITEM 
                    (id_usuario, subject, topic, subtopics, day, time, hours, done, data_semana) 
                    VALUES 
                    ($uid, $sub, $top, $subtop, $day, $time, $hours, $done, $semana);
            SELECT last_insert_rowid();";
            
        cmd.Parameters.AddWithValue("$uid", userId);
        cmd.Parameters.AddWithValue("$day", day);
        cmd.Parameters.AddWithValue("$subject", subject);
        cmd.Parameters.AddWithValue("$topic", topic);
        cmd.Parameters.AddWithValue("$time", time);
        cmd.Parameters.AddWithValue("$subtopics", subtopics);
        cmd.Parameters.AddWithValue("$semana", root.TryGetProperty("data_semana", out var sem) ? sem.GetString() ?? "" : "");
        
        var newId = (long)cmd.ExecuteScalar()!;
        return Results.Ok(new { id = newId });
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

// GET /api/students/{id:long}?semana={data}
app.MapGet("/api/students/{id:long}", (long id, string semana) => {
    try {
        using var db = OpenDb();
        
        // Se não informou a semana, descobre a Segunda-feira desta semana
        if (string.IsNullOrEmpty(semana)) {
            DateTime hoje = DateTime.Now;
            int diff = (7 + (hoje.DayOfWeek - DayOfWeek.Monday)) % 7;
            semana = hoje.AddDays(-1 * diff).ToString("yyyy-MM-dd");
        }

        var sc = db.CreateCommand();
        sc.CommandText = @"
            SELECT u.id_usuario, u.nome, u.email, sp.course, sp.phone, u.foto, u.streak_estudos
            FROM USUARIO u
            JOIN STUDENT_PROFILE sp ON sp.id_usuario = u.id_usuario
            WHERE u.id_usuario = $id";
        sc.Parameters.AddWithValue("$id", id);
        using var sr = sc.ExecuteReader();
        if (!sr.Read())
            return Results.Json(new { mensagem = "Aluno não encontrado." }, statusCode: 404);
            
        var student = new {
            id      = sr.GetInt64(0),
            name    = sr.GetString(1),
            email   = sr.GetString(2),
            course  = sr.GetString(3),
            phone   = sr.IsDBNull(4) ? "" : sr.GetString(4),
            foto    = sr.IsDBNull(5) ? "" : sr.GetString(5),
            streak  = sr.GetInt64(6)
        };
        sr.Close();

        var pc = db.CreateCommand();
        // 👉 ATUALIZADO: SELECT novo e filtro WHERE data_semana = $semana
        pc.CommandText = "SELECT id, day, subject, topic, hours, done, time, subtopics, tempo_gasto_segundos, data_semana FROM PLANNER_ITEM WHERE id_usuario = $uid AND data_semana = $semana ORDER BY id";
        pc.Parameters.AddWithValue("$uid", id);
        pc.Parameters.AddWithValue("$semana", semana);
        var planner = new List<object>();
        using var pr = pc.ExecuteReader();
        
        while (pr.Read())
            planner.Add(new {
                id                   = pr.GetInt64(0),
                day                  = pr.GetString(1),
                subject              = pr.GetString(2),
                topic                = pr.GetString(3),
                hours                = pr.GetDouble(4),
                done                 = pr.GetInt64(5) == 1,
                time                 = pr.IsDBNull(6) ? "" : pr.GetString(6),
                subtopics            = pr.IsDBNull(7) ? "" : pr.GetString(7),
                tempo_gasto_segundos = pr.IsDBNull(8) ? 0 : pr.GetInt32(8),
                data_semana          = pr.IsDBNull(9) ? "" : pr.GetString(9)
            });
            
        return Results.Ok(new { student, planner, semanaAtual = semana });
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
            INSERT INTO PLANNER_ITEM (id_usuario, day, time, subject, topic, subtopics, hours, done)
            VALUES ($uid, $day, $time, $sub, $top, $subt, $hrs, 0);
            SELECT last_insert_rowid();";
        ins.Parameters.AddWithValue("$uid",  id);
        ins.Parameters.AddWithValue("$day",  Str("day"));
        ins.Parameters.AddWithValue("$time", Str("time"));
        ins.Parameters.AddWithValue("$sub",  Str("subject"));
        ins.Parameters.AddWithValue("$top",  Str("topic"));
        ins.Parameters.AddWithValue("$subt", Str("subtopics"));
        ins.Parameters.AddWithValue("$hrs",  Dbl("hours"));
        
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
        using var db = OpenDb();

        // 1. ATUALIZA OS TEXTOS DA TAREFA
        if (root.TryGetProperty("subject", out var subElement)) {
            var cmdConteudo = db.CreateCommand();
            
            // 👉 ADICIONADO: data_semana = $semana
            cmdConteudo.CommandText = @"UPDATE PLANNER_ITEM 
                                        SET subject = $sub, 
                                            topic = $top, 
                                            subtopics = $subtop, 
                                            day = $day, 
                                            time = $time,
                                            data_semana = $semana
                                        WHERE id = $id";
                                        
            cmdConteudo.Parameters.AddWithValue("$sub", subElement.GetString() ?? "");
            cmdConteudo.Parameters.AddWithValue("$top", root.TryGetProperty("topic", out var top) ? top.GetString() ?? "" : "");
            cmdConteudo.Parameters.AddWithValue("$subtop", root.TryGetProperty("subtopics", out var subtop) ? subtop.GetString() ?? "" : "");
            cmdConteudo.Parameters.AddWithValue("$day", root.TryGetProperty("day", out var day) ? day.GetString() ?? "" : "");
            cmdConteudo.Parameters.AddWithValue("$time", root.TryGetProperty("time", out var time) ? time.GetString() ?? "" : "");
            
            // 👉 ADICIONADO: Pega a semana que veio do JavaScript
            cmdConteudo.Parameters.AddWithValue("$semana", root.TryGetProperty("data_semana", out var sem) ? sem.GetString() ?? "" : "");
            
            cmdConteudo.Parameters.AddWithValue("$id", id);
            cmdConteudo.ExecuteNonQuery();
        }

        // 2. ATUALIZA O STATUS (Check de concluído)
        if (root.TryGetProperty("done", out var dv)) {
            var cmdStatus = db.CreateCommand();
            cmdStatus.CommandText = "UPDATE PLANNER_ITEM SET done = $done WHERE id = $id";
            cmdStatus.Parameters.AddWithValue("$done", dv.ValueKind == JsonValueKind.True ? 1 : 0);
            cmdStatus.Parameters.AddWithValue("$id", id);
            cmdStatus.ExecuteNonQuery();
        }

        // 3. ATUALIZA O TEMPO GASTO
        if (root.TryGetProperty("tempo_gasto", out var tempoElement)) {
            var cmdTempo = db.CreateCommand();
            cmdTempo.CommandText = "UPDATE PLANNER_ITEM SET tempo_gasto_segundos = $tempo WHERE id = $id";
            cmdTempo.Parameters.AddWithValue("$tempo", tempoElement.GetInt32());
            cmdTempo.Parameters.AddWithValue("$id", id);
            cmdTempo.ExecuteNonQuery();
        }

        // 4. BUSCA O DONO DA TAREFA PARA A LÓGICA DE OFENSIVA (STREAK)
        string[] dias = { "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado" };
        string hojePt = dias[(int)DateTime.Now.DayOfWeek];
        string hojeData = DateTime.Now.ToString("yyyy-MM-dd");

        var cmdUser = db.CreateCommand();
        cmdUser.CommandText = "SELECT id_usuario FROM PLANNER_ITEM WHERE id = $id";
        cmdUser.Parameters.AddWithValue("$id", id);
        
        var userResult = cmdUser.ExecuteScalar();
        if (userResult != null && userResult != DBNull.Value) {
            long userId = (long)userResult;

            var cmdHoras = db.CreateCommand();
            cmdHoras.CommandText = "SELECT SUM(hours) FROM PLANNER_ITEM WHERE id_usuario = $uid AND day = $day AND done = 1";
            cmdHoras.Parameters.AddWithValue("$uid", userId);
            cmdHoras.Parameters.AddWithValue("$day", hojePt);
            var totalHoje = cmdHoras.ExecuteScalar();
            double horasConcluidas = (totalHoje == DBNull.Value) ? 0 : Convert.ToDouble(totalHoje);

            if (horasConcluidas >= 0.5) { 
                var cmdCheck = db.CreateCommand();
                cmdCheck.CommandText = "SELECT streak_estudos, data_ultima_ofensiva FROM USUARIO WHERE id_usuario = $uid";
                cmdCheck.Parameters.AddWithValue("$uid", userId);
                using var r = cmdCheck.ExecuteReader();
                if (r.Read()) {
                    int streak = r.GetInt32(0);
                    string ultimaData = r.IsDBNull(1) ? "" : r.GetString(1);
                    
                    if (ultimaData != hojeData) { 
                        string ontemData = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd");
                        if (ultimaData == ontemData) streak++; 
                        else streak = 1; 

                        r.Close();
                        var cmdUp = db.CreateCommand();
                        cmdUp.CommandText = "UPDATE USUARIO SET streak_estudos = $s, data_ultima_ofensiva = $d WHERE id_usuario = $uid";
                        cmdUp.Parameters.AddWithValue("$s", streak);
                        cmdUp.Parameters.AddWithValue("$d", hojeData);
                        cmdUp.Parameters.AddWithValue("$uid", userId);
                        cmdUp.ExecuteNonQuery();
                    }
                }
            }
        }

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

// GET /api/me/planner?userId={id}&semana={data}
app.MapGet("/api/me/planner", (long userId, string semana) => {
    try {
        using var db = OpenDb();
        
        // Se não mandou qual semana quer ver, pega a Segunda-feira da semana atual
        if (string.IsNullOrEmpty(semana)) {
            DateTime hoje = DateTime.Now;
            int diff = (7 + (hoje.DayOfWeek - DayOfWeek.Monday)) % 7;
            semana = hoje.AddDays(-1 * diff).ToString("yyyy-MM-dd");
        }

        var sc = db.CreateCommand();
        sc.CommandText = @"
            SELECT u.id_usuario, u.nome, u.email, sp.course
            FROM USUARIO u
            JOIN STUDENT_PROFILE sp ON sp.id_usuario = u.id_usuario
            WHERE u.id_usuario = $uid";
        sc.Parameters.AddWithValue("$uid", userId);
        using var sr = sc.ExecuteReader();
        if (!sr.Read())
            return Results.Ok(new { student = (object)null, planner = new List<object>() });
        
        var student = new {
            id     = sr.GetInt64(0),
            name   = sr.GetString(1),
            email  = sr.GetString(2),
            course = sr.GetString(3)
        };
        sr.Close();

        var pc = db.CreateCommand();
        // 👉 ATUALIZADO: Trouxe a data_semana e o tempo_gasto_segundos, e filtra pela semana!
        pc.CommandText = "SELECT id, day, subject, topic, hours, done, time, subtopics, tempo_gasto_segundos, data_semana FROM PLANNER_ITEM WHERE id_usuario = $uid AND data_semana = $semana ORDER BY id";
        pc.Parameters.AddWithValue("$uid", userId);
        pc.Parameters.AddWithValue("$semana", semana);
        var planner = new List<object>();
        
        using var pr = pc.ExecuteReader();
        while (pr.Read())
            planner.Add(new {
                id                   = pr.GetInt64(0),
                day                  = pr.GetString(1),
                subject              = pr.GetString(2),
                topic                = pr.GetString(3),
                hours                = pr.GetDouble(4),
                done                 = pr.GetInt64(5) == 1,
                time                 = pr.IsDBNull(6) ? "" : pr.GetString(6),
                subtopics            = pr.IsDBNull(7) ? "" : pr.GetString(7),
                tempo_gasto_segundos = pr.IsDBNull(8) ? 0 : pr.GetInt32(8), // Pega o tempo do cronômetro!
                data_semana          = pr.IsDBNull(9) ? "" : pr.GetString(9)
            });
            
        return Results.Ok(new { student, planner, semanaAtual = semana });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// -------- ROTAS DO PORTAL DE NOTÍCIAS --------

// GET /api/news
app.MapGet("/api/news", () => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id, institution, title, description, publish_date, deadline, color, icon FROM NOTICIA ORDER BY id DESC";
        var news = new List<object>();
        using var r = cmd.ExecuteReader();
        while (r.Read()) {
            news.Add(new {
                id = r.GetInt64(0),
                institution = r.GetString(1),
                title = r.GetString(2),
                description = r.GetString(3),
                publish_date = r.GetString(4),
                deadline = r.GetString(5),
                color = r.GetString(6),
                icon = r.GetString(7)
            });
        }
        return Results.Ok(news);
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// POST /api/news
app.MapPost("/api/news", async (HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO NOTICIA (institution, title, description, publish_date, deadline, color, icon) 
            VALUES ($inst, $title, $desc, $pub, $dead, $color, $icon)";
            
        cmd.Parameters.AddWithValue("$inst", root.GetProperty("institution").GetString());
        cmd.Parameters.AddWithValue("$title", root.GetProperty("title").GetString());
        cmd.Parameters.AddWithValue("$desc", root.GetProperty("description").GetString());
        cmd.Parameters.AddWithValue("$pub", DateTime.Now.ToString("dd MMM yyyy")); 
        cmd.Parameters.AddWithValue("$dead", root.GetProperty("deadline").GetString());
        cmd.Parameters.AddWithValue("$color", root.GetProperty("color").GetString());
        cmd.Parameters.AddWithValue("$icon", root.GetProperty("icon").GetString());
        
        cmd.ExecuteNonQuery();
        return Results.Ok();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// DELETE /api/news/{id}
app.MapDelete("/api/news/{id:long}", (long id) => {
    try {
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "DELETE FROM NOTICIA WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
        return Results.NoContent();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// PUT /api/news/{id}
app.MapPut("/api/news/{id:long}", async (long id, HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        
        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = @"
            UPDATE NOTICIA 
            SET institution = $inst, title = $title, description = $desc, 
                deadline = $dead, color = $color, icon = $icon 
            WHERE id = $id";
            
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$inst", root.GetProperty("institution").GetString());
        cmd.Parameters.AddWithValue("$title", root.GetProperty("title").GetString());
        cmd.Parameters.AddWithValue("$desc", root.GetProperty("description").GetString());
        cmd.Parameters.AddWithValue("$dead", root.GetProperty("deadline").GetString());
        cmd.Parameters.AddWithValue("$color", root.GetProperty("color").GetString());
        cmd.Parameters.AddWithValue("$icon", root.GetProperty("icon").GetString());
        
        cmd.ExecuteNonQuery();
        return Results.NoContent();
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

// PUT /api/students/{id}/profile (Editar Perfil e Foto)
app.MapPut("/api/students/{id:long}/profile", async (long id, HttpRequest request) => {
    try {
        using var body = await JsonDocument.ParseAsync(request.Body);
        var root = body.RootElement;
        
        string nome = root.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
        string foto = root.TryGetProperty("foto", out var f) ? f.GetString() ?? "" : "";

        using var db = OpenDb();
        var cmd = db.CreateCommand();
        cmd.CommandText = "UPDATE USUARIO SET nome = $nome, foto = $foto WHERE id_usuario = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.Parameters.AddWithValue("$nome", nome);
        cmd.Parameters.AddWithValue("$foto", foto);
        cmd.ExecuteNonQuery();

        return Results.Ok(new { mensagem = "Perfil atualizado!" });
    } catch (Exception ex) {
        return Results.Json(new { mensagem = ex.Message }, statusCode: 500);
    }
});

app.Run("http://localhost:5000");

record LoginRequest(string email, string password);