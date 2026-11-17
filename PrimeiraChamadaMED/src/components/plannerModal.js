// -------- Modal do bloco de estudo (componente Modal do Bootstrap) --------

/**
 * Abre o modal de um bloco do planner.
 *  - mode "create" ou "edit": formulário do mentor (onSave, onDelete)
 *  - mode "view": detalhes, cronômetro e conclusão para o aluno (onToggle, onTimeChange)
 */
function showPlannerModal({ mode, task, day, time, weekStart, onSave, onDelete, onToggle, onTimeChange }) {
  const titles = { create: "Novo bloco de estudo", edit: "Editar bloco", view: "Detalhes do estudo" };
  const isMentor = mode !== "view";

  const element = document.createElement("div");
  element.className = "modal fade";
  element.tabIndex = -1;
  element.setAttribute("aria-labelledby", "planner-modal-title");
  element.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2 class="modal-title h5 text-navy" id="planner-modal-title">${titles[mode]}</h2>
            <small class="text-body-secondary">📅 ${escapeHtml(task?.day ?? day)} • 🕒 ${escapeHtml(task?.time ?? time)}</small>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
        </div>
        <div class="modal-body">${isMentor ? mentorFormHtml(task) : studentViewHtml(task)}</div>
      </div>
    </div>`;

  document.body.append(element);
  const modal = new bootstrap.Modal(element);

  // Ao fechar, o modal sai da página
  element.addEventListener("hidden.bs.modal", () => {
    modal.dispose();
    element.remove();
  });

  if (isMentor) bindMentorForm(element, modal, { task, day, time, weekStart, onSave, onDelete });
  else bindStudentView(element, modal, { task, onToggle, onTimeChange });

  modal.show();
}

function mentorFormHtml(task) {
  const options = Object.entries(SUBJECTS)
    .map(([value, subject]) => `<option value="${value}" ${task?.subject === value ? "selected" : ""}>${subject.label}</option>`)
    .join("");

  return `
    <form id="planner-form" novalidate>
      <div class="alert alert-danger d-none" data-form-alert></div>
      <div class="mb-3" data-field>
        <label class="form-label" for="pm-subject">Disciplina</label>
        <select class="form-select" id="pm-subject" name="subject">${options}</select>
      </div>
      <div class="mb-3" data-field>
        <label class="form-label" for="pm-topic">Tópico principal</label>
        <input class="form-control" id="pm-topic" name="topic" maxlength="120" placeholder="Ex.: Citologia" value="${escapeHtml(task?.topic)}" />
      </div>
      <div class="mb-3" data-field>
        <label class="form-label" for="pm-subtopics">Subtópicos / instruções do mentor</label>
        <textarea class="form-control" id="pm-subtopics" name="subtopics" rows="3" maxlength="1000"
                  placeholder="Ex.: Fazer os exercícios da página 40">${escapeHtml(task?.subtopics)}</textarea>
      </div>
      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-navy flex-grow-1">Salvar bloco</button>
        ${task ? `<button type="button" class="btn btn-outline-danger" data-delete>Excluir</button>` : ""}
      </div>
    </form>`;
}

function studentViewHtml(task) {
  return `
    <div class="bg-body-tertiary rounded p-3 mb-3">
      <h3 class="h6 fw-bold text-navy mb-2">${escapeHtml(task.topic)}</h3>
      <p class="small text-body-secondary text-pre-wrap mb-0">${escapeHtml(task.subtopics || "Sem detalhes adicionais.")}</p>
    </div>

    <div class="border rounded p-3 text-center mb-3">
      <div class="small fw-bold text-uppercase text-body-secondary">Tempo de foco</div>
      <div class="timer-display my-2" data-timer>00:00:00</div>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <button type="button" class="btn btn-success" data-timer-start>▶ Iniciar</button>
        <button type="button" class="btn btn-danger d-none" data-timer-stop>⏹ Parar</button>
        <button type="button" class="btn btn-secondary" data-timer-reset>🔄 Zerar</button>
      </div>
    </div>

    <button type="button" class="btn w-100 ${task.done ? "btn-secondary" : "btn-success"}" data-toggle-done>
      ${task.done ? "↩️ Desmarcar conclusão" : "✅ Marcar como concluído"}
    </button>`;
}

function bindMentorForm(element, modal, { task, day, time, weekStart, onSave, onDelete }) {
  const form = element.querySelector("#planner-form");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const payload = {
      ...Object.fromEntries(new FormData(form)),
      day: task?.day ?? day,
      time: task?.time ?? time,
      hours: task?.hours ?? 1,
      data_semana: task?.data_semana || weekStart,
    };

    clearFormErrors(form);
    setBusy(button, true);
    try {
      await onSave(payload);
      modal.hide();
    } catch (err) {
      showFormErrors(form, err);
      setBusy(button, false);
    }
  });

  const deleteButton = form.querySelector("[data-delete]");
  deleteButton?.addEventListener("click", async () => {
    if (!confirm("Tem certeza que deseja excluir este bloco?")) return;
    setBusy(deleteButton, true, "Excluindo...");
    try {
      await onDelete();
      modal.hide();
    } catch (err) {
      showFormErrors(form, err);
      setBusy(deleteButton, false);
    }
  });
}

function bindStudentView(element, modal, { task, onToggle, onTimeChange }) {
  const display = element.querySelector("[data-timer]");
  const startButton = element.querySelector("[data-timer-start]");
  const stopButton = element.querySelector("[data-timer-stop]");
  const resetButton = element.querySelector("[data-timer-reset]");
  const toggleButton = element.querySelector("[data-toggle-done]");

  let seconds = task.tempo_gasto_segundos || 0;
  let interval = null;
  let timeChanged = false;

  const format = (total) =>
    [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
      .map(n => String(n).padStart(2, "0"))
      .join(":");

  const saveTime = async () => {
    try {
      await api(`/planner/${task.id}/time`, { method: "PATCH", body: JSON.stringify({ tempo_gasto: seconds }) });
      task.tempo_gasto_segundos = seconds;
      timeChanged = true;
    } catch (err) {
      alert("Não foi possível salvar o tempo: " + err.message);
    }
  };

  const stop = async () => {
    if (!interval) return;
    clearInterval(interval);
    interval = null;
    stopButton.classList.add("d-none");
    startButton.classList.remove("d-none");
    resetButton.classList.remove("d-none");
    startButton.textContent = "▶ Continuar";
    await saveTime();
  };

  display.textContent = format(seconds);
  if (seconds > 0) startButton.textContent = "▶ Continuar";

  startButton.addEventListener("click", () => {
    startButton.classList.add("d-none");
    resetButton.classList.add("d-none");
    stopButton.classList.remove("d-none");
    interval = setInterval(() => {
      seconds += 1;
      display.textContent = format(seconds);
    }, 1000);
  });

  stopButton.addEventListener("click", stop);

  resetButton.addEventListener("click", async () => {
    if (!confirm("Tem certeza que deseja zerar o tempo deste estudo?")) return;
    seconds = 0;
    display.textContent = format(0);
    startButton.textContent = "▶ Iniciar";
    await saveTime();
  });

  toggleButton.addEventListener("click", async () => {
    await stop();
    setBusy(toggleButton, true, "Atualizando...");
    try {
      await onToggle(task);
      timeChanged = false; // a tela já foi recarregada pelo onToggle
      modal.hide();
    } catch (err) {
      alert("Não foi possível atualizar: " + err.message);
      setBusy(toggleButton, false);
    }
  });

  // Fechar o modal com o cronômetro ligado também salva o tempo
  element.addEventListener("hide.bs.modal", stop);
  // Depois de fechar, recarrega a grade para mostrar o tempo novo
  element.addEventListener("hidden.bs.modal", () => {
    if (timeChanged) onTimeChange?.();
  });
}