"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var API = "http://localhost:5000/api";
var root = document.getElementById("app");

function getMentor() {
  var raw = sessionStorage.getItem("mentor");
  return raw ? JSON.parse(raw) : null;
}

function setMentor(m) {
  if (m) sessionStorage.setItem("mentor", JSON.stringify(m));else sessionStorage.removeItem("mentor");
}

function api(path) {
  var opts,
      res,
      _args = arguments;
  return regeneratorRuntime.async(function api$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          opts = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          _context.next = 3;
          return regeneratorRuntime.awrap(fetch("".concat(API).concat(path), _objectSpread({
            headers: {
              "Content-Type": "application/json"
            }
          }, opts)));

        case 3:
          res = _context.sent;

          if (res.ok) {
            _context.next = 13;
            break;
          }

          _context.t0 = Error;
          _context.next = 8;
          return regeneratorRuntime.awrap(res.text());

        case 8:
          _context.t1 = _context.sent;

          if (_context.t1) {
            _context.next = 11;
            break;
          }

          _context.t1 = res.statusText;

        case 11:
          _context.t2 = _context.t1;
          throw new _context.t0(_context.t2);

        case 13:
          if (!(res.status === 204)) {
            _context.next = 15;
            break;
          }

          return _context.abrupt("return", undefined);

        case 15:
          return _context.abrupt("return", res.json());

        case 16:
        case "end":
          return _context.stop();
      }
    }
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
  if (!mentor && !hash.startsWith("#/login")) return navigate("#/login");
  if (hash.startsWith("#/login")) return renderLogin();

  if (hash.startsWith("#/admin/aluno/")) {
    var id = Number(hash.split("/").pop());
    return renderStudent(mentor, id);
  }

  return renderAdmin(mentor);
} // -------- TELA DE LOGIN --------


function renderLogin() {
  var mode = "login";
  draw();

  function draw() {
    root.innerHTML = "\n      <div class=\"center-screen\">\n        <div class=\"card\">\n          <div class=\"brand\">\n            <div class=\"brand-icon\">img</div>\n            <h1>Primeira Chamada MED</h1>\n            <p>".concat(mode === "login" ? "Entre com sua conta" : "Crie sua conta de mentor", "</p>\n          </div>\n          <div class=\"tab-toggle\">\n            <button id=\"tab-login\" class=\"").concat(mode === "login" ? "active" : "", "\">Entrar</button>\n            <button id=\"tab-register\" class=\"").concat(mode === "register" ? "active" : "", "\">Cadastrar</button>\n          </div>\n          <form id=\"auth-form\">\n            ").concat(mode === "register" ? "\n              <div class=\"field\"><label>Nome</label><input name=\"name\" required /></div>\n            " : "", "\n            <div class=\"field\"><label>E-mail</label><input name=\"email\" type=\"email\" required /></div>\n            <div class=\"field\"><label>Senha</label><input name=\"password\" type=\"password\" required minlength=\"4\" /></div>\n            <button type=\"submit\" class=\"btn\">").concat(mode === "login" ? "Entrar" : "Cadastrar", "</button>\n            <p id=\"msg\" class=\"error\"></p>\n          </form>\n        </div>\n      </div>");

    document.getElementById("tab-login").onclick = function () {
      mode = "login";
      draw();
    };

    document.getElementById("tab-register").onclick = function () {
      mode = "register";
      draw();
    };

    document.getElementById("auth-form").addEventListener("submit", function _callee(e) {
      var fd, payload, msg, m;
      return regeneratorRuntime.async(function _callee$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              e.preventDefault();
              fd = new FormData(e.target);
              payload = Object.fromEntries(fd);
              msg = document.getElementById("msg");
              msg.textContent = "";
              _context2.prev = 5;
              _context2.next = 8;
              return regeneratorRuntime.awrap(api("/auth/".concat(mode === "login" ? "login" : "register"), {
                method: "POST",
                body: JSON.stringify(payload)
              }));

            case 8:
              m = _context2.sent;
              setMentor(m);
              navigate("#/admin");
              _context2.next = 16;
              break;

            case 13:
              _context2.prev = 13;
              _context2.t0 = _context2["catch"](5);
              msg.textContent = mode === "login" ? "E-mail ou senha inválidos." : _context2.t0.message || "Erro ao cadastrar.";

            case 16:
            case "end":
              return _context2.stop();
          }
        }
      }, null, null, [[5, 13]]);
    });
  }
} // -------- ADMIN --------


