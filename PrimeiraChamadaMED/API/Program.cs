using PrimeiraChamadaMed.Api;
using PrimeiraChamadaMed.Api.Data;

// Ponto de entrada enxuto: toda a montagem da aplicação fica no AppFactory
// (equivalente ao create_app() do Flask).
var app = AppFactory.Create(args);

await app.InitializeDatabaseAsync();
await app.RunAsync();

// Permite que o projeto de testes use a aplicação (WebApplicationFactory<Program>).
public partial class Program { }