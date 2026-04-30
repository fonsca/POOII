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
  // Se não tem nada na URL, o padrão é o login do mentor
  const hash = location.hash || "#/login-admin"; 
  const user = getUser();
  
  // Se não está logado e tentou acessar rota restrita, joga pro login
  if (!user && !hash.startsWith("#/login")) return navigate("#/login-admin");

  // ---- TELAS DE LOGIN ----
  // Aqui nós passamos o 'type' para a tela de login saber quem está entrando!
  if (hash === "#/login-aluno") return renderLogin("student");
  if (hash.startsWith("#/login")) return renderLogin("mentor");

  // ---- ÁREA DO ALUNO ----
  if (user.role === "student") return renderStudentHome(user);

  // ---- ÁREA DO MENTOR ----
  if (hash.startsWith("#/admin/novo-aluno")) return renderNewStudent(user);
  if (hash.startsWith("#/admin/aluno/")) {
    const id = Number(hash.split("/").pop());
    return renderStudent(user, id);
  }
  
  return renderAdmin(user);
}

// -------- TELA DE LOGIN --------
// -------- TELA DE LOGIN (Dinâmica) --------
function renderLogin(type) {
  const title = type === "student" ? "Área do Aluno" : "Painel do Mentor";
  const linkText = type === "student" ? "Sou um mentor →" : "← Sou um aluno";
  const linkHref = type === "student" ? "#/login-admin" : "#/login-aluno";

  root.innerHTML = `
    <div class="center-screen">
      <div class="card login-card">
        <span class="gold-ribbon" aria-hidden="true"></span>
        <div class="brand">
          <img src="img/lg.png" alt="Primeira Chamada MED" class="brand-logo" />
          <h3 style="color: var(--navy); margin: 0.5rem 0;">${title}</h3>
          <p>Entre com sua <span class="gold-underline">conta</span></p>
        </div>
        <form id="auth-form">
          <div class="field">
            <label>E-mail <span class="gold-text">★</span></label>
            <input name="email" type="email" required placeholder="Ex.: seu@email.com" />
          </div>
          <div class="field">
            <label>Senha <span class="gold-text">★</span></label>
            <div style="position: relative; display: flex; align-items: center;">
              <input name="password" id="login-pwd" type="password" required minlength="4" style="width: 100%; padding-right: 2.5rem;" />
              <button type="button" onclick="togglePwd('login-pwd', this)" class="pwd-toggle-btn" title="Mostrar/Ocultar senha">
                <img src="img/olho-aberto.png" alt="Olho" class="eye-img" />
              </button>
            </div>  
          </div>
          <button type="submit" class="btn">Entrar</button>
          <p id="msg" class="error"></p>
        </form>
        <div style="text-align: center; margin-top: 1.5rem;">
           <a href="${linkHref}" class="muted" style="font-size: 0.85rem; text-decoration: none;">${linkText}</a>
        </div>
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
      
      if (u.role !== type) {
          throw new Error(`Acesso negado. Esta tela é exclusiva para ${type === 'student' ? 'alunos' : 'mentores'}.`);
      }

      setUser(u);
      navigate(u.role === "student" ? "#/aluno" : "#/admin");
    } catch (err) {
      msg.textContent = err.message || "E-mail ou senha inválidos.";
    }
  });
}

// -------- HOME DO ALUNO (vê o próprio planner) --------
async function renderStudentHome(user) {
  try {
    const data = await api(`/me/planner?userId=${user.id}`);
    
    function paint() {
      if (!data.student) {
        root.innerHTML = layoutHtml(user, `<div class="empty">Seu mentor ainda não vinculou um plano de estudos.</div>`);
        bindHeader();
        return;
      }

      const planner = data.planner;
      
      // 📊 Cálculos da Barra de Progresso
      const totalH = planner.reduce((acc, p) => acc + p.hours, 0);
      const completedH = planner.filter(p => p.done).reduce((acc, p) => acc + p.hours, 0);
      const progressPercent = totalH === 0 ? 0 : Math.round((completedH / totalH) * 100);

      const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">${data.student.email} · ${data.student.course}</div>
              </div>
            </div>
          </div>
          
          <!-- BARRA DE PROGRESSO -->
          <div class="progress-wrapper">
            <div class="progress-header">
              <span>Progresso da Semana</span>
              <span>${completedH}h de ${totalH}h (${progressPercent}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="color:var(--navy);margin-bottom:1rem">Meu planner semanal</h2>
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
              </div>
            `).join("") : `<div class="empty">Nenhuma tarefa no seu planner ainda.</div>`}
          </div>
        </section>
      `;

      root.innerHTML = layoutHtml(user, pageContent);
      bindHeader();

      // Evento de marcar/desmarcar tarefa
      // Evento de marcar/desmarcar tarefa (Com animação suave)
      root.querySelectorAll("[data-toggle]").forEach(b => {
        b.onclick = async () => {
          const item = planner.find(p => p.id === Number(b.dataset.toggle));
          item.done = !item.done; // Inverte o status
          
          // 1. Atualiza visualmente a caixinha e o texto da tarefa
          const taskItem = b.closest('.planner-item');
          if (item.done) {
            taskItem.classList.add('done');
            b.classList.add('checked');
            b.textContent = "✓";
            taskItem.querySelector('.meta').querySelectorAll('span')[1].style.textDecoration = 'line-through';
          } else {
            taskItem.classList.remove('done');
            b.classList.remove('checked');
            b.textContent = "";
            taskItem.querySelector('.meta').querySelectorAll('span')[1].style.textDecoration = '';
          }

          // 2. Calcula a nova porcentagem e movimenta a barra devagar
          const completedH = planner.filter(p => p.done).reduce((acc, p) => acc + p.hours, 0);
          const totalH = planner.reduce((acc, p) => acc + p.hours, 0);
          const progressPercent = totalH === 0 ? 0 : Math.round((completedH / totalH) * 100);
          
          document.querySelector('.progress-fill').style.width = progressPercent + '%';
          document.querySelector('.progress-header span:last-child').textContent = `${completedH}h de ${totalH}h (${progressPercent}%)`;

          // 3. Salva no banco de dados em segundo plano
          await api(`/planner/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...item })
          });
        };
      });
    }

    paint();

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar o planner: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- ADMIN (lista de alunos) --------
// -------- ADMIN (lista de alunos) --------
async function renderAdmin(mentor) {
  const pageContent = `
    <section class="section" style="margin-bottom:1.5rem">
      <div class="row">
        <h2 style="margin:0">Meus alunos</h2>
        <a class="link-btn" href="#/admin/novo-aluno">+ Novo aluno</a>
      </div>
    </section>
    <section>
      <div id="list" class="grid-cards"></div>
    </section>
  `;

  root.innerHTML = layoutHtml(mentor, pageContent);
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
            <button class="btn-danger" data-del-student="${s.id}" title="Remover aluno">✕</button>
          </div>
          <div class="row"><span class="badge">${s.course}</span></div>
          <a class="link-btn" href="#/admin/aluno/${s.id}">Ver planner →</a>
        </article>
      `).join("") : `<div class="empty">Nenhum aluno cadastrado ainda. Clique em <b>+ Novo aluno</b> para começar.</div>`;

      // Evento de excluir aluno
      list.querySelectorAll("[data-del-student]").forEach(b => {
        b.onclick = async () => {
          if (!confirm("Tem certeza que deseja remover este aluno?")) return;
          await api(`/students/${b.dataset.delStudent}`, { method: "DELETE" });
          refresh();
        };
      });
    } catch (err) {
      list.innerHTML = `<div class="empty">Erro ao carregar alunos: ${err.message}</div>`;
    }
  }
  
  refresh();
}

// -------- STUDENT PLANNER (admin vendo planner do aluno) --------
async function renderStudent(mentor, id) {
  try {
    const data = await api(`/students/${id}`);
    const { student } = data;
    let planner = data.planner;

    function paint() {
      // 📊 Cálculos da Barra de Progresso
      const completedTasks = planner.filter(p => p.done).length;
      const totalH = planner.reduce((a, b) => a + b.hours, 0);
      const completedH = planner.filter(p => p.done).reduce((a, b) => a + b.hours, 0);
      const progressPercent = totalH === 0 ? 0 : Math.round((completedH / totalH) * 100);

      const pageContent = `
        <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
        
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row" style="align-items:flex-start">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(student.name)}</div>
              <div>
                <h2 style="margin:0">${student.name}</h2>
                <div class="muted">${student.email} · ${student.course}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><b>${completedTasks}/${planner.length}</b><span>Tarefas feitas</span></div>
            </div>
          </div>

          <!-- BARRA DE PROGRESSO DO ALUNO -->
          <div class="progress-wrapper">
            <div class="progress-header">
              <span>Progresso da Semana</span>
              <span>${completedH}h de ${totalH}h (${progressPercent}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </section>

        <section class="section" style="margin-bottom:1.5rem">
          <h2 style="margin-bottom: 1rem;">Adicionar tarefa</h2>
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
              
                <div class="checkbox ${p.done ? "checked" : ""}" style="cursor: default;" title="${p.done ? 'Concluída pelo aluno' : 'Aguardando aluno'}">${p.done ? "✓" : ""}</div>

                <div class="meta">
                  <span>📅 ${p.day}</span>
                  <b>📘 ${p.subject}</b>
                  <span style="${p.done?'text-decoration:line-through':''}">${p.topic}</span>
                  <span>⏱ ${p.hours}h</span>
                </div>
                <!-- O mentor continua podendo deletar a tarefa -->
                <button class="btn-danger" data-del-task="${p.id}">✕</button>
              </div>
            `).join("") : `<div class="empty">Nenhuma tarefa no planner ainda.</div>`}
          </div>
        </section>
      `;

      root.innerHTML = layoutHtml(mentor, pageContent);
      bindHeader();

      // Adicionar nova tarefa
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

      // Excluir tarefa do planner
      root.querySelectorAll("[data-del-task]").forEach(b => {
        b.onclick = async () => {
          await api(`/planner/${b.dataset.delTask}`, { method: "DELETE" });
          planner = planner.filter(p => p.id !== Number(b.dataset.delTask)); 
          paint();
        };
      });
      
      // O evento de marcar/desmarcar foi removido daqui!
    }
    
    paint();

  } catch (err) {
    console.error(err);
    root.innerHTML = layoutHtml(mentor, `<div class="empty" style="color: red;">Erro ao carregar o planner: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- STUDENT PLANNER (admin vendo planner do aluno) --------
async function renderStudent(mentor, id) {
  try {
    const data = await api(`/students/${id}`);
    const { student } = data;
    let planner = data.planner;

    function paint() {
      // 📊 Cálculos da Barra de Progresso
      const completedTasks = planner.filter(p => p.done).length;
      const totalH = planner.reduce((a, b) => a + b.hours, 0);
      const completedH = planner.filter(p => p.done).reduce((a, b) => a + b.hours, 0);
      const progressPercent = totalH === 0 ? 0 : Math.round((completedH / totalH) * 100);

      const pageContent = `
        <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
        
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row" style="align-items:flex-start">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(student.name)}</div>
              <div>
                <h2 style="margin:0">${student.name}</h2>
                <div class="muted">${student.email} · ${student.course}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><b>${completedTasks}/${planner.length}</b><span>Tarefas feitas</span></div>
            </div>
          </div>

          <!-- BARRA DE PROGRESSO DO ALUNO -->
          <div class="progress-wrapper">
            <div class="progress-header">
              <span>Progresso da Semana</span>
              <span>${completedH}h de ${totalH}h (${progressPercent}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </section>

        <section class="section" style="margin-bottom:1.5rem">
          <h2 style="margin-bottom: 1rem;">Adicionar tarefa</h2>
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
                <button class="btn-danger" data-del-task="${p.id}">✕</button>
              </div>
            `).join("") : `<div class="empty">Nenhuma tarefa no planner ainda.</div>`}
          </div>
        </section>
      `;

      root.innerHTML = layoutHtml(mentor, pageContent);
      bindHeader();

      // Adicionar nova tarefa
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

      // Marcar/Desmarcar como concluída
      root.querySelectorAll("[data-toggle]").forEach(b => {
        b.onclick = async () => {
          const item = planner.find(p => p.id === Number(b.dataset.toggle));
          await api(`/planner/${item.id}`, { method: "PUT", body: JSON.stringify({ ...item, done: !item.done }) });
          item.done = !item.done; 
          paint();
        };
      });

      // Excluir tarefa do planner
      root.querySelectorAll("[data-del-task]").forEach(b => {
        b.onclick = async () => {
          await api(`/planner/${b.dataset.delTask}`, { method: "DELETE" });
          planner = planner.filter(p => p.id !== Number(b.dataset.delTask)); 
          paint();
        };
      });
    }
    
    paint();

  } catch (err) {
    console.error(err);
    root.innerHTML = layoutHtml(mentor, `<div class="empty" style="color: red;">Erro ao carregar o planner: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- /admin/novo-aluno --------
function renderNewStudent(mentor) {
  const pageContent = `
    <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
    <section class="section">
      <h2 style="margin-bottom:0.5rem">Cadastrar novo aluno</h2>
      <p class="muted" style="margin-bottom:1.5rem">
        Preencha os dados do aluno. Ao definir uma <b>senha inicial</b>, o aluno também receberá um login para acessar o sistema.
      </p>
      <form id="new-student" class="grid-form">
        <div class="field"><label>Nome *</label><input name="name" required placeholder="Ex.: João Silva" /></div>
        <div class="field"><label>E-mail *</label><input name="email" type="email" required placeholder="Ex.: joao@gmail.com" /></div>
        <div class="field"><label>Curso / Objetivo *</label><input name="course" required placeholder="Ex.: Medicina USP" /></div>
        <div class="field"><label>Telefone</label><input name="phone" placeholder="(00) 00000-0000" /></div>
        <div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" /></div>
        
        <div class="field">
          <label>Senha inicial do aluno</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input name="initialPassword" id="new-pwd" type="password" minlength="4" placeholder="Mínimo 4 caracteres (opcional)" style="width: 100%; padding-right: 2.5rem;" />
            <button type="button" onclick="togglePwd('new-pwd', this)" class="pwd-toggle-btn" title="Mostrar/Ocultar senha">
              <img src="img/olho-aberto.png" alt="Olho" class="eye-img" />
            </button>
          </div>
        </div>

        <div class="field" style="grid-column:1/-1"><label>Observações</label><textarea name="notes" rows="3" placeholder="Anotações sobre o aluno..."></textarea></div>
        <div style="grid-column:1/-1;display:flex;gap:1rem;align-items:center;margin-top:1rem;">
          <button class="btn" style="max-width:200px">Cadastrar aluno</button>
          <a href="#/admin" style="color:#666; text-decoration:none; font-weight:500;">Cancelar</a>
        </div>
        <p id="student-msg" class="error" style="grid-column:1/-1"></p>
      </form>
    </section>
  `;

  root.innerHTML = layoutHtml(mentor, pageContent);
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


// -------- HOME DO ALUNO (vê o próprio planner) --------
// -------- HOME DO ALUNO (vê o próprio planner) --------
async function renderStudentHome(user) {
  try {
    // 🐛 AQUI ESTAVA O BUG! Agora o aluno busca na mesma rota que o admin usa:
    const data = await api(`/students/${user.id}`); 
    
    function paint() {
      // Pega os dados exatamente na mesma estrutura do Admin
      const student = data.student || user;
      const planner = data.planner || [];

      if (!planner.length && !data.student) {
        root.innerHTML = layoutHtml(user, `<div class="empty">Seu mentor ainda não vinculou um plano de estudos.</div>`);
        bindHeader();
        return;
      }
      
      // 📊 Cálculos da Barra de Progresso
      const totalH = planner.reduce((acc, p) => acc + p.hours, 0);
      const completedH = planner.filter(p => p.done).reduce((acc, p) => acc + p.hours, 0);
      const progressPercent = totalH === 0 ? 0 : Math.round((completedH / totalH) * 100);

      const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">${student.email} · ${student.course || "Aluno"}</div>
              </div>
            </div>
          </div>
          
          <!-- BARRA DE PROGRESSO -->
          <div class="progress-wrapper">
            <div class="progress-header">
              <span>Progresso da Semana</span>
              <span>${completedH}h de ${totalH}h (${progressPercent}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="color:var(--navy);margin-bottom:1rem">Meu planner semanal</h2>
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
              </div>
            `).join("") : `<div class="empty">Nenhuma tarefa no seu planner ainda.</div>`}
          </div>
        </section>
      `;

      root.innerHTML = layoutHtml(user, pageContent);
      bindHeader();

      // Evento de marcar/desmarcar tarefa (Com animação suave)
      root.querySelectorAll("[data-toggle]").forEach(b => {
        b.onclick = async () => {
          const item = planner.find(p => p.id === Number(b.dataset.toggle));
          item.done = !item.done; // Inverte o status
          
          // 1. Atualiza visualmente a caixinha e o texto da tarefa
          const taskItem = b.closest('.planner-item');
          if (item.done) {
            taskItem.classList.add('done');
            b.classList.add('checked');
            b.textContent = "✓";
            taskItem.querySelector('.meta').querySelectorAll('span')[1].style.textDecoration = 'line-through';
          } else {
            taskItem.classList.remove('done');
            b.classList.remove('checked');
            b.textContent = "";
            taskItem.querySelector('.meta').querySelectorAll('span')[1].style.textDecoration = '';
          }

          // 2. Calcula a nova porcentagem e movimenta a barra devagar
          const completedH_new = planner.filter(p => p.done).reduce((acc, p) => acc + p.hours, 0);
          const totalH_new = planner.reduce((acc, p) => acc + p.hours, 0);
          const progressPercent_new = totalH_new === 0 ? 0 : Math.round((completedH_new / totalH_new) * 100);
          
          document.querySelector('.progress-fill').style.width = progressPercent_new + '%';
          document.querySelector('.progress-header span:last-child').textContent = `${completedH_new}h de ${totalH_new}h (${progressPercent_new}%)`;

          // 3. Salva no banco de dados em segundo plano
          await api(`/planner/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...item })
          });
        };
      });
    }

    paint();

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar o planner: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- helpers --------
function layoutHtml(u, content) {
  const isStudent = u.role === "student";
  const subtitle = isStudent ? "Área do Aluno" : "Painel do Mentor";
  
  // 💾 Verifica se o usuário tinha deixado a barra fechada na última vez
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  const collapsedClass = isCollapsed ? "collapsed" : "";

  // 📝 Configurando os links separados (Ícone + Texto)
  const menuItems = isStudent 
    ? `<a href="#/aluno" title="Meu Planner"><span style="font-size: 1.25rem">📅</span> <span class="hide-on-collapse">Meu Planner</span></a>`
    : `<a href="#/admin" title="Meus Alunos"><span style="font-size: 1.25rem">👥</span> <span class="hide-on-collapse">Meus Alunos</span></a>`;

  return `
    <div class="app-layout">
      <!-- BARRA LATERAL -->
      <aside class="sidebar ${collapsedClass}" id="main-sidebar">
        <div class="sidebar-top">
          <div class="sidebar-brand" title="Primeira Chamada MED">
            <img src="img/lg.png" alt="Logo" style="width: 40px; height: 40px; object-fit: contain;" />
            <div class="hide-on-collapse">
              <div style="font-weight: bold; font-size: 1rem;">Primeira Chamada <span style="color:var(--gold)">MED</span></div>
              <div style="font-size: 0.75rem; opacity: 0.7;">${subtitle}</div>
            </div>
          </div>
          <!-- Botão de Hambúrguer -->
          <button class="toggle-btn" id="toggle-sidebar" title="Recolher/Expandir menu">☰</button>
        </div>
        
        <nav class="sidebar-nav">
          ${menuItems}
        </nav>
      </aside>

      <!-- ÁREA DIREITA (Cabeçalho + Conteúdo) -->
      <div style="flex-grow: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden;">
        
        <!-- CABEÇALHO SUPERIOR DIREITO -->
        <header style="display: flex; justify-content: flex-end; align-items: center; padding: 1rem 2rem; background-color: #fff; border-bottom: 1px solid rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size: 0.95rem; font-weight: 500; color: var(--navy);">${u.name}</span>
            <div class="avatar" style="width:36px; height:36px; font-size:0.9rem;">${initials(u.name)}</div>
            <button class="btn-ghost" id="logout" style="margin-left: 1rem; color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.3); padding: 0.4rem 1rem;">Sair</button>
          </div>
        </header>

        <!-- ÁREA DE CONTEÚDO -->
        <main class="main-content" style="flex-grow: 1; padding: 2rem; overflow-y: auto; background-color: #f4f7f6;">
          ${content}
        </main>

      </div>
    </div>`;
}

