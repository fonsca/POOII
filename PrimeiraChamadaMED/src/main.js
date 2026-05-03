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


// -------- ROTEADOR --------
function render() {
  const hash = location.hash || "#/login-admin"; 
  const user = getUser();
  
  if (!user && !hash.startsWith("#/login")) return navigate("#/login-admin");

  if (hash === "#/login-aluno") return renderLogin("student");
  if (hash.startsWith("#/login")) return renderLogin("mentor");

  if (user.role === "student") return renderStudentHome(user);

  if (hash.startsWith("#/admin/novo-aluno")) return renderNewStudent(user);
  if (hash.startsWith("#/admin/aluno/")) {
    const id = Number(hash.split("/").pop());
    return renderStudent(user, id);
  }
  
  return renderAdmin(user);
}


// -------- HELPERS --------
function layoutHtml(u, content) {
  const isStudent = u.role === "student";
  const subtitle = isStudent ? "Área do Aluno" : "Painel do Mentor";
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  const collapsedClass = isCollapsed ? "collapsed" : "";
  const menuItems = isStudent 
    ? `<a href="#/aluno" title="Meu Planner"><span style="font-size: 1.25rem">📅</span> <span class="hide-on-collapse">Meu Planner</span></a>`
    : `<a href="#/admin" title="Meus Alunos"><span style="font-size: 1.25rem">👥</span> <span class="hide-on-collapse">Meus Alunos</span></a>`;

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
