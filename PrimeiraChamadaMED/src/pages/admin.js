// -------- ADMIN (lista de alunos) --------
async function renderAdmin(mentor) {
  const pageContent = `
    <section class="section" style="margin-bottom:1.5rem">
      <div class="row">
        <h2 style="margin:0">Meus alunos</h2>
        <a class="link-btn" href="#/admin/novo-aluno">+ Novo aluno</a>
      </div>
    </section>
    <section>
      <div id="list" class="grid-cards"></div>
    </section>
  `;

  root.innerHTML = layoutHtml(mentor, pageContent);
  bindHeader();

  const list = document.getElementById("list");

  async function refresh() {
    try {
      const students = await api(`/students?mentorId=${mentor.id}`);
      list.innerHTML = students.length ? students.map(s => `
        <article class="student-card">
          <div class="row">
            <div style="display:flex;gap:.75rem;align-items:center">
              <div class="avatar">${initials(s.name)}</div>
              <div><b>${s.name}</b><div class="muted" style="font-size:.8rem">${s.email}</div></div>
            </div>
            <button class="btn-danger" data-del-student="${s.id}" title="Remover aluno">✕</button>
          </div>
          <div class="row"><span class="badge">${s.course}</span></div>
          <button class="link-btn" data-go-student="${s.id}" style="width:100%;cursor:pointer;">Ver planner →</button>
        </article>
      `).join("") : `<div class="empty">Nenhum aluno cadastrado ainda. Clique em <b>+ Novo aluno</b> para começar.</div>`;

      // Navegar para o planner do aluno
      list.querySelectorAll("[data-go-student]").forEach(btn => {
        btn.addEventListener("click", () => {
          const sid = btn.dataset.goStudent;
          location.hash = "#/admin/aluno/" + sid;
        });
      });

      // Excluir aluno
      list.querySelectorAll("[data-del-student]").forEach(b => {
        b.addEventListener("click", async () => {
          if (!confirm("Tem certeza que deseja remover este aluno?")) return;
          await api(`/students/${b.dataset.delStudent}`, { method: "DELETE" });
          refresh();
        });
      });

    } catch (err) {
      list.innerHTML = `<div class="empty">Erro ao carregar alunos: ${err.message}</div>`;
    }
  }

  refresh();
}
