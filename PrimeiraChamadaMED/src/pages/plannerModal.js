// -------- POPUP DO PLANNER --------
// 👉 ADICIONADO 'semanaDaTela' AQUI NOS PARÂMETROS DA FUNÇÃO
function showPlannerModal(params) {
  const { mode, task, day, time, onSave, onDelete, onToggle, semanaDaTela } = params;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const isMentor = mode === 'create' || mode === 'edit';
  const modalTitle = mode === 'create' ? 'NOVO BLOCO DE ESTUDO' : (mode === 'edit' ? 'EDITAR BLOCO' : 'DETALHES DO ESTUDO');
  const dayText = task ? task.day : day;
  const timeText = task ? task.time : time;
  const tempoInicial = task?.tempo_gasto_segundos || 0;

  // 1. Cronômetro atualizado com o botão de ZERAR
  const cronometroHtml = `
  <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; margin: 15px 0; border: 1px solid #e2e8f0;">
    <div style="font-size: 0.85rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Tempo de Foco</div>
    
    <div id="cronometro-display" style="font-size: 2.5rem; font-weight: bold; color: var(--navy); font-variant-numeric: tabular-nums; margin: 10px 0;">
      00:00:00
    </div>
    
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button type="button" id="btn-iniciar-cronometro" class="btn" style="background-color: #10b981; width: 110px;">
        ▶ Iniciar
      </button>
      <button type="button" id="btn-parar-cronometro" class="btn" style="background-color: #ef4444; width: 110px; display: none;">
        ⏹ Parar
      </button>
      <button type="button" id="btn-zerar-cronometro" class="btn" style="background-color: #64748b; width: 110px;">
        🔄 Zerar
      </button>
    </div>
  </div>
  `;

  const studentView = task ? `
    <div style="background: rgba(229,231,235,0.4); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <h4 style="margin: 0; color: var(--navy); font-size: 1.1rem;">${task.topic}</h4>
      <p style="margin: 10px 0 0 0; font-size: 0.85rem; color: #475569; white-space: pre-wrap;">${task.subtopics || 'Sem detalhes adicionais.'}</p>
    </div>
    
    ${cronometroHtml}
    
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
      <button id="modal-toggle-btn" class="btn" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; color: white; background-color: ${task.done ? '#64748b' : '#10b981'}; transition: background-color 0.2s;">
        ${task.done ? '↩️ Desmarcar Conclusão' : '✅ Marcar como Concluído'}
      </button>
    </div>
  ` : '';

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
        ${mode === 'edit' ? `<button type="button" class="btn-cancel" id="modal-delete-btn">Excluir</button>` : ''}
      </div>
    </form>
  `;

  overlay.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="modal-close-btn">✕</button>
      <div class="modal-title">${modalTitle}</div>
      <div class="modal-subtitle">📅 ${dayText} • 🕒 ${timeText}</div>
      ${isMentor ? mentorForm : studentView}
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => document.body.removeChild(overlay);
  overlay.querySelector('#modal-close-btn').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // --- LÓGICA DO CRONÔMETRO BLINDADA CONTRA RECARREGAMENTO ---
  if (!isMentor && task) {
    let timerInterval;
    let segundosAcumulados = tempoInicial;
    
    const display = overlay.querySelector('#cronometro-display');
    const btnIniciar = overlay.querySelector('#btn-iniciar-cronometro');
    const btnParar = overlay.querySelector('#btn-parar-cronometro');
    const btnZerar = overlay.querySelector('#btn-zerar-cronometro');

    if (display && btnIniciar && btnParar && btnZerar) {
      const formatarTempo = (totalSegundos) => {
        const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSegundos % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      };

      display.innerText = formatarTempo(segundosAcumulados);
      if (segundosAcumulados > 0) btnIniciar.innerText = '▶ Continuar';

      // EVENTO: INICIAR
      btnIniciar.onclick = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        btnIniciar.style.display = 'none';
        btnZerar.style.display = 'none'; 
        btnParar.style.display = 'inline-block';
        
        timerInterval = setInterval(() => {
          segundosAcumulados++;
          display.innerText = formatarTempo(segundosAcumulados);
        }, 1000);
      };

      // EVENTO: PARAR
      btnParar.onclick = async (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        clearInterval(timerInterval); 
        btnParar.style.display = 'none';
        btnIniciar.style.display = 'inline-block';
        btnZerar.style.display = 'inline-block'; 
        btnIniciar.innerText = '▶ Continuar'; 

        display.innerText = formatarTempo(segundosAcumulados);

        try {
          await api(`/planner/${task.id}`, { 
            method: 'PUT',
            body: JSON.stringify({ tempo_gasto: segundosAcumulados })
          });
          task.tempo_gasto_segundos = segundosAcumulados; 
        } catch (err) {
          console.error("Erro ao sincronizar cronômetro:", err.message);
        }
      };

      // EVENTO: ZERAR
      btnZerar.onclick = async (e) => {
        e.preventDefault(); 
        e.stopPropagation();

        if (!confirm("Tem certeza que deseja zerar o tempo deste estudo?")) return;

        clearInterval(timerInterval);
        segundosAcumulados = 0;
        display.innerText = formatarTempo(0);
        btnIniciar.innerText = '▶ Iniciar';

        try {
          await api(`/planner/${task.id}`, { 
            method: 'PUT',
            body: JSON.stringify({ tempo_gasto: 0 })
          });
          task.tempo_gasto_segundos = 0; 
        } catch (err) {
          console.error("Erro ao zerar cronômetro:", err.message);
        }
      };
    }
  }

  // --- LÓGICA DOS BOTÕES DE SALVAR/EDITAR/CONCLUIR ---
  if (isMentor) {
    const deleteBtn = overlay.querySelector('#modal-delete-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async (e) => {
        e.preventDefault();
        if (!confirm("Tem certeza que deseja excluir este bloco?")) return;
        
        deleteBtn.textContent = "Excluindo...";
        deleteBtn.disabled = true;
        
        await onDelete();
        closeModal(); 
      };
    }

    overlay.querySelector('#modal-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const submitBtn = e.target.querySelector('button[type="submit"]');
      
      submitBtn.textContent = "Salvando...";
      submitBtn.disabled = true;

      try {
        const payload = Object.fromEntries(fd);
        
        // 👉 A BLINDAGEM MÁXIMA AQUI: Usando o parâmetro direto e não o window!
        payload.data_semana = task ? task.data_semana : semanaDaTela; 
        
        await onSave(payload, dayText, timeText, task?.id);
        closeModal();
      } catch (err) {
        alert("Erro ao salvar no banco de dados: " + err.message);
        submitBtn.textContent = "Salvar Bloco";
        submitBtn.disabled = false;
      }
    };
  } else {
    const toggleBtn = overlay.querySelector('#modal-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = async (e) => { 
        e.preventDefault();
        toggleBtn.disabled = true; 
        toggleBtn.textContent = "Atualizando...";
        try {
          await onToggle(task); 
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