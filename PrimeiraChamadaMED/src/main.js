const API = "http://localhost:5000/api";

const root = document.getElementById("app");

function getMentor() {
  const raw = sessionStorage.getItem("mentor");
  return raw ? JSON.parse(raw) : null;
}

function setMentor(m) {
  if (m) sessionStorage.setItem("mentor", JSON.stringify(m));
  else sessionStorage.removeItem("mentor");
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  if (res.status === 204) return undefined;
  return res.json();
}

function navigate(hash) {
  location.hash = hash;
}

window.addEventListener("hashchange", render);
render();

function render() {
  const hash = location.hash || "#/login";
  const mentor = getMentor();
  if (!mentor && !hash.startsWith("#/login")) return navigate("#/login");

  if (hash.startsWith("#/login")) return renderLogin();
  if (hash.startsWith("#/admin/aluno/")) {
    const id = Number(hash.split("/").pop());
    return renderStudent(mentor, id);
  }
  return renderAdmin(mentor);
}

// -------- LOGIN --------
function renderLogin() {
  let mode = "login";
  draw();

  function draw() {
    root.innerHTML = `
      <div class="center-screen">
        <div class="card">
          <div class="brand">
            <div class="brand-icon">SH</div>
            <h1>Study Hub</h1>
            <p>${mode === "login" ? "Entre com sua conta" : "Crie sua conta de mentor"}</p>
          </div>
          <div class="tab-toggle">
            <button id="tab-login" class="${mode === "login" ? "active" : ""}">Entrar</button>
            <button id="tab-register" class="${mode === "register" ? "active" : ""}">Cadastrar</button>
          </div>
          <form id="auth-form">
            ${mode === "register" ? `
              <div class="field"><label>Nome</label><input name="name" required /></div>
            ` : ""}
            <div class="field"><label>E-mail</label><input name="email" type="email" required /></div>
            <div class="field"><label>Senha</label><input name="password" type="password" required minlength="4" /></div>
            <button type="submit" class="btn">${mode === "login" ? "Entrar" : "Cadastrar"}</button>
            <p id="msg" class="error"></p>
          </form>
        </div>
      </div>`;
    document.getElementById("tab-login").onclick = () => { mode = "login"; draw(); };
    document.getElementById("tab-register").onclick = () => { mode = "register"; draw(); };
    document.getElementById("auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd);
      const msg = document.getElementById("msg");
      msg.textContent = "";
      try {
        const m = await api(`/auth/${mode === "login" ? "login" : "register"}`, {
          method: "POST", body: JSON.stringify(payload),
        });
        setMentor(m);
        navigate("#/admin");
      } catch (err) {
        msg.textContent = mode === "login" ? "E-mail ou senha inválidos." : (err.message || "Erro ao cadastrar.");
      }
    });
  }
}

// -------- ADMIN --------
async function renderAdmin(mentor) {
  root.innerHTML = headerHtml(mentor) + `
    <main class="container">
      <section class="section">
        <h2>Cadastrar novo aluno</h2>
        <form id="new-student" class="grid-form">
          <div class="field"><label>Nome</label><input name="name" required /></div>
          <div class="field"><label>E-mail</label><input name="email" type="email" required /></div>
          <div class="field"><label>Curso / Objetivo</label><input name="course" required /></div>
          <button class="btn" style="max-width:180px">Cadastrar</button>
        </form>
      </section>
      <section>
        <h2 style="color:var(--navy);margin-bottom:1rem">Meus alunos</h2>
        <div id="list" class="grid-cards"></div>
      </section>
    </main>`;
  bindHeader();

  const list = document.getElementById("list");
  async function refresh() {
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
    `).join("") : `<div class="empty">Nenhum aluno cadastrado ainda.</div>`;

    list.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        if (!confirm("Remover aluno?")) return;
        await api(`/students/${b.dataset.del}`, { method: "DELETE" });
        refresh();
      };
    });
  }
  refresh();

  document.getElementById("new-student").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = { mentorId: mentor.id, ...Object.fromEntries(fd) };
    await api("/students", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    refresh();
  });
}

// -------- STUDENT PLANNER --------
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
              <select name="day">${["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"].map(d=>`<option>${d}</option>`).join("")}</select>
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
                  <span style="${p.done?'text-decoration:line-through':''}">${p.topic}</span>
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
function headerHtml(m) {
  return `
    <header class="app-header">
      <a class="logo" href="#/admin" style="color:#fff;text-decoration:none">
        <span class="icon">SH</span>
        <div><div>Study Hub</div><div style="font-size:.75rem;opacity:.8">Painel do Mentor</div></div>
      </a>
      <div style="display:flex;align-items:center;gap:1rem">
        <span style="font-size:.875rem;opacity:.85">${m.name}</span>
        <button class="btn-ghost" id="logout">Sair</button>
      </div>
    </header>`;
}
function bindHeader() {
  const b = document.getElementById("logout");
  if (b) b.onclick = () => { setMentor(null); navigate("#/login"); };
}
function initials(name) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}