function renderAdmin(mentor) {
  var list, refresh;
  return regeneratorRuntime.async(function renderAdmin$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          refresh = function _ref() {
            var students;
            return regeneratorRuntime.async(function refresh$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    _context4.next = 2;
                    return regeneratorRuntime.awrap(api("/students?mentorId=".concat(mentor.id)));

                  case 2:
                    students = _context4.sent;
                    list.innerHTML = students.length ? students.map(function (s) {
                      return "\n      <article class=\"student-card\">\n        <div class=\"row\">\n          <div style=\"display:flex;gap:.75rem;align-items:center\">\n            <div class=\"avatar\">".concat(initials(s.name), "</div>\n            <div><b>").concat(s.name, "</b><div class=\"muted\" style=\"font-size:.8rem\">").concat(s.email, "</div></div>\n          </div>\n          <button class=\"btn-danger\" data-del=\"").concat(s.id, "\">\u2715</button>\n        </div>\n        <div class=\"row\"><span class=\"badge\">").concat(s.course, "</span></div>\n        <a class=\"link-btn\" href=\"#/admin/aluno/").concat(s.id, "\">Ver planner \u2192</a>\n      </article>\n    ");
                    }).join("") : "<div class=\"empty\">Nenhum aluno cadastrado ainda.</div>";
                    list.querySelectorAll("[data-del]").forEach(function (b) {
                      b.onclick = function _callee2() {
                        return regeneratorRuntime.async(function _callee2$(_context3) {
                          while (1) {
                            switch (_context3.prev = _context3.next) {
                              case 0:
                                if (confirm("Remover aluno?")) {
                                  _context3.next = 2;
                                  break;
                                }

                                return _context3.abrupt("return");

                              case 2:
                                _context3.next = 4;
                                return regeneratorRuntime.awrap(api("/students/".concat(b.dataset.del), {
                                  method: "DELETE"
                                }));

                              case 4:
                                refresh();

                              case 5:
                              case "end":
                                return _context3.stop();
                            }
                          }
                        });
                      };
                    });

                  case 5:
                  case "end":
                    return _context4.stop();
                }
              }
            });
          };

          root.innerHTML = headerHtml(mentor) + "\n    <main class=\"container\">\n      <section class=\"section\">\n        <h2>Cadastrar novo aluno</h2>\n        <form id=\"new-student\" class=\"grid-form\">\n          <div class=\"field\"><label>Nome</label><input name=\"name\" required /></div>\n          <div class=\"field\"><label>E-mail</label><input name=\"email\" type=\"email\" required /></div>\n          <div class=\"field\"><label>Curso / Objetivo</label><input name=\"course\" required /></div>\n          <button class=\"btn\" style=\"max-width:180px\">Cadastrar</button>\n        </form>\n      </section>\n      <section>\n        <h2 style=\"color:var(--navy);margin-bottom:1rem\">Meus alunos</h2>\n        <div id=\"list\" class=\"grid-cards\"></div>\n      </section>\n    </main>";
          bindHeader();
          list = document.getElementById("list");
          refresh();
          document.getElementById("new-student").addEventListener("submit", function _callee3(e) {
            var fd, payload;
            return regeneratorRuntime.async(function _callee3$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    e.preventDefault();
                    fd = new FormData(e.target);
                    payload = _objectSpread({
                      mentorId: mentor.id
                    }, Object.fromEntries(fd));
                    _context5.next = 5;
                    return regeneratorRuntime.awrap(api("/students", {
                      method: "POST",
                      body: JSON.stringify(payload)
                    }));

                  case 5:
                    e.target.reset();
                    refresh();

                  case 7:
                  case "end":
                    return _context5.stop();
                }
              }
            });
          });

        case 6:
        case "end":
          return _context6.stop();
      }
    }
  });
} // -------- STUDENT PLANNER --------


