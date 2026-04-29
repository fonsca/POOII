using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using System;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors();

app.MapPost("/api/auth/login", (LoginRequest req) => {
    try {
        var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "SQLite.db");
        
        // Verificação extra de segurança para ver se o banco está na pasta certa
        if (!File.Exists(dbPath)) {
            return Results.Json(new { sucesso = false, mensagem = $"Banco de dados não encontrado no caminho: {dbPath}" }, statusCode: 500);
        }

        using var connection = new SqliteConnection($"Data Source={dbPath}");
        connection.Open();

        var command = connection.CreateCommand();
        command.CommandText = "SELECT nome, tipo_usuario FROM USUARIO WHERE email = $email AND senha = $senha";
        command.Parameters.AddWithValue("$email", req.email ?? "");
        command.Parameters.AddWithValue("$senha", req.senha ?? "");

        using var reader = command.ExecuteReader();
        if (reader.Read()) {
            return Results.Ok(new { 
                sucesso = true, 
                nome = reader.GetString(0), 
                tipo = reader.GetString(1) 
            });
        } else {
            return Results.Json(new { 
                sucesso = false, 
                mensagem = "E-mail ou senha incorretos." 
            }, statusCode: 401);
        }
    }
    catch (Exception ex) {
        // Se o SQL quebrar, ele te devolve o motivo exato!
        return Results.Json(new { sucesso = false, mensagem = "Erro no Servidor: " + ex.Message }, statusCode: 500);
    }
});

app.Run("http://localhost:5000");

record LoginRequest(string email, string senha);