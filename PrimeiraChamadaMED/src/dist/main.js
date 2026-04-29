var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var API = "http://localhost:5000/api";
var root = document.getElementById("app");
function getMentor() {
    var raw = sessionStorage.getItem("mentor");
    return raw ? JSON.parse(raw) : null;
}
function setMentor(m) {
    if (m)
        sessionStorage.setItem("mentor", JSON.stringify(m));
    else
        sessionStorage.removeItem("mentor");
}
function api(path, opts) {
    if (opts === void 0) { opts = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch("" + API + path, __assign({ headers: { "Content-Type": "application/json" } }, opts))];
                case 1:
                    res = _b.sent();
                    if (!!res.ok) return [3 /*break*/, 3];
                    _a = Error.bind;
                    return [4 /*yield*/, res.text()];
                case 2: throw new (_a.apply(Error, [void 0, (_b.sent()) || res.statusText]))();
                case 3:
                    if (res.status === 204)
                        return [2 /*return*/, undefined];
                    return [2 /*return*/, res.json()];
            }
        });
    });
}
function navigate(hash) {
    location.hash = hash;
}
window.addEventListener("hashchange", render);
render();
function render() {
    var hash = location.hash || "#/login";
    var mentor = getMentor();
    if (!mentor && !hash.startsWith("#/login"))
        return navigate("#/login");
    if (hash.startsWith("#/login"))
        return renderLogin();
    if (hash.startsWith("#/admin/aluno/")) {
        var id = Number(hash.split("/").pop());
        return renderStudent(mentor, id);
    }
    return renderAdmin(mentor);
}
// -------- LOGIN --------
function renderLogin() {
    var mode = "login";
    draw();
    function draw() {
        var _this = this;
        root.innerHTML = "\n      <div class=\"center-screen\">\n        <div class=\"card\">\n          <div class=\"brand\">\n            <div class=\"brand-icon\">SH</div>\n            <h1>Study Hub</h1>\n            <p>" + (mode === "login" ? "Entre com sua conta" : "Crie sua conta de mentor") + "</p>\n          </div>\n          <div class=\"tab-toggle\">\n            <button id=\"tab-login\" class=\"" + (mode === "login" ? "active" : "") + "\">Entrar</button>\n            <button id=\"tab-register\" class=\"" + (mode === "register" ? "active" : "") + "\">Cadastrar</button>\n          </div>\n          <form id=\"auth-form\">\n            " + (mode === "register" ? "\n              <div class=\"field\"><label>Nome</label><input name=\"name\" required /></div>\n            " : "") + "\n            <div class=\"field\"><label>E-mail</label><input name=\"email\" type=\"email\" required /></div>\n            <div class=\"field\"><label>Senha</label><input name=\"password\" type=\"password\" required minlength=\"4\" /></div>\n            <button type=\"submit\" class=\"btn\">" + (mode === "login" ? "Entrar" : "Cadastrar") + "</button>\n            <p id=\"msg\" class=\"error\"></p>\n          </form>\n        </div>\n      </div>";
        document.getElementById("tab-login").onclick = function () { mode = "login"; draw(); };
        document.getElementById("tab-register").onclick = function () { mode = "register"; draw(); };
        document.getElementById("auth-form").addEventListener("submit", function (e) { return __awaiter(_this, void 0, void 0, function () {
            var fd, payload, msg, m, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        e.preventDefault();
                        fd = new FormData(e.target);
                        payload = Object.fromEntries(fd);
                        msg = document.getElementById("msg");
                        msg.textContent = "";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, api("/auth/" + (mode === "login" ? "login" : "register"), {
                                method: "POST", body: JSON.stringify(payload)
                            })];
                    case 2:
                        m = _a.sent();
                        setMentor(m);
                        navigate("#/admin");
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        msg.textContent = mode === "login" ? "E-mail ou senha inválidos." : (err_1.message || "Erro ao cadastrar.");
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    }
}
// -------- ADMIN --------
function renderAdmin(mentor) {
    return __awaiter(this, void 0, void 0, function () {
        function refresh() {
            return __awaiter(this, void 0, void 0, function () {
                var students;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, api("/students?mentorId=" + mentor.id)];
                        case 1:
                            students = _a.sent();
                            list.innerHTML = students.length ? students.map(function (s) { return "\n      <article class=\"student-card\">\n        <div class=\"row\">\n          <div style=\"display:flex;gap:.75rem;align-items:center\">\n            <div class=\"avatar\">" + initials(s.name) + "</div>\n            <div><b>" + s.name + "</b><div class=\"muted\" style=\"font-size:.8rem\">" + s.email + "</div></div>\n          </div>\n          <button class=\"btn-danger\" data-del=\"" + s.id + "\">\u2715</button>\n        </div>\n        <div class=\"row\"><span class=\"badge\">" + s.course + "</span></div>\n        <a class=\"link-btn\" href=\"#/admin/aluno/" + s.id + "\">Ver planner \u2192</a>\n      </article>\n    "; }).join("") : "<div class=\"empty\">Nenhum aluno cadastrado ainda.</div>";
                            list.querySelectorAll("[data-del]").forEach(function (b) {
                                b.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!confirm("Remover aluno?"))
                                                    return [2 /*return*/];
                                                return [4 /*yield*/, api("/students/" + b.dataset.del, { method: "DELETE" })];
                                            case 1:
                                                _a.sent();
                                                refresh();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); };
                            });
                            return [2 /*return*/];
                    }
                });
            });
        }
        var list;
        var _this = this;
        return __generator(this, function (_a) {
            root.innerHTML = headerHtml(mentor) + "\n    <main class=\"container\">\n      <section class=\"section\">\n        <h2>Cadastrar novo aluno</h2>\n        <form id=\"new-student\" class=\"grid-form\">\n          <div class=\"field\"><label>Nome</label><input name=\"name\" required /></div>\n          <div class=\"field\"><label>E-mail</label><input name=\"email\" type=\"email\" required /></div>\n          <div class=\"field\"><label>Curso / Objetivo</label><input name=\"course\" required /></div>\n          <button class=\"btn\" style=\"max-width:180px\">Cadastrar</button>\n        </form>\n      </section>\n      <section>\n        <h2 style=\"color:var(--navy);margin-bottom:1rem\">Meus alunos</h2>\n        <div id=\"list\" class=\"grid-cards\"></div>\n      </section>\n    </main>";
            bindHeader();
            list = document.getElementById("list");
            refresh();
            document.getElementById("new-student").addEventListener("submit", function (e) { return __awaiter(_this, void 0, void 0, function () {
                var fd, payload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            e.preventDefault();
                            fd = new FormData(e.target);
                            payload = __assign({ mentorId: mentor.id }, Object.fromEntries(fd));
                            return [4 /*yield*/, api("/students", { method: "POST", body: JSON.stringify(payload) })];
                        case 1:
                            _a.sent();
                            e.target.reset();
                            refresh();
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
// -------- STUDENT PLANNER --------
function renderStudent(mentor, id) {
    return __awaiter(this, void 0, void 0, function () {
        function paint() {
            var _this = this;
            var completed = planner.filter(function (p) { return p.done; }).length;
            var totalH = planner.reduce(function (a, b) { return a + b.hours; }, 0);
            root.innerHTML = headerHtml(mentor) + ("\n      <main class=\"container\">\n        <a class=\"back-link\" href=\"#/admin\">\u2190 Voltar para alunos</a>\n        <section class=\"section\" style=\"margin-top:1rem\">\n          <div class=\"row\">\n            <div style=\"display:flex;gap:1rem;align-items:center\">\n              <div class=\"avatar\" style=\"width:54px;height:54px;font-size:1.1rem\">" + initials(student.name) + "</div>\n              <div>\n                <h2 style=\"margin:0\">" + student.name + "</h2>\n                <div class=\"muted\">" + student.email + " \u00B7 " + student.course + "</div>\n              </div>\n            </div>\n            <div class=\"stats\">\n              <div class=\"stat\"><b>" + completed + "/" + planner.length + "</b><span>Conclu\u00EDdas</span></div>\n              <div class=\"stat\"><b>" + totalH + "h</b><span>Planejadas</span></div>\n            </div>\n          </div>\n        </section>\n\n        <section class=\"section\">\n          <h2>Adicionar tarefa</h2>\n          <form id=\"new-task\" class=\"grid-form\">\n            <div class=\"field\"><label>Dia</label>\n              <select name=\"day\">" + ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(function (d) { return "<option>" + d + "</option>"; }).join("") + "</select>\n            </div>\n            <div class=\"field\"><label>Mat\u00E9ria</label><input name=\"subject\" required /></div>\n            <div class=\"field\"><label>T\u00F3pico</label><input name=\"topic\" required /></div>\n            <div class=\"field\"><label>Horas</label><input name=\"hours\" type=\"number\" step=\"0.5\" min=\"0.5\" value=\"1\" /></div>\n            <button class=\"btn\" style=\"max-width:160px\">Adicionar</button>\n          </form>\n        </section>\n\n        <section>\n          <h2 style=\"color:var(--navy);margin-bottom:1rem\">Planner semanal</h2>\n          <div id=\"planner\">\n            " + (planner.length ? planner.map(function (p) { return "\n              <div class=\"planner-item " + (p.done ? "done" : "") + "\">\n                <button class=\"checkbox " + (p.done ? "checked" : "") + "\" data-toggle=\"" + p.id + "\">" + (p.done ? "✓" : "") + "</button>\n                <div class=\"meta\">\n                  <span>\uD83D\uDCC5 " + p.day + "</span>\n                  <b>\uD83D\uDCD8 " + p.subject + "</b>\n                  <span style=\"" + (p.done ? 'text-decoration:line-through' : '') + "\">" + p.topic + "</span>\n                  <span>\u23F1 " + p.hours + "h</span>\n                </div>\n                <button class=\"btn-danger\" data-del=\"" + p.id + "\">\u2715</button>\n              </div>\n            "; }).join("") : "<div class=\"empty\">Nenhuma tarefa no planner ainda.</div>") + "\n          </div>\n        </section>\n      </main>");
            bindHeader();
            document.getElementById("new-task").addEventListener("submit", function (e) { return __awaiter(_this, void 0, void 0, function () {
                var fd, payload, fresh;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            e.preventDefault();
                            fd = new FormData(e.target);
                            payload = Object.fromEntries(fd);
                            payload.hours = Number(payload.hours);
                            payload.done = false;
                            return [4 /*yield*/, api("/students/" + id + "/planner", { method: "POST", body: JSON.stringify(payload) })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, api("/students/" + id)];
                        case 2:
                            fresh = _a.sent();
                            planner = fresh.planner;
                            paint();
                            return [2 /*return*/];
                    }
                });
            }); });
            root.querySelectorAll("[data-toggle]").forEach(function (b) {
                b.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                    var item;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                item = planner.find(function (p) { return p.id === Number(b.dataset.toggle); });
                                return [4 /*yield*/, api("/planner/" + item.id, { method: "PUT", body: JSON.stringify(__assign(__assign({}, item), { done: !item.done })) })];
                            case 1:
                                _a.sent();
                                item.done = !item.done;
                                paint();
                                return [2 /*return*/];
                        }
                    });
                }); };
            });
            root.querySelectorAll("[data-del]").forEach(function (b) {
                b.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, api("/planner/" + b.dataset.del, { method: "DELETE" })];
                            case 1:
                                _a.sent();
                                planner = planner.filter(function (p) { return p.id !== Number(b.dataset.del); });
                                paint();
                                return [2 /*return*/];
                        }
                    });
                }); };
            });
        }
        var data, student, planner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api("/students/" + id)];
                case 1:
                    data = _a.sent();
                    student = data.student;
                    planner = data.planner;
                    paint();
                    return [2 /*return*/];
            }
        });
    });
}
// -------- helpers --------
function headerHtml(m) {
    return "\n    <header class=\"app-header\">\n      <a class=\"logo\" href=\"#/admin\" style=\"color:#fff;text-decoration:none\">\n        <span class=\"icon\">SH</span>\n        <div><div>Study Hub</div><div style=\"font-size:.75rem;opacity:.8\">Painel do Mentor</div></div>\n      </a>\n      <div style=\"display:flex;align-items:center;gap:1rem\">\n        <span style=\"font-size:.875rem;opacity:.85\">" + m.name + "</span>\n        <button class=\"btn-ghost\" id=\"logout\">Sair</button>\n      </div>\n    </header>";
}
function bindHeader() {
    var b = document.getElementById("logout");
    if (b)
        b.onclick = function () { setMentor(null); navigate("#/login"); };
}
function initials(name) {
    return name.split(" ").map(function (n) { return n[0]; }).slice(0, 2).join("").toUpperCase();
}
