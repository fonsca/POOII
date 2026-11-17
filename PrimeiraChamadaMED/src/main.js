// -------- Roteador por hash (#/rota): decide qual tela desenhar --------

window.addEventListener("hashchange", render);
render();

function render() {
  closeOpenModals();
  const user = getUser();
  if (!location.hash) return navigate(user ? homeHash(user) : "#/login-admin");

  const hash = location.hash;
  if (!user && !hash.startsWith("#/login")) return navigate("#/login-admin");
  if (hash === "#/login-aluno") return renderLogin("student");
  if (hash.startsWith("#/login")) return renderLogin("mentor");

  // Telas comuns a aluno e mentor
  if (hash === "#/noticias") return renderNews(user);
  if (hash === "#/perfil") return renderProfile(user, user.id);
  if (hash.startsWith("#/admin/aluno/perfil/")) return renderProfile(user, idFromHash(hash));

  // Telas do mentor
  if (user.role === "mentor") {
    if (hash === "#/admin/novo-aluno") return renderNewStudent(user);
    if (hash.startsWith("#/admin/aluno/editar/")) return renderEditStudent(user, idFromHash(hash));
    if (hash.startsWith("#/admin/aluno/")) return renderStudent(user, idFromHash(hash));
    return renderAdmin(user);
  }

  // Tela do aluno
  return renderStudentHome(user);
}

function homeHash(user) {
  return user.role === "student" ? "#/aluno" : "#/admin";
}

function idFromHash(hash) {
  return Number(hash.split("/").pop());
}

/** Fecha um modal que tenha ficado aberto ao trocar de tela (ex.: botão Voltar do navegador). */
function closeOpenModals() {
  document.querySelectorAll(".modal.show").forEach(el => bootstrap.Modal.getInstance(el)?.hide());
}