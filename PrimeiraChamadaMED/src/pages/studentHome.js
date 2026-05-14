// -------- TELA DO ALUNO (Versão Limpa + PDF Compacto) --------
async function renderStudentHome(user) {
  try {
    // Busca os dados direto do servidor (sem aquela lógica de offline)
// Dentro da sua função renderStudentHome(user)...
    const data = await api(`/students/${user.id}`);
    const student = data.student || data; // Pega os dados frescos do aluno
    const planner = data.planner || [];

    // 👉 Atualiza a memória se o aluno trocou a foto em outro lugar
    if (student.foto && student.foto !== user.foto) {
       user.foto = student.foto;
       setUser(user, !!localStorage.getItem("user"));
    }

    // 👉 LÓGICA DA FOTO NO PLANNER
    const avatarHtml = user.foto 
      ? `<img src="${user.foto}" class="avatar" style="width:54px; height:54px; object-fit: cover; border-radius: 50%;" />`
      : `<div class="avatar" style="width:54px; height:54px; font-size:1.1rem">${initials(user.name)}</div>`;

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