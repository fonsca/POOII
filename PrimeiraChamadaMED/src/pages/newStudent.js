// -------- /admin/novo-aluno --------
function renderNewStudent(mentor) {
  const pageContent = `
    <a href="#/admin" style="display:inline-block; margin-bottom:1rem; color:var(--navy); text-decoration:none; font-weight:bold;">← Voltar para alunos</a>
    <section class="section">
      <h2 style="margin-bottom:0.5rem">Cadastrar novo aluno</h2>
      <p class="muted" style="margin-bottom:1.5rem">
        Preencha os dados do aluno. Ao definir uma <b>senha inicial</b>, o aluno também receberá um login para acessar o sistema.
      </p>
      <form id="new-student" class="grid-form">
        <div class="field"><label>Nome *</label><input name="name" required placeholder="Ex.: João Silva" /></div>
        <div class="field"><label>E-mail *</label><input name="email" type="email" required placeholder="Ex.: joao@gmail.com" /></div>
        <div class="field"><label>Curso / Objetivo *</label><input name="course" required placeholder="Ex.: Medicina USP" /></div>
        <div class="field"><label>Telefone</label><input type="text" id="phone" placeholder="(00) 00000-0000" oninput="applyPhoneMask(this)" required /></div>
        <div class="field"><label>Data de nascimento</label><input name="birthDate" type="date" /></div>
        
        <div class="field">
          <label>Senha inicial do aluno</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input name="initialPassword" id="new-pwd" type="password" minlength="4" placeholder="Mínimo 4 caracteres (opcional)" style="width: 100%; padding-right: 2.5rem;" />
            <button type="button" onclick="togglePwd('new-pwd', this)" class="pwd-toggle-btn" title="Mostrar/Ocultar senha">
              <img src="img/olho-aberto.png" alt="Olho" class="eye-img" />
            </button>
          </div>
        </div>

        <div class="field" style="grid-column:1/-1"><label>Observações</label><textarea name="notes" rows="3" placeholder="Anotações sobre o aluno..."></textarea></div>
        <div style="grid-column:1/-1;display:flex;gap:1rem;align-items:center;margin-top:1rem;">
          <button class="btn" style="max-width:200px">Cadastrar aluno</button>
          <a href="#/admin" style="color:#666; text-decoration:none; font-weight:500;">Cancelar</a>
        </div>
        <p id="student-msg" class="error" style="grid-column:1/-1"></p>
      </form>
    </section>
  `;

  root.innerHTML = layoutHtml(mentor, pageContent);
  bindHeader();

  document.getElementById("new-student").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("student-msg");
    msg.textContent = "";
    const fd = new FormData(e.target);
    const payload = { mentorId: mentor.id, ...Object.fromEntries(fd) };
    ["phone", "birthDate", "notes", "initialPassword"].forEach(k => {
      if (!payload[k]) delete payload[k];
    });
    try {
      await api("/students", { method: "POST", body: JSON.stringify(payload) });
      navigate("#/admin");
    } catch (err) {
      msg.textContent = err.message || "Não foi possível cadastrar o aluno.";
    }
  });
}
