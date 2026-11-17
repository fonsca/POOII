// -------- Painel do mentor: alunos e progresso da semana --------
async function renderAdmin(mentor) {
  const route = location.hash;
  renderLoading(mentor);
  try {
    const students = await api(`/students?mentorId=${mentor.id}`);
    const details = await Promise.all(students.map(s => api(`/students/${s.id}`)));
    if (location.hash !== route) return; // o usuário já foi para outra tela

    renderPage(mentor, `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 text-navy mb-1">Visão geral dos alunos</h1>
          <p class="text-body-secondary mb-0">Acompanhe o engajamento da turma nesta semana.</p>
        </div>
        <a href="#/admin/novo-aluno" class="btn btn-navy">➕ Novo aluno</a>
      </div>
      ${details.length
        ? `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">${details.map(studentCardHtml).join("")}</div>`
        : `<div class="alert alert-info">Você ainda não tem alunos cadastrados. Clique em <strong>Novo aluno</strong> para começar.</div>`}
    `);

    root.querySelectorAll("[data-delete-student]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm(`Remover ${button.dataset.name}? Os blocos de estudo também serão apagados.`)) return;
        setBusy(button, true, "Removendo...");
        try {
          await api(`/students/${button.dataset.deleteStudent}`, { method: "DELETE" });
          renderAdmin(mentor);
        } catch (err) {
          alert(err.message);
          setBusy(button, false);
        }
      });
    });
  } catch (err) {
    if (location.hash === route) renderError(mentor, err);
  }
}

function studentCardHtml({ student, planner }) {
  const blocks = planner.filter(p => p.time);
  const done = blocks.filter(p => p.done).length;
  const percent = blocks.length ? Math.round((done / blocks.length) * 100) : 0;
  const color = !blocks.length ? "bg-secondary"
    : percent === 100 ? "bg-success"
    : percent <= 30 ? "bg-danger"
    : "bg-warning";

  return `
    <div class="col">
      <article class="card h-100 shadow-sm student-card">
        <div class="card-body">
          <div class="d-flex align-items-center gap-3 mb-3">
            ${avatarHtml(student, 48)}
            <div class="min-w-0">
              <h2 class="h6 fw-bold text-navy mb-1 text-truncate">${escapeHtml(student.name)}</h2>
              <span class="badge text-bg-light">${escapeHtml(student.course)}</span>
            </div>
          </div>
          <div class="d-flex justify-content-between small fw-semibold text-body-secondary mb-1">
            <span>Progresso semanal</span><span>${done} / ${blocks.length}</span>
          </div>
          <div class="progress" style="height: .75rem" role="progressbar" aria-label="Progresso semanal"
               aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar ${color}" style="width: ${percent}%"></div>
          </div>
        </div>
        <div class="card-footer bg-transparent d-flex gap-2">
          <a href="#/admin/aluno/${student.id}" class="btn btn-navy btn-sm flex-grow-1">Ver planner →</a>
          <button type="button" class="btn btn-outline-danger btn-sm"
                  data-delete-student="${student.id}" data-name="${escapeHtml(student.name)}">Excluir</button>
        </div>
      </article>
    </div>`;
}