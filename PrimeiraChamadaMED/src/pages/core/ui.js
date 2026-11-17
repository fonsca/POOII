// -------- Utilidades de interface usadas por todas as telas --------

const root = document.getElementById("app");

function navigate(hash) {
  location.hash = hash;
}

/** Escapa texto antes de colocá-lo no HTML. Todo dado vindo do usuário passa por aqui (evita XSS). */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initials(name) {
  if (!name) return "??";
  return name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

/** Foto da pessoa ou, se não houver, um círculo com as iniciais. */
function avatarHtml(person, size = 40) {
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size / 2.6)}px`;
  if (person?.foto) {
    return `<img src="${escapeHtml(person.foto)}" alt="" class="avatar rounded-circle object-fit-cover" style="${style}" />`;
  }
  return `<span class="avatar rounded-circle" style="${style}" aria-hidden="true">${escapeHtml(initials(person?.name))}</span>`;
}

/** "2026-11-16" → "16/11/2026" */
function formatDateBR(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// -------- Layout: menu lateral no computador, barra recolhível no celular --------

const NAV_ITEMS = {
  student: [
    { href: "#/aluno", icon: "📅", label: "Meu Planner" },
    { href: "#/noticias", icon: "📰", label: "Mural de Avisos" },
    { href: "#/perfil", icon: "👤", label: "Meu Perfil" },
  ],
  mentor: [
    { href: "#/admin", icon: "👥", label: "Meus Alunos" },
    { href: "#/noticias", icon: "📰", label: "Mural de Avisos" },
  ],
};

function navLinksHtml(user) {
  return NAV_ITEMS[user.role === "student" ? "student" : "mentor"].map(item => {
    const active = location.hash.startsWith(item.href);
    return `
      <a class="nav-link ${active ? "active" : ""}" href="${item.href}" title="${item.label}" ${active ? 'aria-current="page"' : ""}>
        <span aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span>
      </a>`;
  }).join("");
}

function layoutHtml(user, content) {
  const isStudent = user.role === "student";
  const homeHref = isStudent ? "#/aluno" : "#/admin";
  const collapsed = localStorage.getItem("sidebar_collapsed") === "true" ? "collapsed" : "";
  const links = navLinksHtml(user);
  const brand = `
    <img src="img/lg.png" alt="" width="36" height="36" />
    <span class="brand-text lh-sm">
      <span class="d-block fw-bold">Primeira Chamada <span class="text-gold">MED</span></span>
      <small class="opacity-75">${isStudent ? "Área do Aluno" : "Painel do Mentor"}</small>
    </span>`;

  return `
    <div class="d-flex min-vh-100">
      <aside class="sidebar d-none d-lg-flex flex-column ${collapsed}" id="main-sidebar">
        <div class="sidebar-header d-flex align-items-center justify-content-between gap-2 mb-4">
          <a href="${homeHref}" class="d-flex align-items-center gap-2 text-white text-decoration-none">${brand}</a>
          <button type="button" class="btn btn-sm btn-outline-light" id="toggle-sidebar" aria-label="Recolher ou expandir o menu">☰</button>
        </div>
        <nav class="nav nav-pills flex-column gap-1">${links}</nav>
      </aside>

      <div class="flex-grow-1 d-flex flex-column min-w-0">
        <nav class="navbar navbar-dark bg-navy d-lg-none">
          <div class="container-fluid">
            <a href="${homeHref}" class="navbar-brand d-flex align-items-center gap-2">${brand}</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mobile-menu"
                    aria-controls="mobile-menu" aria-expanded="false" aria-label="Abrir menu">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mobile-menu">
              <div class="navbar-nav pt-2">${links}</div>
            </div>
          </div>
        </nav>

        <header class="d-flex align-items-center justify-content-end gap-3 px-3 px-md-4 py-2 bg-white border-bottom">
          <span class="fw-semibold text-truncate">${escapeHtml(user.name)}</span>
          ${avatarHtml(user, 36)}
          <button type="button" class="btn btn-outline-danger btn-sm" id="logout">Sair</button>
        </header>

        <main class="flex-grow-1 p-3 p-md-4">${content}</main>
      </div>
    </div>`;
}

function bindLayout() {
  document.getElementById("logout")?.addEventListener("click", () => {
    const wasStudent = getUser()?.role === "student";
    setUser(null);
    navigate(wasStudent ? "#/login-aluno" : "#/login-admin");
  });

  // Recolhe/expande o menu lateral e lembra a escolha
  const sidebar = document.getElementById("main-sidebar");
  document.getElementById("toggle-sidebar")?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    localStorage.setItem("sidebar_collapsed", sidebar.classList.contains("collapsed"));
  });
}

function renderPage(user, content) {
  root.innerHTML = layoutHtml(user, content);
  bindLayout();
}

function renderLoading(user) {
  renderPage(user, `
    <div class="d-flex justify-content-center py-5">
      <div class="spinner-border text-navy" role="status"><span class="visually-hidden">Carregando...</span></div>
    </div>`);
}

function renderError(user, err) {
  renderPage(user, `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`);
}

// -------- Formulários --------

/** Mostra os erros devolvidos pela API embaixo de cada campo (padrão de validação do Bootstrap). */
function showFormErrors(form, err) {
  clearFormErrors(form);
  const fields = err.fields ?? {};
  const general = [];

  for (const [name, messages] of Object.entries(fields)) {
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!input) {
      general.push(...messages);
      continue;
    }
    input.classList.add("is-invalid");
    const feedback = document.createElement("div");
    feedback.className = "invalid-feedback d-block";
    feedback.dataset.serverError = "";
    feedback.textContent = messages.join(" ");
    (input.closest("[data-field]") ?? input.parentElement).append(feedback);
  }

  // Erro que não pertence a um campo (ex.: e-mail já cadastrado, senha incorreta)
  const message = general.join(" ") || (Object.keys(fields).length ? "" : err.message);
  const alertBox = form.querySelector("[data-form-alert]");
  if (message && alertBox) {
    alertBox.textContent = message;
    alertBox.classList.remove("d-none");
  } else if (message) {
    alert(message);
  }

  // O erro some assim que o campo é corrigido
  form.oninput = (event) => {
    event.target.classList.remove("is-invalid");
    event.target.closest("[data-field]")?.querySelector("[data-server-error]")?.remove();
  };

  form.querySelector(".is-invalid")?.focus();
}

function clearFormErrors(form) {
  form.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
  form.querySelectorAll("[data-server-error]").forEach(el => el.remove());
  form.querySelector("[data-form-alert]")?.classList.add("d-none");
}

/** Desabilita o botão e mostra um spinner enquanto a requisição está em andamento. */
function setBusy(button, busy, busyText = "Salvando...") {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${busyText}`;
  } else if (button.dataset.label) {
    button.innerHTML = button.dataset.label;
  }
  button.disabled = busy;
}

/** Campo de senha com botão de mostrar/ocultar. */
function passwordInputHtml({ id, name, placeholder = "", autocomplete = "current-password" }) {
  return `
    <div class="input-group">
      <input type="password" class="form-control" id="${id}" name="${name}" placeholder="${placeholder}" autocomplete="${autocomplete}" />
      <button type="button" class="btn btn-outline-secondary" data-toggle-password aria-label="Mostrar senha">
        <img src="img/olho-aberto.png" alt="" width="20" height="20" />
      </button>
    </div>`;
}

function bindPasswordToggles(container) {
  container.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
      const input = button.closest(".input-group").querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.querySelector("img").src = show ? "img/olho-fechado.png" : "img/olho-aberto.png";
      button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    });
  });
}

/** Máscara de telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX. */
function applyPhoneMask(input) {
  let value = input.value.replace(/\D/g, "").slice(0, 11);
  if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  else if (value.length > 0) value = value.replace(/^(\d*)/, "($1");
  input.value = value;
}