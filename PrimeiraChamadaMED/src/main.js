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
  // Se não tem nada na URL, o padrão é o login do mentor
  const hash = location.hash || "#/login-admin"; 
  const user = getUser();
  
  // Se não está logado e tentou acessar rota restrita, joga pro login
  if (!user && !hash.startsWith("#/login")) return navigate("#/login-admin");

  // ---- TELAS DE LOGIN ----
  if (hash === "#/login-aluno") return renderLogin("student");
  if (hash.startsWith("#/login")) return renderLogin("mentor");

  // ---- ROTAS COMPARTILHADAS (Mentor e Aluno acessam) ----
  if (hash === "#/noticias") return renderNews(user);

  // ---- ÁREA DO ALUNO ----
  // Se ele é aluno e não clicou em notícias, joga para o Planner
  if (user.role === "student") return renderStudentHome(user);

  // ---- ÁREA DO MENTOR ----
  if (hash.startsWith("#/admin/novo-aluno")) return renderNewStudent(user);
  if (hash.startsWith("#/admin/aluno/")) {
    const id = Number(hash.split("/").pop());
    return renderStudent(user, id);
  }
  
  return renderAdmin(user);
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
              <h2 style="margin:0">Mural de Avisos e Oportunidades</h2>
              <div class="muted">Fique por dentro das datas de vestibulares e comunicados oficiais.</div>
            </div>
          </div>
        </section>
      `;

      if (isAdmin) {
        pageContent += `
          <section class="section" style="margin-bottom: 2rem; background: #f8fafc; border: 1px dashed #cbd5e0;" id="form-section">
            <h3 id="form-title" style="margin-bottom: 1rem; color: var(--navy); font-size: 1.1rem;">Publicar nova Notícia</h3>
            <form id="news-form" class="grid-form">
              <div class="field"><label>Instituição</label><input name="institution" placeholder="Ex: FUVEST" required /></div>
              <div class="field"><label>Data Limite (Inscrição)</label><input name="deadline" type="date" required /></div>
              <div class="field"><label>Cor de Fundo</label><input name="color" type="color" value="#3b82f6" style="height: 40px; padding: 2px;" required /></div>
              <div class="field"><label>Ícone (Emoji)</label><input name="icon" value="📝" required /></div>
              <div class="field" style="grid-column: 1 / -1;"><label>Título Principal</label><input name="title" placeholder="Ex: FUVEST 2026 ABRE INSCRIÇÕES EM ABRIL" required /></div>
              <div class="field" style="grid-column: 1 / -1;"><label>Texto Explicativo</label><textarea name="description" rows="3" required></textarea></div>
              <div style="grid-column: 1 / -1; display: flex; gap: 10px;">
                <button type="submit" id="submit-btn" class="btn" style="max-width: 200px;">Publicar Notícia</button>
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
                <span class="date">${n.publish_date}</span>
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
          const fd = new FormData(e.target);
          const payload = Object.fromEntries(fd);
          
          if (editingNewsId) {
            await api(`/news/${editingNewsId}`, { method: "PUT", body: JSON.stringify(payload) });
          } else {
            await api("/news", { method: "POST", body: JSON.stringify(payload) });
          }
          renderNews(user); // Recarrega a tela
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
       <a href="#/noticias" title="Mural de Avisos"><span style="font-size: 1.25rem">📰</span> <span class="hide-on-collapse">Mural de Avisos</span></a>`
    : `<a href="#/admin" title="Meus Alunos"><span style="font-size: 1.25rem">👥</span> <span class="hide-on-collapse">Meus Alunos</span></a>
       <a href="#/noticias" title="Mural de Avisos"><span style="font-size: 1.25rem">📰</span> <span class="hide-on-collapse">Postar Avisos</span></a>`;

  return `
    <div class="app-layout">
      <aside class="sidebar ${collapsedClass}" id="main-sidebar">
        <div class="sidebar-top">
          <div class="sidebar-brand" title="Primeira Chamada MED">
            <img src="img/lg.png" alt="Logo" style="width: 40px; height: 40px; object-fit: contain;" />
            <div class="hide-on-collapse">
              <div style="font-weight: bold; font-size: 1rem;">Primeira Chamada <span style="color:var(--gold)">MED</span></div>
              <div style="font-size: 0.75rem; opacity: 0.7;">${subtitle}</div>
            </div>
          </div>
          <button class="toggle-btn" id="toggle-sidebar" title="Recolher/Expandir menu">☰</button>
        </div>
        <nav class="sidebar-nav">
          ${menuItems}
        </nav>
      </aside>
      <div style="flex-grow: 1; display: flex; flex-direction: column; height: 100vh; min-width: 0;">
        <header style="display: flex; justify-content: flex-end; align-items: center; padding: 1rem 2rem; background-color: #fff; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0;">
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size: 0.95rem; font-weight: 500; color: var(--navy);">${u.name}</span>
            <div class="avatar" style="width:36px; height:36px; font-size:0.9rem;">${initials(u.name)}</div>
            <button class="btn-ghost" id="logout" style="margin-left: 1rem; color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.3); padding: 0.4rem 1rem;">Sair</button>
          </div>
        </header>
        <main class="main-content" style="flex-grow: 1; padding: 2rem; overflow-y: auto; overflow-x: hidden; background-color: #f4f7f6;">
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
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; color: var(--navy); font-size: 1.5rem;">Visão Geral dos Alunos</h2>
            <div style="color: #64748b; margin-top: 5px;">Acompanhe o engajamento da sua turma nesta semana.</div>
          </div>
          <button class="btn" onclick="navigate('#/admin/novo-aluno')">➕ Novo Aluno</button>
        </div>
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
