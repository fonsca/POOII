// -------- Planner do aluno visto pelo mentor --------
async function renderStudent(mentor, studentId, week = "") {
  const route = location.hash;
  renderLoading(mentor);
  try {
    const query = week ? `?semana=${week}` : "";
    const { student, planner, semanaAtual } = await api(`/students/${studentId}${query}`);
    if (location.hash !== route) return; // o usuário já foi para outra tela

    renderPage(mentor, `
      <a href="#/admin" class="btn btn-link px-0 mb-3">← Voltar para alunos</a>
      <div class="card shadow-sm mb-4">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
          ${avatarHtml(student, 56)}
          <div class="flex-grow-1 min-w-0">
            <h1 class="h4 text-navy mb-1">${escapeHtml(student.name)}</h1>
            <div class="small text-body-secondary text-truncate">
              ${escapeHtml(student.email)}${student.phone ? ` · ${escapeHtml(student.phone)}` : ""}
            </div>
          </div>
          <div class="d-flex gap-2">
            <a href="#/admin/aluno/perfil/${student.id}" class="btn btn-outline-secondary btn-sm">👤 Perfil</a>
            <a href="#/admin/aluno/editar/${student.id}" class="btn btn-navy btn-sm">✏️ Editar</a>
          </div>
        </div>
      </div>
      ${weekNavHtml(semanaAtual)}
      <div class="alert alert-info small py-2">
        ℹ️ Clique num <strong>espaço vazio</strong> para adicionar um bloco e num <strong>bloco</strong> para editá-lo.
      </div>
      ${buildProgressBar(planner)}
      ${buildPlannerGrid(planner, { isMentor: true, weekStart: semanaAtual })}
    `);

    const reload = () => renderStudent(mentor, studentId, semanaAtual);
    bindWeekNav(semanaAtual, (newWeek) => renderStudent(mentor, studentId, newWeek));

    root.querySelector(".planner-grid").addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const task = planner.find(p => String(p.id) === target.dataset.id);
      if (target.dataset.action === "edit" && !task) return;

      showPlannerModal({
        mode: target.dataset.action,
        task,
        day: target.dataset.day,
        time: target.dataset.time,
        weekStart: semanaAtual,
        onSave: async (payload) => {
          if (task) await api(`/planner/${task.id}`, { method: "PUT", body: JSON.stringify(payload) });
          else await api("/planner", { method: "POST", body: JSON.stringify({ ...payload, userId: studentId }) });
          reload();
        },
        onDelete: async () => {
          await api(`/planner/${task.id}`, { method: "DELETE" });
          reload();
        },
      });
    });
  } catch (err) {
    if (location.hash === route) renderError(mentor, err);
  }
}

// 👉 FUNÇÃO DO BOTÃO DE MUDAR DE SEMANA (VISÃO MENTOR)
window.navegarSemanaMentor = (studentId, dataAtual, dias) => {
    const novaSemana = calcularNovaSemana(dataAtual, dias);
    const mentor = window.usuarioAtual;
    if (mentor) {
        renderStudent(mentor, studentId, novaSemana);
    }
};