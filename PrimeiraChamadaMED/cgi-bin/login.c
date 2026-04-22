#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sqlite3.h>

// Função para decodificar caracteres da URL (ex: transforma %40 de volta para @)
void url_decode(char *str) {
    char *pstr = str, *buf = malloc(strlen(str) + 1), *pbuf = buf;
    while (*pstr) {
        if (*pstr == '%') {
            if (pstr[1] && pstr[2]) {
                int c;
                sscanf(pstr + 1, "%2x", &c);
                *pbuf++ = (char)c;
                pstr += 3;
            }
        } else if (*pstr == '+') {
            *pbuf++ = ' ';
            pstr++;
        } else {
            *pbuf++ = *pstr++;
        }
    }
    *pbuf = '\0';
    strcpy(str, buf);
    free(buf);
}

int main() {
    // 1. Cabeçalho obrigatório do CGI para o navegador entender que é HTML
    printf("Content-type: text/html; charset=utf-8\n\n");
    printf("<html><head><title>Resultado do Login</title></head><body style='font-family: Arial;'>\n");

    // 2. Pegar os dados enviados pelo método POST
    char *lenstr = getenv("CONTENT_LENGTH");
    if (lenstr == NULL) {
        printf("<h2 style='color: red;'>Erro: Nenhum dado recebido.</h2></body></html>\n");
        return 0;
    }

    long len = strtol(lenstr, NULL, 10);
    char *post_data = malloc(len + 1);
    fgets(post_data, len + 1, stdin);

    // Decodifica os dados brutos recebidos
    url_decode(post_data);

    char email[100] = {0};
    char senha[100] = {0};

    // 3. Separar o e-mail da senha (o formato que chega é: email=teste@teste.com&senha=123)
    char *token = strtok(post_data, "&");
    while (token != NULL) {
        if (strncmp(token, "email=", 6) == 0) strcpy(email, token + 6);
        if (strncmp(token, "senha=", 6) == 0) strcpy(senha, token + 6);
        token = strtok(NULL, "&");
    }
    free(post_data);

    // 4. Conectar ao Banco de Dados
    sqlite3 *db;
    // O banco está uma pasta para trás (na raiz), pois o executável roda dentro de cgi-bin/
    int rc = sqlite3_open("../sqlite.db", &db); 

    if (rc) {
        printf("<h2>Erro ao conectar no banco de dados: %s</h2>", sqlite3_errmsg(db));
        return 0;
    }

    // 5. Preparar a consulta SQL de forma segura
    sqlite3_stmt *stmt;
    const char *sql = "SELECT nome, tipo_usuario FROM USUARIO WHERE email = ? AND senha = ?";
    rc = sqlite3_prepare_v2(db, sql, -1, &stmt, NULL);

    if (rc != SQLITE_OK) {
        printf("<h2>Erro na consulta SQL.</h2>");
        sqlite3_close(db);
        return 0;
    }

    // Substitui as interrogações (?) da query pelo e-mail e senha digitados
    sqlite3_bind_text(stmt, 1, email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, senha, -1, SQLITE_STATIC);

    // 6. Executar e verificar se achou o usuário
    rc = sqlite3_step(stmt);
    
    if (rc == SQLITE_ROW) {
        // Se achou, pega os dados que vieram do banco
        const unsigned char *nome = sqlite3_column_text(stmt, 0);
        const unsigned char *tipo = sqlite3_column_text(stmt, 1);
        printf("<h2 style='color: green;'>Login realizado com sucesso!</h2>");
        printf("<p>Bem-vindo ao Primeira Chamada MED, <b>%s</b> (%s).</p>", nome, tipo);
    } else {
        printf("<h2 style='color: red;'>Acesso Negado</h2>");
        printf("<p>E-mail ou senha incorretos.</p>");
    }

    // 7. Limpar a memória e fechar o banco
    sqlite3_finalize(stmt);
    sqlite3_close(db);

    printf("<br><br><a href='/index.html'>Voltar para a tela de login</a>");
    printf("</body></html>\n");

    return 0;
}