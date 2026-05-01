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

// Dicionário mapeando a matéria para a classe do CSS e o Nome Oficial
const SUBJECTS = {
  bio: { class: "bio", label: "🧬 Biologia" },
  mat: { class: "mat", label: "📐 Matemática" },
  fis: { class: "fis", label: "⚡ Física" },
  qui: { class: "qui", label: "🧪 Química" },
  port: { class: "port", label: "📝 Português" },
  hist: { class: "hist", label: "🏛️ História" },
  geo: { class: "geo", label: "🌍 Geografia" },
  rev: { class: "rev", label: "🔄 Revisão" }
};

function buildPlannerGrid(planner, isMentor) {
  // 📅 LÓGICA DE DATAS DINÂMICAS
  const today = new Date();
  const dayOfWeek = today.getDay(); // Retorna de 0 (Domingo) a 6 (Sábado)
  
  // Como queremos que a semana comece na Segunda, calculamos a distância até ela
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; 
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const dayNamesFull = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dayNamesShort = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  
  const daysInfo = [];
  
  // Monta os 7 dias da semana a partir da Segunda-feira
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    
    daysInfo.push({
      full: dayNamesFull[i],
      short: dayNamesShort[i],
      num: String(currentDate.getDate()).padStart(2, '0'), // Garante 2 dígitos (ex: "05")
      isToday: currentDate.toDateString() === today.toDateString() // Marca true se for hoje!
    });
  }

  // 🕒 Horários de estudo (Manhã e Tarde)
  const timeSlots = ["08:00", "09:00", "10:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

let html = `<div class="planner-grid"><table class="planner-table">
    <thead>
      <tr>
        <th style="width:66px"></th>
        ${daysInfo.map(d => `
          <!-- O JavaScript coloca a classe 'today' automaticamente no dia atual -->
          <th class="day-header ${d.isToday ? 'today' : ''}">
            <span style="display: block; margin-bottom: 2px;">${d.short}</span>
            <span class="day-num">${d.num}</span>
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>`;

  timeSlots.forEach(time => {
    // Bloco de Almoço
    if (time === "12:00") {
      html += `<tr>
        <td colspan="8" style="text-align:center; padding:10px; font-size:10px; color:var(--muted-fg); font-weight:800; letter-spacing:1px; background:rgba(229,231,235,0.2); border-radius:8px;">
          🍽️ INTERVALO / ALMOÇO (11:00 - 12:00)
        </td>
      </tr>`;
    }

    html += `<tr><td class="time-label">${time}</td>`;
    
    daysInfo.forEach(d => {
      const task = planner.find(p => p.day === d.full && p.time === time);
      
      // Se não tem tarefa e é Mentor, adiciona a classe empty-cell e atributos de clique
      if (!task) {
        html += `<td class="planner-cell ${isMentor ? 'empty-cell' : ''}" 
                     ${isMentor ? `data-action="create" data-day="${d.full}" data-time="${time}"` : ''}>
                 </td>`;
      } else {
        // Se tem tarefa
        const sub = SUBJECTS[task.subject] || { class: "rev" };
        const nextHour = String(Number(time.split(":")[0]) + 1).padStart(2, '0') + ":00";
        const doneClass = task.done ? 'opacity: 0.4; filter: grayscale(100%); text-decoration: line-through;' : '';

        // O bloco HTML atualizado para mostrar a Matéria e o Horário (igual ao print)
        html += `
          <td class="planner-cell">
            <div class="planner-block ${sub.class}" style="${doneClass}" 
                 data-action="${isMentor ? 'edit' : 'view'}" data-id="${task.id}" 
                 title="Tópico: ${task.topic}">
              <span class="planner-block-name">${sub.label}</span>
              <span class="planner-block-time">${time}–${nextHour}</span>
            </div>
          </td>
        `;
      }
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}


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

// -------- TELA DO MENTOR VENDO O ALUNO --------
async function renderStudent(mentor, id) {
  try {
    const data = await api(`/students/${id}`);
    const { student } = data;
    let planner = data.planner || [];

    function paint() {
      const pageContent = `
        <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
        <section class="section" style="margin-bottom:1.5rem">
          <div style="display:flex;gap:1rem;align-items:center">
            <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(student.name)}</div>
            <div>
              <h2 style="margin:0">${student.name}</h2>
              <div class="muted">${student.email}</div>
            </div>
          </div>
        </section>

        <!-- A GRADE (O formulário antigo sumiu, a mágica é direto aqui) -->
        <section>
          <div class="info-bar" style="background:#e6f2ff; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:10px;">
            <span>ℹ️ Clique em um <strong>espaço vazio</strong> para adicionar uma tarefa. Clique em um <strong>bloco</strong> para editá-lo.</span>
          </div>
          ${buildPlannerGrid(planner, true)}
        </section>
      `;

      root.innerHTML = layoutHtml(mentor, pageContent);
      bindHeader();

      // OUVINTES DE CLIQUE NO GRID PARA ABRIR O POPUP
      // OUVINTE DE CLIQUE À PROVA DE FALHAS (Delegação de Evento)
      const gridContainer = root.querySelector('.planner-grid');
      
      if (gridContainer) {
        gridContainer.onclick = (e) => {
          // Busca qual elemento clicado tem o data-action (pode ser o bloco ou a célula vazia)
          const target = e.target.closest('[data-action]');
          
          if (!target) return; // Se clicou em uma linha vazia que não é célula, ignora

          const action = target.dataset.action; // Vai ser 'create' ou 'edit'
          
          // Se for editar, procura a tarefa correspondente no banco
          const task = action === 'edit' ? planner.find(p => p.id === Number(target.dataset.id)) : null;
          
          console.log("Abrindo popup para:", action, task); // Ajuda a ver se funcionou!

          showPlannerModal({
            mode: action,
            day: target.dataset.day,
            time: target.dataset.time,
            task: task,
            // O que acontece ao salvar:
            onSave: async (formData, mDay, mTime, mId) => {
              // Adicionamos hours: 1 aqui para garantir que o backend não recuse a requisição
              const payload = { ...formData, day: mDay, time: mTime, done: false, hours: 1 }; 
              
              if (action === 'create') {
                await api(`/students/${id}/planner`, { method: "POST", body: JSON.stringify(payload) });
              } else {
                await api(`/planner/${mId}`, { method: "PUT", body: JSON.stringify({...task, ...payload}) });
              }
              const fresh = await api(`/students/${id}`);
              planner = fresh.planner; 
              paint();
            },
            // O que acontece ao excluir:
            onDelete: async (delId) => {
              await api(`/planner/${delId}`, { method: "DELETE" });
              planner = planner.filter(p => p.id !== delId); 
              paint();
            }
          });
        };
      }
    }
    paint();
  } catch (err) { console.error(err); }
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

// Função que abre o Popup do Planner
function showPlannerModal(params) {
  const { mode, task, day, time, onSave, onDelete, onToggle } = params;
  
  // Cria o fundo escuro do modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Textos e variáveis com base no Modo (create, edit, view)
  const isMentor = mode === 'create' || mode === 'edit';
  const modalTitle = mode === 'create' ? 'NOVO BLOCO DE ESTUDO' : (mode === 'edit' ? 'EDITAR BLOCO' : 'DETALHES DO ESTUDO');
  const dayText = task ? task.day : day;
  const timeText = task ? task.time : time;

  // CONTEÚDO PARA O ALUNO (Apenas visualiza e conclui)
  const studentView = task ? `
    <div style="background: rgba(229,231,235,0.4); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin: 0; color: var(--navy); font-size: 1.1rem;">${task.topic}</h4>
      <p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #475569; white-space: pre-wrap;">${task.subtopics || 'Sem detalhes adicionais.'}</p>
    </div>
    <button class="btn" id="modal-toggle-btn" style="width: 100%; background: ${task.done ? '#94a3b8' : 'var(--bio)'}; border:none;">
      ${task.done ? 'Desmarcar Conclusão' : '✅ Marcar como Concluído'}
    </button>
  ` : '';

  // CONTEÚDO PARA O MENTOR (Formulário de criação/edição)
  const mentorForm = `
    <form id="modal-form">
      <div class="field">
        <label>Disciplina</label>
        <select name="subject" required>
          <option value="bio" ${task?.subject === 'bio' ? 'selected' : ''}>Biologia</option>
          <option value="mat" ${task?.subject === 'mat' ? 'selected' : ''}>Matemática</option>
          <option value="fis" ${task?.subject === 'fis' ? 'selected' : ''}>Física</option>
          <option value="qui" ${task?.subject === 'qui' ? 'selected' : ''}>Química</option>
          <option value="port" ${task?.subject === 'port' ? 'selected' : ''}>Português</option>
          <option value="hist" ${task?.subject === 'hist' ? 'selected' : ''}>História</option>
          <option value="geo" ${task?.subject === 'geo' ? 'selected' : ''}>Geografia</option>
          <option value="rev" ${task?.subject === 'rev' ? 'selected' : ''}>Revisão</option>
        </select>
      </div>
      <div class="field">
        <label>Tópico Principal</label>
        <input name="topic" placeholder="Ex: Citologia" value="${task?.topic || ''}" required />
      </div>
      <div class="field">
        <label>Subtópicos / Instruções do Mentor</label>
        <textarea name="subtopics" rows="3" placeholder="Quais os detalhes desse estudo? (Ex: Fazer exercícios da página 40)" required style="width:100%; padding:8px; border-radius:6px; border:1px solid #cbd5e0; font-family:inherit;">${task?.subtopics || ''}</textarea>
      </div>
      
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button type="submit" class="btn" style="flex:1;">Salvar Bloco</button>
        ${mode === 'edit' ? `<button type="button" class="btn-ghost" id="modal-delete-btn" style="color:#ef4444; border-color:#ef4444;">Excluir</button>` : ''}
      </div>
    </form>
  `;

  // Monta o HTML final do Popup
  overlay.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="modal-close-btn">✕</button>
      <div class="modal-title">${modalTitle}</div>
      <div class="modal-subtitle">📅 ${dayText} • 🕒 ${timeText}</div>
      ${isMentor ? mentorForm : studentView}
    </div>
  `;

  document.body.appendChild(overlay);

  // Fecha o modal se clicar no "X" ou fora dele
  const closeModal = () => document.body.removeChild(overlay);
  overlay.querySelector('#modal-close-btn').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // Lógica dos Botões baseada no Modo (Com tratamento de Erros!)
  if (isMentor) {
    overlay.querySelector('#modal-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      
      // Muda o texto do botão para dar feedback visual
      submitBtn.textContent = "Salvando...";
      submitBtn.disabled = true;

      try {
        // Agora nós ESPERAMOS o banco de dados responder antes de fechar
        await onSave(Object.fromEntries(fd), dayText, timeText, task?.id);
        closeModal();
      } catch (err) {
        alert("Erro ao salvar no banco de dados: " + err.message);
        submitBtn.textContent = "Salvar Bloco";
        submitBtn.disabled = false;
      }
    };

    if (mode === 'edit') {
      overlay.querySelector('#modal-delete-btn').onclick = async (e) => {
        if (confirm("Tem certeza que deseja apagar este bloco?")) { 
          const btn = e.target;
          btn.textContent = "Apagando...";
          try {
            await onDelete(task.id); 
            closeModal();
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
            btn.textContent = "Excluir";
          }
        }
      };
    }
  } else {
    // Tela do Aluno (Concluir tarefa)
    overlay.querySelector('#modal-toggle-btn').onclick = async (e) => { 
      const btn = e.target;
      btn.textContent = "Atualizando...";
      btn.disabled = true;
      try {
        await onToggle(task); 
        closeModal();
      } catch(err) {
        alert("Erro ao atualizar status: " + err.message);
        btn.disabled = false;
      }
    };
  }
}


