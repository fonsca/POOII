// -------- POPUP DO PLANNER --------
function showPlannerModal(params) {
  const { mode, task, day, time, onSave, onDelete, onToggle } = params;
  
  // Cria o fundo escuro do modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Textos e variáveis com base no Modo (create, edit, view)
  const isMentor = mode === 'create' || mode === 'edit';
  const modalTitle = mode === 'create' ? 'NOVO BLOCO DE ESTUDO' : (mode === 'edit' ? 'EDITAR BLOCO' : 'DETALHES DO ESTUDO');
  const dayText = task ? task.day : day;
  const timeText = task ? task.time : time;

  // 👇 CONTEÚDO PARA O ALUNO (Com o Botão Verde)
  const studentView = task ? `
    <div style="background: rgba(229,231,235,0.4); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin: 0; color: var(--navy); font-size: 1.1rem;">${task.topic}</h4>
      <p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #475569; white-space: pre-wrap;">${task.subtopics || 'Sem detalhes adicionais.'}</p>
    </div>
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
      <button id="modal-toggle-btn" class="btn" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; color: white; background-color: ${task.done ? '#64748b' : '#10b981'}; transition: background-color 0.2s;">
        ${task.done ? '↩️ Desmarcar Conclusão' : '✅ Marcar como Concluído'}
      </button>
    </div>
  ` : '';

  // CONTEÚDO PARA O MENTOR (Formulário de criação/edição)
  const mentorForm = `
    <form id="modal-form">
      <div class="field">
        <label>Disciplina</label>
        <select name="subject" required>
          <option value="bio" ${task?.subject === 'bio' ? 'selected' : ''}>Biologia</option>
          <option value="mat" ${task?.subject === 'mat' ? 'selected' : ''}>Matemática</option>
          <option value="fis" ${task?.subject === 'fis' ? 'selected' : ''}>Física</option>
          <option value="qui" ${task?.subject === 'qui' ? 'selected' : ''}>Química</option>
          <option value="port" ${task?.subject === 'port' ? 'selected' : ''}>Português</option>
          <option value="hist" ${task?.subject === 'hist' ? 'selected' : ''}>História</option>
          <option value="geo" ${task?.subject === 'geo' ? 'selected' : ''}>Geografia</option>
          <option value="rev" ${task?.subject === 'rev' ? 'selected' : ''}>Revisão</option>
        </select>
      </div>
      <div class="field">
        <label>Tópico Principal</label>
        <input name="topic" placeholder="Ex: Citologia" value="${task?.topic || ''}" required />
      </div>
      <div class="field">
        <label>Subtópicos / Instruções do Mentor</label>
        <textarea name="subtopics" rows="3" placeholder="Quais os detalhes desse estudo? (Ex: Fazer exercícios da página 40)" required style="width:100%; padding:8px; border-radius:6px; border:1px solid #cbd5e0; font-family:inherit;">${task?.subtopics || ''}</textarea>
      </div>
      
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button type="submit" class="btn" style="flex:1;">Salvar Bloco</button>
        ${mode === 'edit' ? `<button type="button" class="btn-ghost" id="modal-delete-btn" style="color:#ef4444; border-color:#ef4444;">Excluir</button>` : ''}
      </div>
    </form>
  `;

  // Monta o HTML final do Popup
  overlay.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="modal-close-btn">✕</button>
      <div class="modal-title">${modalTitle}</div>
      <div class="modal-subtitle">📅 ${dayText} • 🕒 ${timeText}</div>
      ${isMentor ? mentorForm : studentView}
    </div>
  `;

  document.body.appendChild(overlay);

  // Fecha o modal se clicar no "X" ou fora dele
  const closeModal = () => document.body.removeChild(overlay);
  overlay.querySelector('#modal-close-btn').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // Lógica dos Botões baseada no Modo
  if (isMentor) {
    overlay.querySelector('#modal-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      
      submitBtn.textContent = "Salvando...";
      submitBtn.disabled = true;

      try {
        await onSave(Object.fromEntries(fd), dayText, timeText, task?.id);
        closeModal();
      } catch (err) {
        alert("Erro ao salvar no banco de dados: " + err.message);
        submitBtn.textContent = "Salvar Bloco";
        submitBtn.disabled = false;
      }
    };

    if (mode === 'edit') {
      overlay.querySelector('#modal-delete-btn').onclick = async (e) => {
        if (confirm("Tem certeza que deseja apagar este bloco?")) { 
          const btn = e.target;
          btn.textContent = "Apagando...";
          try {
            await onDelete(task.id); 
            closeModal();
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
            btn.textContent = "Excluir";
          }
        }
      };
    }
  } else {
    // 👇 A LÓGICA DO BOTÃO DO ALUNO
    const toggleBtn = overlay.querySelector('#modal-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = async () => { 
        toggleBtn.disabled = true; 
        toggleBtn.textContent = "Atualizando...";
        try {
          await onToggle(task); // Salva no Banco e Recarrega a Tela
          closeModal(); 
        } catch(err) {
          alert("Erro ao atualizar status: " + err.message);
          toggleBtn.disabled = false;
          toggleBtn.textContent = task.done ? '↩️ Desmarcar Conclusão' : '✅ Marcar como Concluído';
        }
      };
    }
  }
}