function bindHeader() {
  // Configuração do botão de SAIR
  const btnLogout = document.getElementById("logout");
  if (btnLogout) {
    btnLogout.onclick = () => { 
      const wasStudent = getUser()?.role === "student";
      setUser(null); 
      navigate(wasStudent ? "#/login-aluno" : "#/login-admin"); 
    };
  }

  // Lógica do botão de ENCOLHER a barra lateral
  const toggleBtn = document.getElementById("toggle-sidebar");
  const sidebar = document.getElementById("main-sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.onclick = () => {
      sidebar.classList.toggle("collapsed");
      const isNowCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("sidebar_collapsed", isNowCollapsed);
    };
  }
}

function initials(name) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

// -------- FUNÇÃO PARA MOSTRAR/OCULTAR SENHA (COM PNG) --------
window.togglePwd = function(inputId, btn) {
  const input = document.getElementById(inputId);
  const img = btn.querySelector("img"); 
  
  if (input.type === "password") {
    input.type = "text";
    // Coloque EXATAMENTE o nome e a extensão do seu arquivo aqui:
    img.src = "img/olho-aberto.png"; 
  } else {
    input.type = "password";
    // Coloque EXATAMENTE o nome do seu arquivo do olho aberto aqui:
    img.src = "img/olho-fechado.png"; 
  }
};