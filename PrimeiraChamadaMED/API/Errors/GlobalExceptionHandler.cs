using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace PrimeiraChamadaMed.Api.Errors;

/// <summary>
/// Captura exceções de qualquer rota, registra no log e devolve uma resposta padronizada
/// (Problem Details), sem expor detalhes internos ao navegador.
/// </summary>
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title, detail) = exception switch
        {
            // Regras de negócio lançadas pelos serviços (404, 409, 400)
            AppException appException =>
                (appException.StatusCode, "Não foi possível concluir a operação.", appException.Message),

            // JSON malformado, campo com tipo errado ou parâmetro obrigatório ausente
            BadHttpRequestException badRequest =>
                (badRequest.StatusCode, "Requisição inválida.",
                 "Os dados enviados estão incompletos ou em formato inválido."),

            _ =>
                (StatusCodes.Status500InternalServerError, "Erro interno do servidor.",
                 "Ocorreu um erro inesperado. Tente novamente.")
        };

        if (status >= 500)
            logger.LogError(exception, "Erro não tratado em {Method} {Path}",
                context.Request.Method, context.Request.Path);
        else
            logger.LogWarning("Requisição recusada ({Status}) em {Method} {Path}: {Message}",
                status, context.Request.Method, context.Request.Path, exception.Message);

        context.Response.StatusCode = status;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails { Status = status, Title = title, Detail = detail }
        });
    }
}