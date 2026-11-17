# Primeira Chamada MED

Planner de estudos com acompanhamento de mentores, para estudantes que se preparam para o vestibular de Medicina.

- **Mentor:** cadastra alunos, monta o planner semanal de cada um, acompanha o progresso da turma e publica avisos no mural.
- **Aluno:** segue o planner, usa o cronômetro de foco, marca os blocos concluídos e mantém a ofensiva de dias seguidos de estudo.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| API | C# / .NET 10, ASP.NET Core Minimal APIs |
| Banco de dados | SQLite com Entity Framework Core 10 |
| Front-end | HTML, JavaScript, Bootstrap 5, Vite |
| Testes | xUnit, Microsoft.AspNetCore.Mvc.Testing |

## Estrutura

```
API/          API ASP.NET Core (fábrica em AppFactory.cs, rotas em Endpoints/, regras em Services/)
API.Tests/    testes de unidade e de integração
src/          front-end (core/, components/, pages/ e o roteador main.js)
img/          imagens
index.html    página do front-end
SQLite.db     banco de dados
```

## Pré-requisitos

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org) 18 ou superior

## Como rodar

**1. API** (pasta `API`)

```bash
copy .env.example .env    # Linux/macOS: cp .env.example .env
dotnet run
```

A API sobe em http://localhost:5000. O `.env` é opcional: sem ele, valem os valores de `appsettings.json`.

**2. Front-end** (pasta raiz, em outro terminal)

```bash
npm install
npm run dev
```

Acesse http://localhost:5173.

**3. Testes** (pasta raiz)

```bash
dotnet test
```

## Configuração

| Variável (`API/.env`) | Exemplo | Descrição |
|---|---|---|
| `ConnectionStrings__Default` | `Data Source=../SQLite.db` | Caminho do banco |
| `Api__Url` | `http://localhost:5000` | Endereço da API |
| `Cors__AllowedOrigins` | `http://localhost:5173` | Endereços do front autorizados (separados por vírgula) |
| `Seed__MentorName`, `Seed__MentorEmail`, `Seed__MentorPassword` | ver `.env.example` | Mentor criado quando o banco não tem nenhum |

O endereço da API usado pelo front fica em `src/config.js`.

## Conta de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Mentor | admin@primeirachamada.com | senha@123 |

Para começar com um banco vazio, apague o `SQLite.db` e rode a API com o `.env` copiado do exemplo. Ela cria as tabelas e o mentor `admin@primeirachamada.com`, com a senha `senha@123`.

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login de aluno ou mentor |
| GET | `/api/students?mentorId={id}` | Alunos de um mentor |
| GET | `/api/students/{id}?semana=AAAA-MM-DD` | Aluno e blocos da semana |
| POST | `/api/students` | Cadastra aluno |
| PUT | `/api/students/{id}` | Edita aluno |
| PUT | `/api/students/{id}/profile` | Atualiza nome e foto do aluno |
| DELETE | `/api/students/{id}` | Remove aluno e seus blocos |
| POST | `/api/planner` | Cria bloco de estudo |
| PUT | `/api/planner/{id}` | Edita bloco |
| PATCH | `/api/planner/{id}/status` | Marca ou desmarca como concluído |
| PATCH | `/api/planner/{id}/time` | Salva o tempo do cronômetro |
| DELETE | `/api/planner/{id}` | Remove bloco |
| GET | `/api/news` | Lista avisos |
| POST | `/api/news` | Publica aviso |
| PUT | `/api/news/{id}` | Edita aviso |
| DELETE | `/api/news/{id}` | Remove aviso |

## Equipe

- Davi Brunelli
- Talita Canedo
- Kaua Putin