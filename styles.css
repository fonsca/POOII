using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

// Adiciona permissão para o seu index.html enviar dados para a API
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();
app.UseCors();

// Rota que recebe o POST do seu formulário HTML
app.MapPost("/login", async (HttpContext context) => {
    // Lê os dados do formulário
    var form = await context.Request.ReadFormAsync();
    var email = form["email"].ToString();
    var senha = form["senha"].ToString();

    // Caminho do banco de dados (volta uma pasta para achar o sqlite.db)
    var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "sqlite.db");
    
    using var connection = new SqliteConnection($"Data Source={dbPath}");
    connection.Open();

    var command = connection.CreateCommand();
    // Uso de parâmetros ($email) previne SQL Injection automaticamente!
    command.CommandText = "SELECT nome, tipo_usuario FROM USUARIO WHERE email = $email AND senha = $senha";
    command.Parameters.AddWithValue("$email", email);
    command.Parameters.AddWithValue("$senha", senha);

    using var reader = command.ExecuteReader();
    
    // Devolve o HTML direto como resposta, mantendo a simplicidade do protótipo
    if (reader.Read()) {
        var nome = reader.GetString(0);
        var tipo = reader.GetString(1);
        string sucessoHtml = $@"
            <html><body style='font-family: Arial;'>
                <h2 style='color: green;'>Login realizado com sucesso!</h2>
                <p>Bem-vindo ao Primeira Chamada MED, <b>{nome}</b> ({tipo}).</p>
            </body></html>";
        return Results.Content(sucessoHtml, "text/html");
    } else {
        string erroHtml = @"
            <html><body style='font-family: Arial;'>
                <h2 style='color: red;'>Acesso Negado</h2>
                <p>E-mail ou senha incorretos.</p>
            </body></html>";
        return Results.Content(erroHtml, "text/html");
    }
});

// Inicia o servidor na porta 5000
app.Run("http://localhost:5000");