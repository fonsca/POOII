// -------- TELA DO ALUNO (Versão Limpa + PDF Compacto) --------
async function renderStudentHome(user) {
  try {
    // Busca os dados direto do servidor (sem aquela lógica de offline)
    const data = await api(`/students/${user.id}`);
    const planner = data.planner || [];

    const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            
            <div style="display:flex;gap:1rem;align-items:center">
              <div class="avatar" style="width:54px;height:54px;font-size:1.1rem">${initials(user.name)}</div>
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">Aqui está o seu cronograma da semana.</div>
              </div>
            </div>
            
            <!-- Botão de Exportar PDF (Agora bem menor e compacto) -->
            <button class="btn" onclick="window.print()" style="background-color: var(--navy); padding: 8px 14px; font-size: 0.85rem; width: fit-content; height: fit-content; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <span style="font-size: 1.1rem;">🖨️</span> PDF
            </button>
            
          </div>
        </section>
        
        ${buildProgressBar(planner)}
        ${buildPlannerGrid(planner, false)}
    `;

    root.innerHTML = layoutHtml(user, pageContent);
    bindHeader();

    // Lógica para clicar e abrir o popup de conclusão
    document.querySelectorAll('.planner-block').forEach(el => {
      el.onclick = () => {
        const taskId = Number(el.dataset.id);
        const task = planner.find(p => p.id === taskId);
        showPlannerModal({
          mode: 'view',
          task,
          onToggle: async (t) => {
            await api(`/planner/${t.id}`, { method: "PUT", body: JSON.stringify({ done: !t.done }) });
            renderStudentHome(user);
          }
        });
      };
    });

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar os dados: ${err.message}</div>`);
    bindHeader();
  }
}