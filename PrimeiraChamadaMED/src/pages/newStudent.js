// -------- Cadastro de aluno (mentor) --------
function renderNewStudent(mentor) {
  renderPage(mentor, `
    <a href="#/admin" class="btn btn-link px-0 mb-3">← Voltar para alunos</a>
    <div class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h4 text-navy">Cadastrar novo aluno</h1>
        <p class="text-body-secondary">Preencha os dados e defina a senha inicial que o aluno vai usar para entrar.</p>

        <form id="new-student-form" class="row g-3" novalidate>
          <div class="col-12"><div class="alert alert-danger d-none mb-0" data-form-alert></div></div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-name">Nome *</label>
            <input class="form-control" id="ns-name" name="name" maxlength="100" placeholder="Ex.: João Silva" />
          </div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-email">E-mail *</label>
            <input type="email" class="form-control" id="ns-email" name="email" maxlength="150" placeholder="joao@gmail.com" />
          </div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-course">Curso / objetivo *</label>
            <input class="form-control" id="ns-course" name="course" maxlength="100" placeholder="Ex.: Medicina USP" />
          </div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-phone">Telefone (WhatsApp)</label>
            <input type="tel" class="form-control" id="ns-phone" name="phone" placeholder="(00) 00000-0000" />
          </div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-birth">Data de nascimento</label>
            <input type="date" class="form-control" id="ns-birth" name="birthDate" />
          </div>
          <div class="col-md-6" data-field>
            <label class="form-label" for="ns-password">Senha inicial *</label>
            ${passwordInputHtml({ id: "ns-password", name: "initialPassword", placeholder: "Mínimo 6 caracteres", autocomplete: "new-password" })}
          </div>
          <div class="col-12" data-field>
            <label class="form-label" for="ns-notes">Observações</label>
            <textarea class="form-control" id="ns-notes" name="notes" rows="2" maxlength="500"></textarea>
          </div>
          <div class="col-12 d-flex gap-2">
            <button type="submit" class="btn btn-navy">Cadastrar aluno</button>
            <a href="#/admin" class="btn btn-outline-secondary">Cancelar</a>
          </div>
        </form>
      </div>
    </div>`);

  const form = document.getElementById("new-student-form");
  bindPasswordToggles(form);
  form.elements.phone.addEventListener("input", (event) => applyPhoneMask(event.target));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const payload = { mentorId: mentor.id, ...Object.fromEntries(new FormData(form)) };
    // Campos opcionais vazios não são enviados
    ["phone", "birthDate", "notes"].forEach(key => { if (!payload[key]) delete payload[key]; });

    clearFormErrors(form);
    setBusy(button, true);
    try {
      await api("/students", { method: "POST", body: JSON.stringify(payload) });
      navigate("#/admin");
    } catch (err) {
      showFormErrors(form, err);
      setBusy(button, false);
    }
  });
}