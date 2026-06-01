// -------- TELA DO ALUNO (Versão Limpa + PDF Compacto + Histórico) --------
async function renderStudentHome(user, semana = "") {
  window.usuarioAtual = user;
  try {
    // 👉 ATUALIZADO: Agora enviamos a semana que queremos ver para a API
    const endpoint = semana ? `/students/${user.id}?semana=${semana}` : `/students/${user.id}`;
    const data = await api(endpoint);
    
    const student = data.student || data; 
    const planner = data.planner || [];
    const semanaAtual = data.semanaAtual; // O C# nos devolve a data base (ex: "2026-06-01")

    if (student.foto && student.foto !== user.foto) {
       user.foto = student.foto;
       setUser(user, !!localStorage.getItem("user"));
    }

    const avatarHtml = user.foto 
      ? `<img src="${user.foto}" class="avatar" style="width:54px; height:54px; object-fit: cover; border-radius: 50%;" />`
      : `<div class="avatar" style="width:54px; height:54px; font-size:1.1rem">${initials(user.name)}</div>`;

    // Layout em coluna
    const navSemanaHtml = `
      <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border); text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        
        <strong style="color: var(--navy); font-size: 1.15rem; display: block; margin-bottom: 12px;">
          📅 ${formatarLabelSemana(semanaAtual)}
        </strong>
        
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <button class="btn" onclick="navegarSemanaAluno('${semanaAtual}', -7)" style="flex: 1; background: transparent; color: var(--navy); border: 1px solid #cbd5e0; padding: 8px; font-size: 0.95rem; cursor: pointer; border-radius: 6px;">
            ⬅️ Anterior
          </button>
          <button class="btn" onclick="navegarSemanaAluno('${semanaAtual}', 7)" style="flex: 1; background: transparent; color: var(--navy); border: 1px solid #cbd5e0; padding: 8px; font-size: 0.95rem; cursor: pointer; border-radius: 6px;">
            Próxima ➡️
          </button>
        </div>
        
      </div>
    `;

    const pageContent = `
        <section class="section" style="margin-bottom:1.5rem">
          <div class="row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            
            <div style="display:flex;gap:1rem;align-items:center">
              ${avatarHtml}
              <div>
                <h2 style="margin:0">Olá, ${user.name.split(' ')[0]}!</h2>
                <div class="muted">Aqui está o seu cronograma da semana.</div>
              </div>
            </div>
            
            <button class="btn" onclick="window.print()" style="background-color: var(--navy); padding: 8px 14px; font-size: 0.85rem; width: fit-content; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.1rem;">🖨️</span> PDF
            </button>
          </div>
        </section>
        
        ${navSemanaHtml}
        ${buildProgressBar(planner)}
        ${buildPlannerGrid(planner, false)}
    `;

    root.innerHTML = layoutHtml(user, pageContent);
    bindHeader();

    // Lógica para clicar e abrir o popup de conclusão + Mostrar o tempo
    document.querySelectorAll('.planner-block').forEach(el => {
      const taskId = Number(el.dataset.id);
      const task = planner.find(p => p.id === taskId);

      if (task && task.tempo_gasto_segundos > 0) {
        const h = Math.floor(task.tempo_gasto_segundos / 3600);
        const m = Math.floor((task.tempo_gasto_segundos % 3600) / 60);
        const tempoStr = h > 0 ? `${h}h ${m}min` : `${m}min`;

        const timeDiv = document.createElement('div');
        timeDiv.style.fontSize = '0.75rem';
        timeDiv.style.marginTop = '6px';
        timeDiv.style.fontWeight = '600';
        timeDiv.style.color = task.done ? 'rgba(255, 255, 255, 0.85)' : '#475569'; 
        timeDiv.innerHTML = `⏱️ ${tempoStr}`;
        el.appendChild(timeDiv);
      }

      el.onclick = () => {
        showPlannerModal({
          mode: 'view',
          task,
          onToggle: async (t) => {
            await api(`/planner/${t.id}`, { method: "PUT", body: JSON.stringify({ done: !t.done }) });
            renderStudentHome(user, semanaAtual); // Mantém na mesma semana após marcar concluído!
          }
        });
      };
    });

  } catch (err) {
    root.innerHTML = layoutHtml(user, `<div class="empty">Erro ao carregar os dados: ${err.message}</div>`);
    bindHeader();
  }
}