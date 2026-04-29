const API = "http://localhost:5000/api";

const root = document.getElementById("app");

function getUser() {
  const raw = sessionStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(u) {
  if (u) sessionStorage.setItem("user", JSON.stringify(u));
  else sessionStorage.removeItem("user");
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      throw new Error(j.error || j.mensagem || res.statusText);
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(text || res.statusText);
      throw e;
    }
  }
  if (res.status === 204) return undefined;
  return res.json();
}

function navigate(hash) { location.hash = hash; }

window.addEventListener("hashchange", render);
render();

function render() {
  const hash = location.hash || "#/login";
  const user = getUser();
  if (!user && !hash.startsWith("#/login")) return navigate("#/login");

  if (hash.startsWith("#/login")) return renderLogin();

  // aluno: vê apenas a área dele
  if (user.role === "student") return renderStudentHome(user);

  // mentor / admin
  if (hash.startsWith("#/admin/novo-aluno")) return renderNewStudent(user);
  if (hash.startsWith("#/admin/aluno/")) {
    const id = Number(hash.split("/").pop());
    return renderStudent(user, id);
  }
  return renderAdmin(user);
}

// -------- TELA DE LOGIN --------
function renderLogin() {
  root.innerHTML = `
    <div class="center-screen">
      <div class="card login-card">
        <span class="gold-ribbon" aria-hidden="true"></span>
        <div class="brand">
          <img src="img/lg.png" alt="Primeira Chamada MED" class="brand-logo" />
          <p>Entre com sua <span class="gold-underline">conta</span></p>
        </div>
        <form id="auth-form">
          <div class="field">
            <label>E-mail <span class="gold-text">★</span></label>
            <input name="email" type="email" required placeholder="Ex.: aluno@gmail.com" />
          </div>
          <div class="field">
            <label>Senha <span class="gold-text">★</span></label>
            <input name="password" type="password" required minlength="4" placeholder="Ex.: med2024" />
          </div>
          <button type="submit" class="btn">Entrar</button>
          <p id="msg" class="error"></p>
          <p class="muted" style="margin-top:1rem;font-size:.85rem;text-align:center">
            Admin padrão: <b>admin@teste.com</b> / <b>123456</b>
          </p>
        </form>
      </div>
    </div>`;

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    const msg = document.getElementById("msg");
    msg.textContent = "";

    try {
      const u = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(u);
      navigate(u.role === "student" ? "#/aluno" : "#/admin");
    } catch (err) {
      msg.textContent = err.message || "E-mail ou senha inválidos.";
    }
  });
}

