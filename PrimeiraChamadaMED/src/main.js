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
  
  const textBody = await res.text();
  return textBody ? JSON.parse(textBody) : {};
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
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; 
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const dayNamesFull = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dayNamesShort = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  const daysInfo = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    daysInfo.push({
      full: dayNamesFull[i],
      short: dayNamesShort[i],
      num: String(currentDate.getDate()).padStart(2, '0'),
      isToday: currentDate.toDateString() === today.toDateString()
    });
  }

  const timeSlots = ["08:00", "09:00", "10:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  let html = `<div class="planner-grid"><table class="planner-table">
    <thead>
      <tr>
        <th style="width:66px"></th>
        ${daysInfo.map(d => `
          <th class="day-header ${d.isToday ? 'today' : ''}">
            <span style="display: block; margin-bottom: 2px;">${d.short}</span>
            <span class="day-num">${d.num}</span>
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>`;

  timeSlots.forEach(time => {
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
      if (!task) {
        html += `<td class="planner-cell ${isMentor ? 'empty-cell' : ''}" 
                     ${isMentor ? `data-action="create" data-day="${d.full}" data-time="${time}"` : ''}>
                 </td>`;
      } else {
        const sub = SUBJECTS[task.subject] || { class: "rev" };
        const nextHour = String(Number(time.split(":")[0]) + 1).padStart(2, '0') + ":00";
        const doneClass = task.done ? 'opacity: 0.4; filter: grayscale(100%); text-decoration: line-through;' : '';
        html += `
          <td class="planner-cell">
            <div class="planner-block ${sub.class} ${task.done ? 'is-done' : ''}" 
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


// -------- BARRA DE PROGRESSO --------
function buildProgressBar(planner) {
  // Filtra os "fantasmas" (ignora testes antigos que não têm horário válido definido)
  const validBlocks = planner.filter(p => p.time && p.time.trim() !== "");

  // Se não houver blocos válidos na semana, a barra nem aparece
  if (!validBlocks || validBlocks.length === 0) return ''; 

  const total = validBlocks.length;
  const completed = validBlocks.filter(p => p.done).length;
  
  // Regra de três simples para a porcentagem
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return `
    <div style="margin-bottom: 1.5rem; background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div style="font-weight: 800; color: var(--navy); font-size: 1.2rem;">📊 Progresso da Semana</div>
        <div style="font-weight: 700; color: #475569; font-size: 0.95rem; background: #f1f5f9; padding: 4px 12px; border-radius: 20px;">
          ${completed} de ${total} blocos concluídos
        </div>
      </div>
      
      <!-- O Container da Barra (Fundo Azul) -->
      <div style="background-color: #3b82f6; height: 28px; width: 100%; border-radius: 14px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); position: relative;">
        
        <!-- O Preenchimento da Barra (Amarelo Vibrante com animação) -->
        <div style="background-color: #fbbf24; height: 100%; width: ${percentage}%; border-radius: 14px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 2px 0 5px rgba(0,0,0,0.1);"></div>
        
        <!-- A Porcentagem centralizada -->
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem; color: #ffffff; text-shadow: 1px 1px 3px rgba(0,0,0,0.6); pointer-events: none;">
          ${percentage}%
        </div>
      </div>
    </div>
  `;
}


// -------- ROTEADOR --------
function render() {
  const hash = location.hash || "#/login-admin"; 
  const user = getUser();
  
  if (!user && !hash.startsWith("#/login")) return navigate("#/login-admin");

  if (hash === "#/login-aluno") return renderLogin("student");
  if (hash.startsWith("#/login")) return renderLogin("mentor");

  if (hash === "#/noticias") return renderNews(user);
  if (hash === "#/perfil") return renderProfile(user, user.id);
  
  if (hash.startsWith("#/admin/aluno/perfil/")) {
    const id = Number(hash.split("/").pop());
    return renderProfile(user, id);
  }

  // ---- 4. ROTAS EXCLUSIVAS DO MENTOR ----
  if (user && user.role === "mentor") {
    if (hash.startsWith("#/admin/novo-aluno")) return renderNewStudent(user);
    
    // 👉 1º LUGAR: Rota ESPECÍFICA de Editar!
    if (hash.startsWith("#/admin/aluno/editar/")) {
      const id = Number(hash.split("/").pop());
      return renderEditStudent(user, id);
    }

    // 👉 2º LUGAR: Rota GENÉRICA do Planner do Aluno!
    if (hash.startsWith("#/admin/aluno/")) {
      const id = Number(hash.split("/").pop());
      return renderStudent(user, id);
    }

    return renderAdmin(user); // Tela inicial do Mentor
  }

  // ---- 5. ROTA DO ALUNO ----
  if (user && user.role === "student") {
    return renderStudentHome(user);
  }
}

// -------- TELA DE EDITAR CADASTRO DO ALUNO --------
async function renderEditStudent(mentor, studentId) {
  try {
    // 1. Busca os dados atuais do aluno para preencher o formulário
    const data = await api(`/students/${studentId}`);
    const student = data.student || data;

    const pageContent = `
      <section style="max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 8px 14px; width: fit-content; gap: 6px;">
          <h2 style="margin: 0; color: var(--navy);">✏️ Editar Aluno</h2>
        </div>

        <form id="edit-student-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: var(--navy);">Nome Completo</label>
            <input type="text" id="edit-name" value="${student.name}" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 1rem;" />
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: var(--navy);">E-mail</label>
            <input type="email" id="edit-email" value="${student.email}" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 1rem;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: var(--navy);">Curso Alvo</label>
              <input type="text" id="edit-course" value="${student.course}" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 1rem;" />
            </div>
            
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; color: var(--navy);">Telefone (WhatsApp)</label>
              <input type="text" id="edit-phone" value="${student.phone || ''}" placeholder="(XX) XXXXX-XXXX" oninput="applyPhoneMask(this)" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 1rem;" />
            </div>
          </div>

          <div style="margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end;">
            <button type="submit" class="btn" style="background: #10b981; font-size: 1rem; padding: 10px 24px;">Salvar Alterações</button>
            <button class="btn-cancel" onclick="navigate('#/admin/aluno/${studentId}')">Cancelar</button>
          </div>

        </form>
      </section>
    `;

    root.innerHTML = layoutHtml(mentor, pageContent);
    bindHeader();

    // 2. Lógica para salvar as alterações
    document.getElementById('edit-student-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Salvando...";

      const payload = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        course: document.getElementById('edit-course').value,
        phone: document.getElementById('edit-phone').value
      };

      try {
        await api(`/students/${studentId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        
        // Se deu certo, volta pra tela do aluno!
        navigate(`#/admin/aluno/${studentId}`);
      } catch (err) {
        alert("Erro ao editar aluno: " + err.message);
        btn.disabled = false;
        btn.textContent = "💾 Salvar Alterações";
      }
    };

  } catch (err) {
    root.innerHTML = layoutHtml(mentor, `<div class="empty">Erro: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- TELA DE PORTAL DE NOTÍCIAS --------
async function renderNews(user) {
  try {
    const isAdmin = user.role !== "student";
    let newsData = await api("/news");
    
    // Variável para controlar se estamos editando alguma notícia
    let editingNewsId = null; 

    const today = new Date();
    today.setHours(0,0,0,0);

    const processedNews = newsData.map(n => {
      const deadlineDate = new Date(n.deadline + "T00:00:00");
      const diffTime = deadlineDate - today;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...n, daysLeft };
    });

    processedNews.sort((a, b) => {
      if (a.daysLeft < 0 && b.daysLeft >= 0) return 1;
      if (b.daysLeft < 0 && a.daysLeft >= 0) return -1;
      return a.daysLeft - b.daysLeft;
    });

    function paint() {
      let pageContent = `
        <section class="section" style="margin-bottom: 2rem;">
          <div class="row">
            <div>
              <h2 style="margin:0">Mural de Avisos</h2>
              <div class="muted">Fique por dentro das datas de vestibulares e comunicados oficiais.</div>
            </div>
          </div>
        </section>
      `;

      if (isAdmin) {
        pageContent += `
          <section class="section" style="margin-bottom: 2rem; background: #f8fafc; border: 1px dashed #cbd5e0;" id="form-section">
            <h3 id="form-title" style="margin-bottom: 1rem; color: var(--navy); font-size: 1.1rem;">Publicar Nova Aviso</h3>
            <form id="news-form" class="grid-form">
              <div class="field"><label>Instituição</label><input name="institution" placeholder="Ex: FUVEST" required /></div>
              <div class="field"><label>Data Limite (Inscrição)</label><input name="deadline" type="date" required /></div>
              <div class="field"><label>Cor de Fundo</label><input name="color" type="color" value="#3b82f6" style="height: 40px; padding: 2px;" required /></div>
              <div class="field"><label>Ícone (Emoji)</label><input name="icon" value="📝" required /></div>
              <div class="field" style="grid-column: 1 / -1;"><label>Título Principal</label><input name="title" placeholder="Ex: FUVEST 2026 ABRE INSCRIÇÕES EM ABRIL" required /></div>
              <div class="field" style="grid-column: 1 / -1;"><label>Texto Explicativo</label><textarea name="description" rows="3" required></textarea></div>
              <div style="grid-column: 1 / -1; display: flex; gap: 10px;">
                <button type="submit" id="submit-btn" class="btn" style="max-width: 200px;">Publicar Aviso</button>
                <button type="button" id="cancel-edit-btn" class="btn-ghost" style="display: none; color: #64748b;">Cancelar Edição</button>
              </div>
            </form>
          </section>
        `;
      }

      pageContent += `<div class="news-grid">`;
      if (processedNews.length === 0) pageContent += `<div class="empty" style="grid-column: 1/-1;">Nenhuma notícia publicada no momento.</div>`;

      processedNews.forEach((n, index) => {
        const isFeatured = index === 0 && n.daysLeft >= 0;
        const isExpired = n.daysLeft < 0;
        
        let deadlineText = `Inscrições: ${n.deadline.split("-").reverse().join("/")}`;
        let badgeClass = "";
        
        if (isExpired) {
          deadlineText = "Prazo Encerrado";
          badgeClass = "danger";
        } else if (n.daysLeft <= 15) {
          deadlineText = `Faltam ${n.daysLeft} dias!`;
          badgeClass = "danger";
        }

        pageContent += `
          <div class="news-card ${isFeatured ? 'featured' : ''}" ${isExpired ? 'style="opacity: 0.6; filter: grayscale(1);"' : ''}>
            <div class="news-header" style="background-color: ${n.color};">
              <span class="news-icon">${n.icon}</span>
            </div>
            <div class="news-body">
              <div class="news-meta">
                <span class="inst">${n.institution}</span>
                ${isFeatured ? '<span class="badge highlight">🔥 Destaque</span>' : ''}
              </div>
              <h3 class="news-title">${n.title}</h3>
              <p class="news-desc">${n.description}</p>
              
              <div class="news-footer">
                <span class="badge deadline ${badgeClass}">${deadlineText}</span>
                ${isAdmin ? `
                  <div style="display: flex; gap: 8px;">
                    <button class="btn edit-news-btn" data-id="${n.id}" style="padding: 4px 10px; font-size: 0.75rem; background: var(--primary);">✏️ Editar</button>
                    <button class="btn-danger delete-news-btn" data-id="${n.id}" style="padding: 4px 10px; font-size: 0.75rem;">🗑️ Excluir</button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });

      pageContent += `</div>`;
      
      root.innerHTML = layoutHtml(user, pageContent);
      bindHeader();

      if (isAdmin) {
        const form = document.getElementById("news-form");
        const formTitle = document.getElementById("form-title");
        const submitBtn = document.getElementById("submit-btn");
        const cancelBtn = document.getElementById("cancel-edit-btn");

        // Lógica de SALVAR (Criar ou Atualizar)
        form.onsubmit = async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        const corOriginal = btn.style.backgroundColor;

        // 2. Muda para o estado de carregamento
        btn.disabled = true;
        btn.innerHTML = "⏳ Salvando...";
        btn.style.opacity = "0.8";

        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd);
        
        try {
          // 3. Envia para a API (Criar ou Editar)
          if (editingNewsId) {
            await api(`/news/${editingNewsId}`, { method: "PUT", body: JSON.stringify(payload) });
          } else {
            await api("/news", { method: "POST", body: JSON.stringify(payload) });
          }
          
          // Verde, aviso salvo, e depois de 3 seg recarrega a lista para mostrar a novidade
          btn.style.backgroundColor = "#10b981";
          btn.style.opacity = "1";
          btn.innerHTML = "✅ Aviso salvo!";
          
          setTimeout(() => {
            renderNews(user); 
          }, 2000);

        } catch (err) {
          // Se a API der erro, fica vermelho, avisa e volta ao normal depois de 3 seg
          btn.disabled = false;
          btn.innerHTML = "❌ Erro ao salvar";
          btn.style.backgroundColor = "#ef4444"; 
          
          setTimeout(() => {
            btn.innerHTML = textoOriginal;
            btn.style.backgroundColor = corOriginal;
          }, 3000);
          
          alert("Não foi possível salvar o aviso: " + err.message);
        }
      };

        // Lógica de EDITAR (Preenche o formulário)
        document.querySelectorAll(".edit-news-btn").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.id);
            const newsItem = processedNews.find(n => n.id === id);
            
            if(newsItem) {
              form.elements["institution"].value = newsItem.institution;
              form.elements["deadline"].value = newsItem.deadline;
              form.elements["color"].value = newsItem.color;
              form.elements["icon"].value = newsItem.icon;
              form.elements["title"].value = newsItem.title;
              form.elements["description"].value = newsItem.description;
              
              editingNewsId = id;
              
              // Muda o visual do formulário para o "Modo Edição"
              formTitle.textContent = `Editando: ${newsItem.institution}`;
              formTitle.style.color = "#d97706";
              submitBtn.textContent = "Salvar Alterações";
              submitBtn.style.backgroundColor = "#d97706";
              cancelBtn.style.display = "inline-block";
              
              // 👇 A MÁGICA DA ROLAGEM AQUI 👇
              // Pega a área direita da tela e rola até o topo (top: 0) de forma suave
              const mainScrollArea = document.querySelector('.main-content');
              if (mainScrollArea) {
                mainScrollArea.scrollTo({ top: 0, behavior: "smooth" });
              }
            }
          };
        });

        // Lógica de CANCELAR a edição
        cancelBtn.onclick = () => {
          editingNewsId = null;
          form.reset();
          formTitle.textContent = "Publicar nova Notícia";
          formTitle.style.color = "var(--navy)";
          submitBtn.textContent = "Publicar Notícia";
          submitBtn.style.backgroundColor = "var(--primary)";
          cancelBtn.style.display = "none";
        };

        // Lógica de EXCLUIR
        document.querySelectorAll(".delete-news-btn").forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm("Tem certeza que deseja apagar esta notícia?")) {
              await api(`/news/${btn.dataset.id}`, { method: "DELETE" });
              renderNews(user);
            }
          };
        });
      }
    }

    paint();
  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar avisos: ${err.message}</div>`);
    bindHeader();
  }
}


// -------- HELPERS --------
function layoutHtml(u, content) {
  const isStudent = u.role === "student";
  const subtitle = isStudent ? "Área do Aluno" : "Painel do Mentor";
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  const collapsedClass = isCollapsed ? "collapsed" : "";
  const menuItems = isStudent 
    ? `<a href="#/aluno" title="Meu Planner"><span style="font-size: 1.25rem">📅</span> <span class="hide-on-collapse">Meu Planner</span></a>
       <a href="#/noticias" title="Mural de Avisos"><span style="font-size: 1.25rem">📰</span> <span class="hide-on-collapse">Mural de Avisos</span></a><a href="#/perfil">👤 Meu Perfil</a>`
    : `<a href="#/admin" title="Meus Alunos"><span style="font-size: 1.25rem">👥</span> <span class="hide-on-collapse">Meus Alunos</span></a>
       <a href="#/noticias" title="Mural de Avisos"><span style="font-size: 1.25rem">📰</span> <span class="hide-on-collapse">Mural de Avisos</span></a>`;

  const avatarHtml = u.foto 
    ? `<img src="${u.foto}" class="avatar" style="width:36px; height:36px; object-fit: cover; border-radius: 50%;" />`
    : `<div class="avatar" style="width:36px; height:36px;">${initials(u.name)}</div>`;     

  return `
    <div class="app-layout">
      <aside class="sidebar" id="main-sidebar">
        <div class="sidebar-top">
          <div class="sidebar-brand">
            <img src="img/lg.png" style="width: 40px;" />
            <div>
              <div style="font-weight: bold;">Primeira Chamada <span style="color:var(--gold)">MED</span></div>
              <div style="font-size: 0.75rem;">${subtitle}</div>
            </div>
          </div>
        </div>
        <nav class="sidebar-nav">${menuItems}</nav>
      </aside>
      <div style="flex-grow: 1; display: flex; flex-direction: column; height: 100vh;">
        <header style="display: flex; justify-content: flex-end; align-items: center; padding: 1rem; background-color: #fff; border-bottom: 1px solid rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-weight: 500;">${u.name}</span>
            
            ${avatarHtml}
            
            <button class="btn-ghost" id="logout" style="color: #dc3545;">Sair</button>
          </div>
        </header>
        <main class="main-content" style="flex-grow: 1; padding: 2rem; overflow-y: auto; background-color: #f4f7f6;">
          ${content}
        </main>
      </div>
    </div>`;
}

function bindHeader() {
  const btnLogout = document.getElementById("logout");
  if (btnLogout) {
    btnLogout.onclick = () => { 
      const wasStudent = getUser()?.role === "student";
      setUser(null); 
      navigate(wasStudent ? "#/login-aluno" : "#/login-admin"); 
    };
  }

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
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(); 
}

window.togglePwd = function(inputId, btn) {
  const input = document.getElementById(inputId);
  const img = btn.querySelector("img"); 
  if (input.type === "password") {
    input.type = "text";
    img.src = "img/olho-aberto.png"; 
  } else {
    input.type = "password";
    img.src = "img/olho-fechado.png"; 
  }
};

// Função para formatar o telefone automaticamente (XX) XXXXX-XXXX
function applyPhoneMask(input) {
  // Remove tudo que NÃO for número
  let v = input.value.replace(/\D/g, ''); 
  
  // Limita a 11 números no máximo (DDD + 9 dígitos)
  if (v.length > 11) v = v.substring(0, 11); 

  if (v.length > 10) {
    // Formato Celular: (XX) XXXXX-XXXX
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 6) {
    // Formato Fixo/Digitando: (XX) XXXX-XXXX
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    // Apenas DDD e primeiros números: (XX) XXXX
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (v.length > 0) {
    // Apenas DDD: (XX
    v = v.replace(/^(\d*)/, '($1');
  }

  // Atualiza o valor na tela
  input.value = v;
}


// -------- TELA INICIAL DO MENTOR (DASHBOARD GERAL) --------
async function renderAdmin(user) {
  try {
    // 1. Busca a lista de alunos atrelados a este mentor
    const students = await api(`/students?mentorId=${user.id}`);
    
    // 2. Busca o planner de cada aluno para calcular o progresso
    const studentsWithProgress = await Promise.all(students.map(async (student) => {
      const data = await api(`/students/${student.id}`);
      const planner = data.planner || [];
      
      // Mesma lógica de ignorar os blocos fantasmas
      const validBlocks = planner.filter(p => p.time && p.time.trim() !== "");
      const total = validBlocks.length;
      const completed = validBlocks.filter(p => p.done).length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      // Devolve o aluno com as estatísticas embutidas
      return { ...student, total, completed, percentage };
    }));

    // 3. Monta o visual do Dashboard
    let html = `
      <section style="margin-bottom: 2rem;">
          <h2 style="margin: 0; color: var(--navy);">Visão Geral dos Alunos</h2>
          <div style="color: #64748b; margin-top: 4px; margin-bottom: 1rem;">
            Acompanhe o engajamento da sua turma nesta semana.
          </div>
          
          <button class="btn btn-sm" onclick="navigate('#/admin/novo-aluno')" style="background-color: var(--navy); display: flex; align-items: center; gap: 6px; width: fit-content; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <span>➕ Novo Aluno</span> 
          </button>
        </section>
    `;

    if (studentsWithProgress.length === 0) {
      html += `<div class="empty" style="text-align: center; padding: 3rem;">Você ainda não tem alunos cadastrados. Clique no botão acima para começar!</div>`;
    } else {
      // Cria um Grid responsivo para os cards dos alunos
      html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">`;
      
      studentsWithProgress.forEach(s => {
        // Semáforo de cores para a barra (Verde, Amarelo ou Vermelho)
        let barColor = "#fbbf24"; // Amarelo padrão
        if (s.total === 0) barColor = "#cbd5e0"; // Cinza se não tiver blocos
        else if (s.percentage === 100) barColor = "#10b981"; // Verde (Tudo concluído!)
        else if (s.percentage <= 30) barColor = "#ef4444"; // Vermelho (Alerta de atraso!)

        html += `
          <div style="background: white; border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;" 
               onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.1)'; this.style.borderColor='#cbd5e0';" 
               onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05)'; this.style.borderColor='var(--border)';"
               onclick="navigate('#/admin/aluno/${s.id}')"
               title="Clique para abrir o Planner de ${s.name}">
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="avatar" style="width: 48px; height: 48px; font-size: 1.2rem; background-color: var(--gold);">${initials(s.name)}</div>
                <div>
                  <h3 style="margin: 0; font-size: 1.1rem; color: var(--navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${s.name}</h3>
                  <span style="font-size: 0.75rem; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 12px; font-weight: 600;">${s.course}</span>
                </div>
              </div>
              <div style="font-size: 1.5rem; opacity: 0.3;">📋</div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px; color: #475569; font-weight: 700;">
                <span>Progresso Semanal</span>
                <span style="color: ${barColor};">${s.completed} / ${s.total}</span>
              </div>
              
              <!-- Mini Barra de Progresso -->
              <div style="background-color: #e2e8f0; height: 12px; width: 100%; border-radius: 6px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
                <div style="background-color: ${barColor}; height: 100%; width: ${s.percentage}%; border-radius: 6px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
              </div>
            </div>

          </div>
        `;
      });
      
      html += `</div>`;
    }

    root.innerHTML = layoutHtml(user, html);
    bindHeader();

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar o dashboard: ${err.message}</div>`);
    bindHeader();
  }
}

// -------- TELA DE PERFIL (SOMENTE UPLOAD DE FOTO) --------
async function renderProfile(currentUser, targetUserId) {
  try {
    const isOwner = currentUser.id === targetUserId;
    const data = await api(`/students/${targetUserId}`);
    const { student } = data;
    const planner = data.planner || [];

    // --- CÁLCULO DE HORAS DE ESTUDO NA SEMANA (Mantido!) ---
    const hoursPerDay = { "Segunda": 0, "Terça": 0, "Quarta": 0, "Quinta": 0, "Sexta": 0, "Sábado": 0, "Domingo": 0 };
    let totalCompletedBlocks = 0;
    planner.forEach(task => {
      if (task.done) {
        totalCompletedBlocks++;
        if (hoursPerDay[task.day] !== undefined) hoursPerDay[task.day] += task.hours;
      }
    });
    const dayNamesShort = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const dayNamesFull = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    const maxHoursInADay = Math.max(...Object.values(hoursPerDay), 1);
    
    let chartHtml = '';
    const diaSemanaSistema = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const hojeNome = diaSemanaSistema[new Date().getDay()];
    dayNamesFull.forEach((day, index) => {
      const hours = hoursPerDay[day];
      const heightPercent = hours === 0 ? 0 : Math.max(20, (hours / maxHoursInADay) * 100); 
      const barHeightStyle = hours === 0 ? 'height: 12px; border-radius: 20px;' : `height: ${heightPercent}%;`;
      
      const eHoje = day === hojeNome;

      chartHtml += `
        <div class="hour-bar-wrapper" style="${eHoje ? 'transform: scale(1.1); transition: 0.3s;' : ''}">
          <div class="hour-bar-bg" style="height: 100px; ${eHoje ? 'border: 2px solid #3b82f6; background: #eff6ff;' : ''}">
            <div class="hour-bar-fill" style="${barHeightStyle} ${hours < 0.5 && eHoje ? 'background: #fbbf24;' : ''}"></div>
          </div>
          <div style="font-size: 0.8rem; font-weight: bold; color: ${eHoje ? '#3b82f6' : 'var(--navy)'}; margin-top: 4px;">
            ${dayNamesShort[index]} ${eHoje ? '⭐' : ''}
          </div>
          <div style="font-size: 0.75rem; color: #64748b; font-weight: bold;">${hours}h</div>
        </div>
      `;
    });

    // --- LAYOUT DA TELA ---
    const avatarHtml = student.foto 
      ? `<img src="${student.foto}" id="profile-picture-img" class="profile-avatar-large" style="object-fit:cover;" />` 
      : `<div id="profile-picture-div" class="profile-avatar-large">${initials(student.name)}</div>`;

    const pageContent = `
      ${!isOwner ? `<a href="#/admin/aluno/${targetUserId}" style="display:inline-block; margin-bottom:1rem; color:var(--navy); font-weight:bold; text-decoration:none;">← Voltar ao Planner</a>` : ''}
      
      <div class="profile-header-card">
        ${avatarHtml}
        <div style="flex-grow: 1;">
          <h1 style="margin: 0; font-size: 2rem; text-transform: uppercase;">${student.name}</h1>
          <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 10px;">${student.email}</div>
          <div class="profile-tags">
            <span class="tag-yellow">${student.course}</span>
          </div>
        </div>
        
        ${isOwner ? `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <label for="profile-photo-input" class="btn" style="background: #3b82f6; cursor: pointer; text-align:center; padding: 10px 20px;">
              📸 Alterar Foto
            </label>
            <input type="file" id="profile-photo-input" accept="image/png, image/jpeg, image/webp" style="display: none;" />
          </div>
        ` : ''}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${student.streak || 0} DIAS</div>
          <div class="stat-label">Streak Atual</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📖</div>
          <div class="stat-value">${totalCompletedBlocks}</div>
          <div class="stat-label">Blocos Concluídos da Semana</div>
        </div>
      </div>
      <div class="hours-card">
        <h3 style="margin: 0; color: var(--navy); font-size: 1.2rem; text-transform: uppercase;">Horas de Estudo (Semana)</h3>
        <div class="hours-chart">${chartHtml}</div>
      </div>
    `;

    root.innerHTML = layoutHtml(currentUser, pageContent);
    bindHeader();

    // --- LÓGICA DE UPLOAD DE FOTO (Mantida!) ---
    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput) {
      photoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert("Imagem muito grande (máx 2MB)."); return; }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64String = reader.result;
          
          // Feedback visual rápido
          const imgEl = document.getElementById('profile-picture-img');
          const divEl = document.getElementById('profile-picture-div');
          if (imgEl) imgEl.src = base64String;
          else if (divEl) divEl.outerHTML = `<img src="${base64String}" id="profile-picture-img" class="profile-avatar-large" style="object-fit:cover;" />`;

          try {
            // 👉 Enviamos a foto NOVA, mas mantemos o nome ATUAL (student.name)
            await api(`/students/${targetUserId}/profile`, {
              method: 'PUT',
              body: JSON.stringify({ name: student.name, foto: base64String }) 
            });
            
            // Atualiza a foto na memória local para o cabeçalho global mudar
            if (isOwner) {
                currentUser.foto = base64String;
                setUser(currentUser, !!localStorage.getItem("user"));
            }
            renderProfile(currentUser, targetUserId); // Recarrega para garantir
          } catch (err) {
            alert("Erro ao salvar foto: " + err.message);
            renderProfile(currentUser, targetUserId); // Restaura em caso de erro
          }
        };
      };
    }
    
    // 👉 ALTERAÇÃO AQUI: Removemos toda a lógica do 'btn-edit-profile' que ficava aqui no final.

  } catch (err) {
    root.innerHTML = layoutHtml(currentUser, `<div class="empty">Erro: ${err.message}</div>`);
    bindHeader();
  }
}