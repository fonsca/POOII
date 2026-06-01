// -------- TELA DE LOGIN --------
function renderLogin(type) {
  const title = type === "student" ? "Área do Aluno" : "Painel do Mentor";
  const linkText = type === "student" ? "Sou um mentor →" : "← Sou um aluno";
  const linkHref = type === "student" ? "#/login-admin" : "#/login-aluno";

  root.innerHTML = `
    <div class="center-screen">
      <div class="card login-card">
        <span class="gold-ribbon" aria-hidden="true"></span>
        <div class="brand">
          <img src="img/lg.png" alt="Primeira Chamada MED" class="brand-logo" />
          <h3 style="color: var(--navy); margin: 0.5rem 0;">${title}</h3>
          <p>Entre com sua <span class="gold-underline">conta</span></p>
        </div>
        <form id="auth-form">
          <div class="field">
            <label>E-mail <span class="gold-text">★</span></label>
            <input name="email" type="email" required placeholder="Ex.: seu@email.com" />
          </div>
          <div class="field">
            <label>Senha <span class="gold-text">★</span></label>
            <div style="position: relative; display: flex; align-items: center;">
              <input name="password" id="login-pwd" type="password" required minlength="4" style="width: 100%; padding-right: 2.5rem;" />
              <button type="button" onclick="togglePwd('login-pwd', this)" class="pwd-toggle-btn" title="Mostrar/Ocultar senha">
                <img src="img/olho-aberto.png" alt="Olho" class="eye-img" />
              </button>
            </div> 
          </div>
          <button type="submit" class="btn">Entrar</button>
          <p id="msg" class="error"></p>
        </form>
        <div style="text-align: center; margin-top: 1.5rem;">
           <a href="${linkHref}" class="muted" style="font-size: 0.85rem; text-decoration: none;">${linkText}</a>
        </div>
      </div>
    </div>`;

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    const msg = document.getElementById("msg");
    msg.textContent = "";

    try {
      const u = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      if (u.role !== type) {
          throw new Error(`Acesso negado. Esta tela é exclusiva para ${type === 'student' ? 'alunos' : 'mentores'}.`);
      }

      setUser(u);
      navigate(u.role === "student" ? "#/aluno" : "#/admin");
    } catch (err) {
      msg.textContent = err.message || "E-mail ou senha inválidos.";
    }
  });
}