function renderStudent(mentor, id) {
  var data, student, planner, paint;
  return regeneratorRuntime.async(function renderStudent$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          paint = function _ref2() {
            var completed = planner.filter(function (p) {
              return p.done;
            }).length;
            var totalH = planner.reduce(function (a, b) {
              return a + b.hours;
            }, 0);
            root.innerHTML = headerHtml(mentor) + "\n      <main class=\"container\">\n        <a class=\"back-link\" href=\"#/admin\">\u2190 Voltar para alunos</a>\n        <section class=\"section\" style=\"margin-top:1rem\">\n          <div class=\"row\">\n            <div style=\"display:flex;gap:1rem;align-items:center\">\n              <div class=\"avatar\" style=\"width:54px;height:54px;font-size:1.1rem\">".concat(initials(student.name), "</div>\n              <div>\n                <h2 style=\"margin:0\">").concat(student.name, "</h2>\n                <div class=\"muted\">").concat(student.email, " \xB7 ").concat(student.course, "</div>\n              </div>\n            </div>\n            <div class=\"stats\">\n              <div class=\"stat\"><b>").concat(completed, "/").concat(planner.length, "</b><span>Conclu\xEDdas</span></div>\n              <div class=\"stat\"><b>").concat(totalH, "h</b><span>Planejadas</span></div>\n            </div>\n          </div>\n        </section>\n\n        <section class=\"section\">\n          <h2>Adicionar tarefa</h2>\n          <form id=\"new-task\" class=\"grid-form\">\n            <div class=\"field\"><label>Dia</label>\n              <select name=\"day\">").concat(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(function (d) {
              return "<option>".concat(d, "</option>");
            }).join(""), "</select>\n            </div>\n            <div class=\"field\"><label>Mat\xE9ria</label><input name=\"subject\" required /></div>\n            <div class=\"field\"><label>T\xF3pico</label><input name=\"topic\" required /></div>\n            <div class=\"field\"><label>Horas</label><input name=\"hours\" type=\"number\" step=\"0.5\" min=\"0.5\" value=\"1\" /></div>\n            <button class=\"btn\" style=\"max-width:160px\">Adicionar</button>\n          </form>\n        </section>\n\n        <section>\n          <h2 style=\"color:var(--navy);margin-bottom:1rem\">Planner semanal</h2>\n          <div id=\"planner\">\n            ").concat(planner.length ? planner.map(function (p) {
              return "\n              <div class=\"planner-item ".concat(p.done ? "done" : "", "\">\n                <button class=\"checkbox ").concat(p.done ? "checked" : "", "\" data-toggle=\"").concat(p.id, "\">").concat(p.done ? "✓" : "", "</button>\n                <div class=\"meta\">\n                  <span>\uD83D\uDCC5 ").concat(p.day, "</span>\n                  <b>\uD83D\uDCD8 ").concat(p.subject, "</b>\n                  <span style=\"").concat(p.done ? 'text-decoration:line-through' : '', "\">").concat(p.topic, "</span>\n                  <span>\u23F1 ").concat(p.hours, "h</span>\n                </div>\n                <button class=\"btn-danger\" data-del=\"").concat(p.id, "\">\u2715</button>\n              </div>\n            ");
            }).join("") : "<div class=\"empty\">Nenhuma tarefa no planner ainda.</div>", "\n          </div>\n        </section>\n      </main>");
            bindHeader();
            document.getElementById("new-task").addEventListener("submit", function _callee4(e) {
              var fd, payload, fresh;
              return regeneratorRuntime.async(function _callee4$(_context7) {
                while (1) {
                  switch (_context7.prev = _context7.next) {
                    case 0:
                      e.preventDefault();
                      fd = new FormData(e.target);
                      payload = Object.fromEntries(fd);
                      payload.hours = Number(payload.hours);
                      payload.done = false;
                      _context7.next = 7;
                      return regeneratorRuntime.awrap(api("/students/".concat(id, "/planner"), {
                        method: "POST",
                        body: JSON.stringify(payload)
                      }));

                    case 7:
                      _context7.next = 9;
                      return regeneratorRuntime.awrap(api("/students/".concat(id)));

                    case 9:
                      fresh = _context7.sent;
                      planner = fresh.planner;
                      paint();

                    case 12:
                    case "end":
                      return _context7.stop();
                  }
                }
              });
            });
            root.querySelectorAll("[data-toggle]").forEach(function (b) {
              b.onclick = function _callee5() {
                var item;
                return regeneratorRuntime.async(function _callee5$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        item = planner.find(function (p) {
                          return p.id === Number(b.dataset.toggle);
                        });
                        _context8.next = 3;
                        return regeneratorRuntime.awrap(api("/planner/".concat(item.id), {
                          method: "PUT",
                          body: JSON.stringify(_objectSpread({}, item, {
                            done: !item.done
                          }))
                        }));

                      case 3:
                        item.done = !item.done;
                        paint();

                      case 5:
                      case "end":
                        return _context8.stop();
                    }
                  }
                });
              };
            });
            root.querySelectorAll("[data-del]").forEach(function (b) {
              b.onclick = function _callee6() {
                return regeneratorRuntime.async(function _callee6$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.next = 2;
                        return regeneratorRuntime.awrap(api("/planner/".concat(b.dataset.del), {
                          method: "DELETE"
                        }));

                      case 2:
                        planner = planner.filter(function (p) {
                          return p.id !== Number(b.dataset.del);
                        });
                        paint();

                      case 4:
                      case "end":
                        return _context9.stop();
                    }
                  }
                });
              };
            });
          };

          _context10.next = 3;
          return regeneratorRuntime.awrap(api("/students/".concat(id)));

        case 3:
          data = _context10.sent;
          student = data.student;
          planner = data.planner;
          paint();

        case 7:
        case "end":
          return _context10.stop();
      }
    }
  });
} // -------- helpers --------


function headerHtml(m) {
  return "\n    <header class=\"app-header\">\n      <a class=\"logo\" href=\"#/admin\" style=\"color:#fff;text-decoration:none\">\n        <span class=\"icon\">SH</span>\n        <div><div>Study Hub</div><div style=\"font-size:.75rem;opacity:.8\">Painel do Mentor</div></div>\n      </a>\n      <div style=\"display:flex;align-items:center;gap:1rem\">\n        <span style=\"font-size:.875rem;opacity:.85\">".concat(m.name, "</span>\n        <button class=\"btn-ghost\" id=\"logout\">Sair</button>\n      </div>\n    </header>");
}

function bindHeader() {
  var b = document.getElementById("logout");
  if (b) b.onclick = function () {
    setMentor(null);
    navigate("#/login");
  };
}

function initials(name) {
  return name.split(" ").map(function (n) {
    return n[0];
  }).slice(0, 2).join("").toUpperCase();
}