// -------- HOME DO ALUNO (vê o próprio planner) --------
async function renderStudentHome(user) {
  try {
    const data = await api(`/students/${user.id}`); 
    
    function paint() {
      const student = data.student || user;
      const planner = data.planner || [];

      if (!planner.length && !data.student) {
        root.innerHTML = layoutHtml(user, `<div class="empty">Seu monitor ainda não vinculou um plano de estudos.</div>`);
        bindHeader();
        return;
      }
      
      const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">Aqui está o seu cronograma da semana.</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div class="info-bar" style="background:#e6f2ff; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:10px;">
            <span>ℹ️ O cronograma é definido pelo seu monitor. <strong>Clique em qualquer bloco</strong> para marcá-lo como concluído.</span>
          </div>
          ${buildPlannerGrid(planner, false)}
        </section>
      `;

      root.innerHTML = layoutHtml(user, pageContent);
      bindHeader();
      
      // Aluno clicando no bloco abre o Popup para ver detalhes
      // (Mantenha o HTML de renderStudentHome como está, apenas mude o foreach abaixo)
      
      // Aluno clicando no bloco abre o Popup para ver detalhes
      root.querySelectorAll('[data-action="view"]').forEach(b => {
        b.onclick = () => {
          const task = planner.find(p => p.id === Number(b.dataset.id));
          
          showPlannerModal({
            mode: 'view',
            task: task,
            // O que acontece quando o aluno clica no botão do popup
            onToggle: async (t) => {
              t.done = !t.done; 
              await api(`/planner/${t.id}`, { method: "PUT", body: JSON.stringify(t) });
              paint(); // Re-desenha a grade para mostrar/tirar o risco
            }
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
      <!-- 👇 A MÁGICA ESTÁ NO min-width: 0 BEM AQUI 👇 -->
      <div style="flex-grow: 1; display: flex; flex-direction: column; height: 100vh; min-width: 0;">
        
        <!-- CABEÇALHO SUPERIOR DIREITO -->
        <header style="display: flex; justify-content: flex-end; align-items: center; padding: 1rem 2rem; background-color: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0;">
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size: 0.95rem; font-weight: 500; color: var(--navy);">${u.name}</span>
            <div class="avatar" style="width:36px; height:36px; font-size:0.9rem;">${initials(u.name)}</div>
            <button class="btn-ghost" id="logout" style="margin-left: 1rem; color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.3); padding: 0.4rem 1rem;">Sair</button>
          </div>
        </header>

        <!-- ÁREA DE CONTEÚDO -->
        <main class="main-content" style="flex-grow: 1; padding: 2rem; overflow-y: auto; overflow-x: hidden; background-color: #f4f7f6;">
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