// -------- Edição do cadastro do aluno (mentor) --------
async function renderEditStudent(mentor, studentId) {
  const route = location.hash;
  renderLoading(mentor);
  try {
    const { student } = await api(`/students/${studentId}`);
    if (location.hash !== route) return;

    renderPage(mentor, `
      <a href="#/admin/aluno/${studentId}" class="btn btn-link px-0 mb-3">← Voltar ao planner</a>
      <div class="card shadow-sm mx-auto" style="max-width: 640px">
        <div class="card-body p-4">
          <h1 class="h4 text-navy mb-4">✏️ Editar aluno</h1>
          <form id="edit-student-form" class="row g-3" novalidate>
            <div class="col-12"><div class="alert alert-danger d-none mb-0" data-form-alert></div></div>
            <div class="col-12" data-field>
              <label class="form-label" for="es-name">Nome completo *</label>
              <input class="form-control" id="es-name" name="name" maxlength="100" value="${escapeHtml(student.name)}" />
            </div>
            <div class="col-12" data-field>
              <label class="form-label" for="es-email">E-mail *</label>
              <input type="email" class="form-control" id="es-email" name="email" maxlength="150" value="${escapeHtml(student.email)}" />
            </div>
            <div class="col-md-6" data-field>
              <label class="form-label" for="es-course">Curso alvo *</label>
              <input class="form-control" id="es-course" name="course" maxlength="100" value="${escapeHtml(student.course)}" />
            </div>
            <div class="col-md-6" data-field>
              <label class="form-label" for="es-phone">Telefone (WhatsApp)</label>
              <input type="tel" class="form-control" id="es-phone" name="phone" placeholder="(00) 00000-0000" value="${escapeHtml(student.phone)}" />
            </div>
            <div class="col-12 d-flex justify-content-end gap-2 border-top pt-3">
              <a href="#/admin/aluno/${studentId}" class="btn btn-outline-secondary">Cancelar</a>
              <button type="submit" class="btn btn-success">💾 Salvar alterações</button>
            </div>
          </form>
        </div>
      </div>`);

    const form = document.getElementById("edit-student-form");
    form.elements.phone.addEventListener("input", (event) => applyPhoneMask(event.target));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      const payload = Object.fromEntries(new FormData(form));
      if (!payload.phone) delete payload.phone;

      clearFormErrors(form);
      setBusy(button, true);
      try {
        await api(`/students/${studentId}`, { method: "PUT", body: JSON.stringify(payload) });
        navigate(`#/admin/aluno/${studentId}`);
      } catch (err) {
        showFormErrors(form, err);
        setBusy(button, false);
      }
    });
  } catch (err) {
    if (location.hash === route) renderError(mentor, err);
  }
}