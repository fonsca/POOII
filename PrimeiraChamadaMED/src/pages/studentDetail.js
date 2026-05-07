// -------- TELA DO MENTOR DENTRO DO ALUNO, VENDO O PLANNER ETC --------
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
              <h2 style="margin-bottom: 3px;">${student.name}</h2>
              <div class="muted">${student.email}</div>
              <div class="muted">${student.phone}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
              <button class="btn btn-sm" onclick="navigate('#/admin/aluno/editar/${student.id}')" style="background-color: #3b82f6; display: flex; align-items: center; gap: 4px; width: fit-content; margin-top: 8px;">
                <span>✏️</span> Editar
              </button>
          </div>
        </section>
        <section>
          <div class="info-bar" style="background:#e6f2ff; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:10px;">
            <span>ℹ️ Clique em um <strong>espaço vazio</strong> para adicionar uma tarefa. Clique em um <strong>bloco</strong> para editá-lo.</span>
          </div>
          ${buildProgressBar(planner)}
          ${buildPlannerGrid(planner, true)}
        </section>
      `;

      root.innerHTML = layoutHtml(mentor, pageContent);
      bindHeader();

      const gridContainer = root.querySelector('.planner-grid');
      if (gridContainer) {
        gridContainer.onclick = (e) => {
          const target = e.target.closest('[data-action]');
          if (!target) return;
          const action = target.dataset.action;
          const task = action === 'edit' ? planner.find(p => p.id === Number(target.dataset.id)) : null;

          showPlannerModal({
            mode: action,
            day: target.dataset.day,
            time: target.dataset.time,
            task: task,
            onSave: async (formData, mDay, mTime, mId) => {
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
  } catch (err) {
    root.innerHTML = layoutHtml(mentor, `<div class="empty">Erro ao carregar o aluno: ${err.message}</div>`);
    bindHeader();
    console.error(err);
  }
}