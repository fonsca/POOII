// -------- Componentes do planner semanal: grade, progresso e troca de semana --------

const SUBJECTS = {
  bio: { css: "bio", label: "🧬 Biologia" },
  mat: { css: "mat", label: "📐 Matemática" },
  fis: { css: "fis", label: "⚡ Física" },
  qui: { css: "qui", label: "🧪 Química" },
  port: { css: "port", label: "📝 Português" },
  hist: { css: "hist", label: "🏛️ História" },
  geo: { css: "geo", label: "🌍 Geografia" },
  rev: { css: "rev", label: "🔄 Revisão" },
};

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DAY_SHORT = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// ---- Datas: sempre no fuso local, sem converter para UTC ----

/** Date → "AAAA-MM-DD" */
function toIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "AAAA-MM-DD" → Date à meia-noite local */
function parseIsoDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`);
}

function shiftWeek(weekStart, days) {
  const date = parseIsoDate(weekStart);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Posição do dia no planner: segunda = 0 ... domingo = 6 */
function dayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

// ---- Grade semanal ----

/**
 * Mentor: clica numa célula vazia para criar e num bloco para editar.
 * Aluno: clica num bloco para ver detalhes, usar o cronômetro e concluir.
 */
function buildPlannerGrid(planner, { isMentor, weekStart }) {
  const monday = parseIsoDate(weekStart);
  const today = new Date().toDateString();
  const days = DAY_NAMES.map((name, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      name,
      short: DAY_SHORT[i],
      number: String(date.getDate()).padStart(2, "0"),
      isToday: date.toDateString() === today,
    };
  });

  const header = days.map(d => `
    <th scope="col" class="day-header ${d.isToday ? "today" : ""}">
      <span class="d-block">${d.short}</span><span class="day-num">${d.number}</span>
    </th>`).join("");

  const rows = TIME_SLOTS.map(time => {
    const lunch = time === "12:00"
      ? `<tr><td colspan="8" class="lunch-break">🍽️ INTERVALO (11:00 - 12:00)</td></tr>`
      : "";
    const cells = days
      .map(d => plannerCellHtml(planner.find(p => p.day === d.name && p.time === time), d.name, time, isMentor))
      .join("");
    return `${lunch}<tr><th scope="row" class="time-label">${time}</th>${cells}</tr>`;
  }).join("");

  return `
    <div class="table-responsive planner-grid">
      <table class="planner-table">
        <thead>
          <tr><th scope="col" class="time-col"><span class="visually-hidden">Horário</span></th>${header}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function plannerCellHtml(task, day, time, isMentor) {
  if (!task) {
    return isMentor
      ? `<td class="planner-cell empty-cell" data-action="create" data-day="${day}" data-time="${time}" title="Adicionar bloco"></td>`
      : `<td class="planner-cell"></td>`;
  }

  const subject = SUBJECTS[task.subject] ?? SUBJECTS.rev;
  const end = `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  const spent = !isMentor && task.tempo_gasto_segundos > 0
    ? `<span class="planner-block-spent">⏱️ ${formatDuration(task.tempo_gasto_segundos)}</span>`
    : "";

  return `
    <td class="planner-cell">
      <button type="button" class="planner-block ${subject.css} ${task.done ? "is-done" : ""}"
              data-action="${isMentor ? "edit" : "view"}" data-id="${task.id}" title="${escapeHtml(task.topic)}">
        <span class="planner-block-name">${subject.label}</span>
        <span class="planner-block-time">${time}–${end}</span>
        ${spent}
      </button>
    </td>`;
}

// ---- Progresso e troca de semana ----

function buildProgressBar(planner) {
  if (!planner.length) return "";
  const done = planner.filter(p => p.done).length;
  const percent = Math.round((done / planner.length) * 100);
  return `
    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h6 fw-bold text-navy mb-0">📊 Progresso da semana</h2>
          <span class="badge rounded-pill text-bg-light">${done} de ${planner.length} blocos concluídos</span>
        </div>
        <div class="progress" style="height: 1.5rem" role="progressbar" aria-label="Progresso da semana"
             aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar bg-gold text-navy fw-bold" style="width: ${percent}%">${percent}%</div>
        </div>
      </div>
    </div>`;
}

function weekNavHtml(weekStart) {
  return `
    <div class="card shadow-sm mb-4">
      <div class="card-body d-flex align-items-center justify-content-between gap-2">
        <button type="button" class="btn btn-outline-secondary" data-week-shift="-7" aria-label="Semana anterior">
          ⬅️ <span class="d-none d-sm-inline">Anterior</span>
        </button>
        <strong class="text-navy text-center">📅 Semana de ${formatDateBR(weekStart)}</strong>
        <button type="button" class="btn btn-outline-secondary" data-week-shift="7" aria-label="Próxima semana">
          <span class="d-none d-sm-inline">Próxima</span> ➡️
        </button>
      </div>
    </div>`;
}

function bindWeekNav(weekStart, onChange) {
  root.querySelectorAll("[data-week-shift]").forEach(button => {
    button.addEventListener("click", () => onChange(shiftWeek(weekStart, Number(button.dataset.weekShift))));
  });
}