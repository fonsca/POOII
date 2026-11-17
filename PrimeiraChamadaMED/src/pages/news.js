// -------- Mural de avisos: todos leem; o mentor publica, edita e exclui --------
async function renderNews(user) {
  const route = location.hash;
  renderLoading(user);
  try {
    const isMentor = user.role !== "student";
    const news = withDeadlineInfo(await api("/news"));
    if (location.hash !== route) return;

    renderPage(user, `
      <div class="mb-4">
        <h1 class="h3 text-navy mb-1">Mural de avisos</h1>
        <p class="text-body-secondary mb-0">Datas de vestibulares e comunicados oficiais.</p>
      </div>
      ${isMentor ? newsFormHtml() : ""}
      ${news.length
        ? `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
             ${news.map((item, i) => newsCardHtml(item, i === 0 && item.daysLeft >= 0, isMentor)).join("")}
           </div>`
        : `<div class="alert alert-info">Nenhum aviso publicado no momento.</div>`}
    `);

    if (isMentor) bindNewsActions(user, news);
  } catch (err) {
    if (location.hash === route) renderError(user, err);
  }
}

/** Calcula os dias até o prazo e ordena: prazos mais próximos primeiro, encerrados no fim. */
function withDeadlineInfo(news) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return news
    .map(item => ({ ...item, daysLeft: Math.ceil((parseIsoDate(item.deadline) - today) / 86_400_000) }))
    .sort((a, b) => (a.daysLeft < 0) - (b.daysLeft < 0) || a.daysLeft - b.daysLeft);
}

function newsCardHtml(item, featured, isMentor) {
  const expired = item.daysLeft < 0;
  const urgent = !expired && item.daysLeft <= 15;
  let deadlineText = `Inscrições até ${formatDateBR(item.deadline)}`;
  if (expired) deadlineText = "Prazo encerrado";
  else if (item.daysLeft === 0) deadlineText = "Último dia!";
  else if (urgent) deadlineText = `Faltam ${item.daysLeft} dia${item.daysLeft === 1 ? "" : "s"}!`;

  return `
    <div class="col">
      <article class="card h-100 shadow-sm news-card ${featured ? "border-warning border-2" : ""} ${expired ? "is-expired" : ""}">
        <div class="news-header" style="background-color: ${escapeHtml(item.color)}">
          <span aria-hidden="true">${escapeHtml(item.icon)}</span>
        </div>
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center gap-2 mb-2 small fw-bold">
            <span class="text-primary text-uppercase">${escapeHtml(item.institution)}</span>
            ${featured ? `<span class="badge text-bg-warning">🔥 Destaque</span>` : ""}
          </div>
          <h2 class="news-title">${escapeHtml(item.title)}</h2>
          <p class="small text-body-secondary text-pre-wrap flex-grow-1">${escapeHtml(item.description)}</p>
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 border-top pt-3">
            <span class="badge ${expired || urgent ? "text-bg-danger" : "text-bg-info"}">${deadlineText}</span>
            ${isMentor ? `
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" data-edit-news="${item.id}">✏️ Editar</button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-delete-news="${item.id}">🗑️ Excluir</button>
              </div>` : ""}
          </div>
        </div>
      </article>
    </div>`;
}

function newsFormHtml() {
  return `
    <div class="card shadow-sm mb-4" id="news-form-card">
      <div class="card-body">
        <h2 class="h5 text-navy mb-3" id="news-form-title">Publicar novo aviso</h2>
        <form id="news-form" class="row g-3" novalidate>
          <div class="col-12"><div class="alert alert-danger d-none mb-0" data-form-alert></div></div>
          <div class="col-md-6 col-lg-3" data-field>
            <label class="form-label" for="nf-institution">Instituição</label>
            <input class="form-control" id="nf-institution" name="institution" maxlength="60" placeholder="Ex.: FUVEST" />
          </div>
          <div class="col-md-6 col-lg-3" data-field>
            <label class="form-label" for="nf-deadline">Data limite (inscrição)</label>
            <input type="date" class="form-control" id="nf-deadline" name="deadline" />
          </div>
          <div class="col-6 col-lg-3" data-field>
            <label class="form-label" for="nf-color">Cor de fundo</label>
            <input type="color" class="form-control form-control-color w-100" id="nf-color" name="color" value="#3b82f6" />
          </div>
          <div class="col-6 col-lg-3" data-field>
            <label class="form-label" for="nf-icon">Ícone (emoji)</label>
            <input class="form-control" id="nf-icon" name="icon" maxlength="16" value="📝" />
          </div>
          <div class="col-12" data-field>
            <label class="form-label" for="nf-title">Título</label>
            <input class="form-control" id="nf-title" name="title" maxlength="150" placeholder="Ex.: FUVEST abre inscrições em abril" />
          </div>
          <div class="col-12" data-field>
            <label class="form-label" for="nf-description">Texto do aviso</label>
            <textarea class="form-control" id="nf-description" name="description" rows="3" maxlength="1000"></textarea>
          </div>
          <div class="col-12 d-flex gap-2">
            <button type="submit" class="btn btn-navy" id="news-submit">Publicar aviso</button>
            <button type="button" class="btn btn-outline-secondary d-none" id="news-cancel">Cancelar edição</button>
          </div>
        </form>
      </div>
    </div>`;
}

function bindNewsActions(user, news) {
  const form = document.getElementById("news-form");
  const title = document.getElementById("news-form-title");
  const submit = document.getElementById("news-submit");
  const cancel = document.getElementById("news-cancel");
  let editingId = null;

  // Alterna o formulário entre "publicar" e "editar"
  const setEditing = (item) => {
    editingId = item?.id ?? null;
    form.reset();
    clearFormErrors(form);
    if (item) {
      ["institution", "deadline", "color", "icon", "title", "description"]
        .forEach(key => { form.elements[key].value = item[key]; });
    }
    title.textContent = item ? `Editando: ${item.institution}` : "Publicar novo aviso";
    submit.textContent = item ? "Salvar alterações" : "Publicar aviso";
    cancel.classList.toggle("d-none", !item);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = JSON.stringify(Object.fromEntries(new FormData(form)));
    clearFormErrors(form);
    setBusy(submit, true);
    try {
      if (editingId) await api(`/news/${editingId}`, { method: "PUT", body });
      else await api("/news", { method: "POST", body });
      renderNews(user);
    } catch (err) {
      showFormErrors(form, err);
      setBusy(submit, false);
    }
  });

  cancel.addEventListener("click", () => setEditing(null));

  root.querySelectorAll("[data-edit-news]").forEach(button => {
    button.addEventListener("click", () => {
      setEditing(news.find(item => String(item.id) === button.dataset.editNews));
      document.getElementById("news-form-card").scrollIntoView({ behavior: "smooth" });
    });
  });

  root.querySelectorAll("[data-delete-news]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja apagar este aviso?")) return;
      setBusy(button, true, "Excluindo...");
      try {
        await api(`/news/${button.dataset.deleteNews}`, { method: "DELETE" });
        renderNews(user);
      } catch (err) {
        alert(err.message);
        setBusy(button, false);
      }
    });
  });
}