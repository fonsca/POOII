// -------- Planner do aluno --------
async function renderStudentHome(user, week = "") {
  const route = location.hash;
  renderLoading(user);
  try {
    const query = week ? `?semana=${week}` : "";
    const { student, planner, semanaAtual } = await api(`/students/${user.id}${query}`);
    if (location.hash !== route) return;

    // Mantém a foto do cabeçalho igual à do perfil
    if (student.foto !== user.foto) {
      user.foto = student.foto;
      setUser(user);
    }

    renderPage(user, `
      <div class="card shadow-sm mb-4">
        <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex align-items-center gap-3">
            ${avatarHtml(user, 56)}
            <div>
              <h1 class="h4 text-navy mb-1">Olá, ${escapeHtml(user.name.split(" ")[0])}!</h1>
              <p class="text-body-secondary mb-0">Aqui está o seu cronograma da semana.</p>
            </div>
          </div>
          <button type="button" class="btn btn-navy" id="print-planner">🖨️ Salvar em PDF</button>
        </div>
      </div>
      ${weekNavHtml(semanaAtual)}
      ${buildProgressBar(planner)}
      ${buildPlannerGrid(planner, { isMentor: false, weekStart: semanaAtual })}
    `);

    const reload = () => renderStudentHome(user, semanaAtual);
    document.getElementById("print-planner").addEventListener("click", () => window.print());
    bindWeekNav(semanaAtual, (newWeek) => renderStudentHome(user, newWeek));

    root.querySelector(".planner-grid").addEventListener("click", (event) => {
      const target = event.target.closest('[data-action="view"]');
      if (!target) return;
      const task = planner.find(p => String(p.id) === target.dataset.id);
      if (!task) return;

      showPlannerModal({
        mode: "view",
        task,
        onToggle: async (t) => {
          await api(`/planner/${t.id}/status`, { method: "PATCH", body: JSON.stringify({ done: !t.done }) });
          reload();
        },
        onTimeChange: reload,
      });
    });
  } catch (err) {
    if (location.hash === route) renderError(user, err);
  }
}