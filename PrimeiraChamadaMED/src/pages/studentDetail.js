// -------- TELA DO MENTOR DENTRO DO ALUNO, VENDO O PLANNER ETC --------
async function renderStudent(mentor, id, semana = "") {
  // 👉 A MÁGICA: Salva o mentor e a semana para os botões e para o Modal usarem!
  window.usuarioAtual = mentor;
  window.semanaAtivaMentor = semana;

  try {
    // 👉 ATUALIZADO: Busca os dados filtrando pela semana ativa
    const endpoint = semana ? `/students/${id}?semana=${semana}` : `/students/${id}`;
    const data = await api(endpoint);
    const { student } = data;
    let planner = data.planner || [];
    const semanaAtual = data.semanaAtual; // Recebe a semana exata do C#

    const avatarHtml = student.foto 
      ? `<img src="${student.foto}" class="avatar" style="width:54px; height:54px; object-fit: cover; border-radius: 50%;" />`
      : `<div class="avatar" style="width:54px; height:54px; font-size:1.1rem">${initials(student.name)}</div>`;

    const navSemanaHtml = `
      
      <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border); text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <strong style="color: var(--navy); font-size: 1.15rem; display: block; margin-bottom: 12px;">
          📅 ${formatarLabelSemana(semanaAtual)}
        </strong>
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <button class="btn" onclick="navegarSemanaMentor(${id}, '${semanaAtual}', -7)" style="flex: 1; background: transparent; color: var(--navy); border: 1px solid #cbd5e0; padding: 8px; font-size: 0.95rem; cursor: pointer; border-radius: 6px;">
            ⬅️ Anterior
          </button>
          <button class="btn" onclick="navegarSemanaMentor(${id}, '${semanaAtual}', 7)" style="flex: 1; background: transparent; color: var(--navy); border: 1px solid #cbd5e0; padding: 8px; font-size: 0.95rem; cursor: pointer; border-radius: 6px;">
            Próxima ➡️
          </button>
        </div>
      </div>
    `;

    const pageContent = `
      <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
      <section class="section" style="margin-bottom:1.5rem">
        <div style="display:flex;gap:1rem;align-items:center">
          ${avatarHtml}
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
      
      ${navSemanaHtml}
      
      <section>
        <div class="info-bar" style="background:#e6f2ff; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:10px;">
          <span>ℹ️ Clique em um <strong>espaço vazio</strong> para adicionar uma tarefa. Clique em um <strong>bloco</strong> para editá-lo.</span>
        </div>
        ${buildProgressBar(planner)}
        ${buildPlannerGrid(planner, true, semanaAtual)}
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
        
        // Acha a tarefa correta baseada no ID clicado
        const task = action === 'edit' ? planner.find(p => String(p.id) === String(target.dataset.id)) : null;

        showPlannerModal({
          mode: action,
          day: target.dataset.day || (task ? task.day : ''),
          time: target.dataset.time || (task ? task.time : ''),
          task: task,
          onSave: async (formData, mDay, mTime) => {
            try {
              // 👉 BLINDAGEM ATUALIZADA: Permite que você apague os textos se quiser
              // 👉 BLINDAGEM CORRIGIDA: Agora enviamos a semana exata para o C#
              const payload = { 
                subject: formData.subject !== undefined ? formData.subject : (task ? task.subject : ''),
                topic: formData.topic !== undefined ? formData.topic : (task ? task.topic : ''),
                subtopics: formData.subtopics !== undefined ? formData.subtopics : (task ? task.subtopics : ''), 
                day: mDay || (task ? task.day : ''), 
                time: mTime || (task ? task.time : ''), 
                done: task ? task.done : false, 
                hours: 1, 
                userId: id,
                data_semana: formData.data_semana || (task ? task.data_semana : window.semanaAtivaMentor)
              };

              if (action === 'create') {
                await api(`/planner`, { method: "POST", body: JSON.stringify(payload) });
              } else {
                await api(`/planner/${task.id}`, { method: "PUT", body: JSON.stringify(payload) });
              }
              
              renderStudent(mentor, id, semanaAtual);
            } catch (err) {
              alert("Erro ao salvar: " + err.message);
            }
          },
          onDelete: async () => {
            try {
              await api(`/planner/${task.id}`, { method: "DELETE" });
              renderStudent(mentor, id, semanaAtual);
            } catch (err) {
              alert("Erro ao excluir: " + err.message);
            }
          }
        });
      };
    }
  } catch (err) {
    root.innerHTML = layoutHtml(mentor, `<div class="empty">Erro ao carregar o aluno: ${err.message}</div>`);
    bindHeader();
    console.error(err);
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