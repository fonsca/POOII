// -------- HOME DO ALUNO (vê o próprio planner) --------
async function renderStudentHome(user) {
  try {
    const data = await api(`/students/${user.id}`); 
    
    function paint() {
      const student = data.student || user;
      const planner = data.planner || [];

      if (!planner.length && !data.student) {
        root.innerHTML = layoutHtml(user, `<div class="empty">Seu monitor ainda não vinculou um plano de estudos.</div>`);
        bindHeader();
        return;
      }
      
      const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row">
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">Aqui está o seu cronograma da semana.</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div class="info-bar" style="background:#e6f2ff; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:10px;">
            <span>ℹ️ O cronograma é definido pelo seu monitor. <strong>Clique em qualquer bloco</strong> para marcá-lo como concluído.</span>
          </div>
          ${buildPlannerGrid(planner, false)}
        </section>
      `;

      root.innerHTML = layoutHtml(user, pageContent);
      bindHeader();
      
      // Aluno clicando no bloco abre o Popup para ver detalhes
      root.querySelectorAll('[data-action="view"]').forEach(b => {
        b.onclick = () => {
          const task = planner.find(p => p.id === Number(b.dataset.id));
          
          showPlannerModal({
            mode: 'view',
            task: task,
            // O que acontece quando o aluno clica no botão do popup
            onToggle: async (t) => {
              t.done = !t.done; 
              await api(`/planner/${t.id}`, { method: "PUT", body: JSON.stringify(t) });
              paint(); // Re-desenha a grade para mostrar/tirar o risco
            }
          });
        };
      });
    }

    paint();

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar o planner: ${err.message}</div>`);
    bindHeader();
  }
}
