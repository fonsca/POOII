// -------- Tela de login (aluno ou mentor) --------
function renderLogin(type) {
  const isStudent = type === "student";

  root.innerHTML = `
    <div class="login-bg min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div class="card login-card shadow-lg w-100">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
            <img src="img/lg.png" alt="Primeira Chamada MED" class="brand-logo mb-2" />
            <h1 class="h4 text-navy mb-1">${isStudent ? "Área do Aluno" : "Painel do Mentor"}</h1>
            <p class="text-body-secondary mb-0">Entre com sua <span class="gold-underline">conta</span></p>
          </div>

          <form id="login-form" novalidate>
            <div class="alert alert-danger d-none" data-form-alert></div>
            <div class="mb-3" data-field>
              <label class="form-label" for="login-email">E-mail <span class="text-gold">★</span></label>
              <input type="email" class="form-control" id="login-email" name="email" autocomplete="username" placeholder="seu@email.com" />
            </div>
            <div class="mb-4" data-field>
              <label class="form-label" for="login-password">Senha <span class="text-gold">★</span></label>
              ${passwordInputHtml({ id: "login-password", name: "password" })}
            </div>
            <button type="submit" class="btn btn-navy w-100 py-2">Entrar</button>
          </form>

          <div class="text-center mt-4">
            <a href="${isStudent ? "#/login-admin" : "#/login-aluno"}" class="small text-decoration-none">
              ${isStudent ? "Sou mentor →" : "← Sou aluno"}
            </a>
          </div>
        </div>
      </div>
    </div>`;

  const form = document.getElementById("login-form");
  bindPasswordToggles(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    clearFormErrors(form);
    setBusy(button, true, "Entrando...");
    try {
      const user = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (user.role !== type) {
        throw new Error(`Esta tela é exclusiva para ${isStudent ? "alunos" : "mentores"}.`);
      }
      setUser(user);
      navigate(isStudent ? "#/aluno" : "#/admin");
    } catch (err) {
      showFormErrors(form, err);
      setBusy(button, false);
    }
  });
}