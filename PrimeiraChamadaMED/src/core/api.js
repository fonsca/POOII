// -------- Comunicação com a API e sessão do usuário --------

const API_URL = window.APP_CONFIG.apiUrl;

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) ?? null;
  } catch {
    return null;
  }
}

function setUser(user) {
  if (user) sessionStorage.setItem("user", JSON.stringify(user));
  else sessionStorage.removeItem("user");
}

/**
 * Chama a API e devolve o JSON da resposta.
 * Em caso de erro, lança um Error com:
 *  - message: texto para exibir;
 *  - status: código HTTP (0 = API fora do ar);
 *  - fields: erros de validação por campo, ex.: { email: ["Informe um e-mail válido."] }.
 */
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    const error = new Error("Não foi possível conectar à API. Verifique se ela está rodando.");
    error.status = 0;
    error.fields = {};
    throw error;
  }

  if (res.status === 204) return undefined;

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    // A API devolve erros no formato Problem Details: { title, detail, errors }
    const fields = body?.errors ?? {};
    const messages = Object.values(fields).flat();
    const error = new Error(messages.join(" ") || body?.detail || body?.title || res.statusText);
    error.status = res.status;
    error.fields = fields;
    throw error;
  }

  return body ?? {};
}