// -------- HOME DO ALUNO (vê o próprio planner) --------
async function renderStudentHome(user) {
  root.innerHTML = headerHtml(user) + `
    <main class="container">
      <section class="section">
        <div class="row">
          <div style="display:flex;gap:1rem;align-items:center">
            <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
            <div>
              <h2 style="margin:0">Olá, ${user.name}!</h2>
              <div class="muted" id="student-sub">Carregando seu planner...</div>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 style="color:var(--navy);margin-bottom:1rem">Meu planner semanal</h2>
        <div id="planner"><div class="empty">Carregando...</div></div>
      </section>
    </main>`;
  bindHeader();

  try {
    const data = await api(`/me/planner?userId=${user.id}`);
    const sub = document.getElementById("student-sub");
    const plannerEl = document.getElementById("planner");

    if (!data.student) {
      sub.textContent = "Seu mentor ainda não vinculou um plano de estudos.";
      plannerEl.innerHTML = `<div class="empty">Nenhum planner disponível ainda.</div>`;
      return;
    }

    sub.textContent = `${data.student.email} · ${data.student.course}`;
    const planner = data.planner;
    plannerEl.innerHTML = planner.length ? planner.map(p => `
      <div class="planner-item ${p.done ? "done" : ""}">
        <button class="checkbox ${p.done ? "checked" : ""}" data-toggle="${p.id}">${p.done ? "✓" : ""}</button>
        <div class="meta">
          <span>📅 ${p.day}</span>
          <b>📘 ${p.subject}</b>
          <span style="${p.done ? 'text-decoration:line-through' : ''}">${p.topic}</span>
          <span>⏱ ${p.hours}h</span>
        </div>
      </div>
    `).join("") : `<div class="empty">Nenhuma tarefa no seu planner ainda.</div>`;

    plannerEl.querySelectorAll("[data-toggle]").forEach(b => {
      b.onclick = async () => {
        const item = planner.find(p => p.id === Number(b.dataset.toggle));
        await api(`/planner/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...item, done: !item.done })
        });
        renderStudentHome(user);
      };
    });
  } catch (err) {
    document.getElementById("student-sub").textContent = "Erro ao carregar: " + err.message;
  }
}

// -------- ADMIN (lista de alunos) --------
async function renderAdmin(mentor) {
  root.innerHTML = headerHtml(mentor) + `
    <main class="container">
      <section class="section">
        <div class="row">
          <h2 style="margin:0">Meus alunos</h2>
          <a class="link-btn" href="#/admin/novo-aluno">+ Novo aluno</a>
        </div>
      </section>
      <section>
        <div id="list" class="grid-cards"></div>
      </section>
    </main>`;
  bindHeader();

  const list = document.getElementById("list");
  async function refresh() {
    try {
      const students = await api(`/students?mentorId=${mentor.id}`);
      list.innerHTML = students.length ? students.map(s => `
        <article class="student-card">
          <div class="row">
            <div style="display:flex;gap:.75rem;align-items:center">
              <div class="avatar">${initials(s.name)}</div>
              <div><b>${s.name}</b><div class="muted" style="font-size:.8rem">${s.email}</div></div>
            </div>
            <button class="btn-danger" data-del="${s.id}">✕</button>
          </div>
          <div class="row"><span class="badge">${s.course}</span></div>
          <a class="link-btn" href="#/admin/aluno/${s.id}">Ver planner →</a>
        </article>
      `).join("") : `<div class="empty">Nenhum aluno cadastrado ainda. Clique em <b>+ Novo aluno</b> para começar.</div>`;

      list.querySelectorAll("[data-del]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Remover aluno?")) return;
          await api(`/students/${b.dataset.del}`, { method: "DELETE" });
          refresh();
        };
      });
    } catch (err) {
      list.innerHTML = `<div class="empty">Erro ao carregar alunos: ${err.message}</div>`;
    }
  }
  refresh();
}

// -------- /admin/novo-aluno --------
function renderNewStudent(mentor) {
  root.innerHTML = headerHtml(mentor) + `
    <main class="container">
      <a class="back-link" href="#/admin">← Voltar para alunos</a>
      <section class="section" style="margin-top:1rem">
        <h2>Cadastrar novo aluno</h2>
        <p class="muted" style="margin-bottom:1rem">
          Preencha os dados do aluno. Ao definir uma <b>senha inicial</b>, o aluno também receberá um login para acessar o sistema.
        </p>
        <form id="new-student" class="grid-form">
          <div class="field"><label>Nome *</label><input name="name" required placeholder="Ex.: João Silva" /></div>
          <div class="field"><label>E-mail *</label><input name="email" type="email" required placeholder="Ex.: joao@gmail.com" /></div>
          <div class="field"><label>Curso / Objetivo *</label><input name="course" required placeholder="Ex.: Medicina USP" /></div>
          <div class="field"><label>Telefone</label><input name="phone" placeholder="(00) 00000-0000" /></div>
          <div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" /></div>
          <div class="field"><label>Senha inicial do aluno</label><input name="initialPassword" type="password" minlength="4" placeholder="Mínimo 4 caracteres (opcional)" /></div>
          <div class="field" style="grid-column:1/-1"><label>Observações</label><textarea name="notes" rows="3" placeholder="Anotações sobre o aluno..."></textarea></div>
          <div style="grid-column:1/-1;display:flex;gap:.75rem;align-items:center">
            <button class="btn" style="max-width:200px">Cadastrar aluno</button>
            <a class="back-link" href="#/admin">Cancelar</a>
          </div>
          <p id="student-msg" class="error" style="grid-column:1/-1"></p>
        </form>
      </section>
    </main>`;
  bindHeader();

  document.getElementById("new-student").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("student-msg");
    msg.textContent = "";
    const fd = new FormData(e.target);
    const payload = { mentorId: mentor.id, ...Object.fromEntries(fd) };
    ["phone", "birthDate", "notes", "initialPassword"].forEach(k => {
      if (!payload[k]) delete payload[k];
    });
    try {
      await api("/students", { method: "POST", body: JSON.stringify(payload) });
      navigate("#/admin");
    } catch (err) {
      msg.textContent = err.message || "Não foi possível cadastrar o aluno.";
    }
  });
}

// -------- STUDENT PLANNER (admin vendo planner do aluno) --------
async function renderStudent(mentor, id) {
  const data = await api(`/students/${id}`);
  const { student } = data;
  let planner = data.planner;

  function paint() {
    const completed = planner.filter(p => p.done).length;
    const totalH = planner.reduce((a, b) => a + b.hours, 0);

    root.innerHTML = headerHtml(mentor) + `
      <main class="container">
        <a class="back-link" href="#/admin">← Voltar para alunos</a>
        <section class="section" style="margin-top:1rem">
          <div class="row">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(student.name)}</div>
              <div>
                <h2 style="margin:0">${student.name}</h2>
                <div class="muted">${student.email} · ${student.course}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><b>${completed}/${planner.length}</b><span>Concluídas</span></div>
              <div class="stat"><b>${totalH}h</b><span>Planejadas</span></div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2>Adicionar tarefa</h2>
          <form id="new-task" class="grid-form">
            <div class="field"><label>Dia</label>
              <select name="day">${["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"].map(d => `<option>${d}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Matéria</label><input name="subject" required /></div>
            <div class="field"><label>Tópico</label><input name="topic" required /></div>
            <div class="field"><label>Horas</label><input name="hours" type="number" step="0.5" min="0.5" value="1" /></div>
            <button class="btn" style="max-width:160px">Adicionar</button>
          </form>
        </section>

        <section>
          <h2 style="color:var(--navy);margin-bottom:1rem">Planner semanal</h2>
          <div id="planner">
            ${planner.length ? planner.map(p => `
              <div class="planner-item ${p.done ? "done" : ""}">
                <button class="checkbox ${p.done ? "checked" : ""}" data-toggle="${p.id}">${p.done ? "✓" : ""}</button>
                <div class="meta">
                  <span>📅 ${p.day}</span>
                  <b>📘 ${p.subject}</b>
                  <span style="${p.done ? 'text-decoration:line-through' : ''}">${p.topic}</span>
                  <span>⏱ ${p.hours}h</span>
                </div>
                <button class="btn-danger" data-del="${p.id}">✕</button>
              </div>
            `).join("") : `<div class="empty">Nenhuma tarefa no planner ainda.</div>`}
          </div>
        </section>
      </main>`;
    bindHeader();

    document.getElementById("new-task").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd);
      payload.hours = Number(payload.hours);
      payload.done = false;
      await api(`/students/${id}/planner`, { method: "POST", body: JSON.stringify(payload) });
      const fresh = await api(`/students/${id}`);
      planner = fresh.planner;
      paint();
    });

    root.querySelectorAll("[data-toggle]").forEach(b => {
      b.onclick = async () => {
        const item = planner.find(p => p.id === Number(b.dataset.toggle));
        await api(`/planner/${item.id}`, { method: "PUT", body: JSON.stringify({ ...item, done: !item.done }) });
        item.done = !item.done; paint();
      };
    });
    root.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        await api(`/planner/${b.dataset.del}`, { method: "DELETE" });
        planner = planner.filter(p => p.id !== Number(b.dataset.del)); paint();
      };
    });
  }
  paint();
}

// -------- helpers --------
function headerHtml(u) {
  const home = u.role === "student" ? "#/aluno" : "#/admin";
  const subtitle = u.role === "student" ? "Área do Aluno" : "Painel do Mentor";
  return `
    <header class="app-header">
      <a class="logo" href="${home}" style="color:#fff;text-decoration:none">
        <img src="img/lg.png" alt="Primeira Chamada MED" class="logo-img" />
        <div><div>Primeira Chamada <span style="color:var(--gold)">MED</span></div><div style="font-size:.75rem;opacity:.8">${subtitle}</div></div>
      </a>
      <div style="display:flex;align-items:center;gap:1rem">
        <span style="font-size:.875rem;opacity:.85">${u.name}</span>
        <button class="btn-ghost" id="logout">Sair</button>
      </div>
    </header>`;
}
function bindHeader() {
  const b = document.getElementById("logout");
  if (b) b.onclick = () => { setUser(null); navigate("#/login"); };
}
function initials(name) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}
