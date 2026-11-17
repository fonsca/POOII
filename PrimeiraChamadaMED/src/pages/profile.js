// -------- Perfil do aluno: ofensiva, horas da semana e foto --------
async function renderProfile(currentUser, studentId) {
  const route = location.hash;
  renderLoading(currentUser);
  try {
    const { student, planner } = await api(`/students/${studentId}`);
    if (location.hash !== route) return;

    const isOwner = currentUser.id === studentId;
    const doneBlocks = planner.filter(p => p.done);
    const hoursPerDay = DAY_NAMES.map(day =>
      doneBlocks.filter(p => p.day === day).reduce((sum, p) => sum + p.hours, 0));
    const maxHours = Math.max(1, ...hoursPerDay);
    const todayIndex = dayIndex(new Date());

    const bars = DAY_NAMES.map((day, i) => {
      const hours = hoursPerDay[i];
      const height = hours ? Math.max(20, (hours / maxHours) * 100) : 0;
      const isToday = i === todayIndex;
      return `
        <div class="hour-bar-wrapper ${isToday ? "today" : ""}">
          <div class="hour-bar-bg" title="${day}: ${hours}h"><div class="hour-bar-fill" style="height: ${height}%"></div></div>
          <div class="small fw-bold ${isToday ? "text-primary" : "text-navy"}">${DAY_SHORT[i]}${isToday ? " ⭐" : ""}</div>
          <div class="small text-body-secondary">${hours}h</div>
        </div>`;
    }).join("");

    renderPage(currentUser, `
      ${isOwner ? "" : `<a href="#/admin/aluno/${studentId}" class="btn btn-link px-0 mb-3">← Voltar ao planner</a>`}

      <div class="profile-header-card d-flex flex-column flex-md-row align-items-center gap-4 mb-4">
        <div id="profile-avatar">${avatarHtml(student, 96)}</div>
        <div class="flex-grow-1 text-center text-md-start min-w-0">
          <h1 class="h3 text-uppercase mb-1">${escapeHtml(student.name)}</h1>
          <div class="opacity-75 mb-2 text-truncate">${escapeHtml(student.email)}</div>
          <span class="badge rounded-pill bg-gold text-navy">${escapeHtml(student.course)}</span>
        </div>
        ${isOwner ? `
          <div>
            <label for="photo-input" class="btn btn-light">📸 Alterar foto</label>
            <input type="file" id="photo-input" class="d-none" accept="image/png, image/jpeg, image/webp" />
          </div>` : ""}
      </div>

      <div class="row g-3 mb-4">
        <div class="col-sm-6">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="fs-3" aria-hidden="true">🔥</div>
              <div class="fs-4 fw-bold text-navy">${student.streak} ${student.streak === 1 ? "DIA" : "DIAS"}</div>
              <div class="small fw-bold text-uppercase text-body-secondary">Ofensiva atual</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6">
          <div class="card h-100 text-center shadow-sm">
            <div class="card-body">
              <div class="fs-3" aria-hidden="true">📖</div>
              <div class="fs-4 fw-bold text-navy">${doneBlocks.length}</div>
              <div class="small fw-bold text-uppercase text-body-secondary">Blocos concluídos na semana</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h6 fw-bold text-uppercase text-navy mb-0">Horas de estudo (semana)</h2>
          <div class="hours-chart">${bars}</div>
        </div>
      </div>
    `);

    document.getElementById("photo-input")?.addEventListener("change", (event) =>
      uploadPhoto(event.target.files[0], currentUser, student));
  } catch (err) {
    if (location.hash === route) renderError(currentUser, err);
  }
}

/** Mostra a imagem na hora e envia para a API, que valida o tipo e o tamanho (até 2 MB). */
function uploadPhoto(file, currentUser, student) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert("Imagem muito grande (máximo 2 MB).");
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const foto = reader.result;
    document.getElementById("profile-avatar").innerHTML = avatarHtml({ ...student, foto }, 96);
    try {
      await api(`/students/${student.id}/profile`, { method: "PUT", body: JSON.stringify({ name: student.name, foto }) });
      currentUser.foto = foto;
      setUser(currentUser);
    } catch (err) {
      alert("Não foi possível salvar a foto: " + err.message);
    }
    renderProfile(currentUser, student.id);
  };
  reader.readAsDataURL(file);
}