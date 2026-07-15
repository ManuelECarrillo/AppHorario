// Moodle integration — imports upcoming assignments via Moodle REST Web Services API.
// Uses AppHorarioHttp.postForm (same as SII). No WebView needed.

let moodleAssignmentsCache = [];
let moodleDialogSort = "date"; // "date" | "course"

// --- Credentials ---

function loadSavedMoodleCredentials() {
  try {
    const raw = localStorage.getItem(MOODLE_CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveMoodleCredentials(username, password) {
  try {
    localStorage.setItem(MOODLE_CREDS_KEY, JSON.stringify({ username, password }));
  } catch { /* quota exceeded */ }
}

function clearMoodleCredentials() {
  localStorage.removeItem(MOODLE_CREDS_KEY);
}

function fillMoodleForm() {
  const saved = loadSavedMoodleCredentials();
  const usernameEl = $("#moodleUsername");
  const passwordEl = $("#moodlePassword");
  const rememberEl = $("#moodleRemember");
  const clearBtn = $("#moodleClearSaved");

  if (saved && saved.username) {
    if (usernameEl) usernameEl.value = saved.username;
    if (passwordEl) passwordEl.value = saved.password || "";
    if (rememberEl) rememberEl.checked = true;
    if (clearBtn) clearBtn.hidden = false;
  } else {
    if (rememberEl) rememberEl.checked = false;
    if (clearBtn) clearBtn.hidden = true;
  }
}

function bindMoodleClearButton() {
  const btn = $("#moodleClearSaved");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "true";
  btn.addEventListener("click", () => {
    clearMoodleCredentials();
    const u = $("#moodleUsername");
    const p = $("#moodlePassword");
    const r = $("#moodleRemember");
    if (u) u.value = "";
    if (p) p.value = "";
    if (r) r.checked = false;
    btn.hidden = true;
    showToast("Datos de Moodle olvidados.");
  });
}

// --- Dialog init & reset ---

function bindMoodleDialog() {
  const form = $("#moodleForm");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  form.addEventListener("submit", loadMoodleAssignments);

  const importAllBtn = $("#moodleImportAllButton");
  if (importAllBtn) importAllBtn.addEventListener("click", importAllMoodleAssignments);

  const dialog = $("#moodleDialog");
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      const importBtn = e.target.closest("[data-moodle-import]");
      if (importBtn && !importBtn.disabled) importMoodleAssignment(importBtn.dataset.moodleImport);
    });
  }

  $$("[data-moodle-dialog-sort]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => {
      moodleDialogSort = btn.dataset.moodleDialogSort;
      $$("[data-moodle-dialog-sort]").forEach((b) => b.classList.toggle("active", b === btn));
      if (moodleAssignmentsCache.length) renderMoodleAssignments(moodleAssignmentsCache);
    });
  });

  bindMoodleClearButton();
}

function resetMoodleDialog() {
  moodleAssignmentsCache = [];
  setMoodleResultsVisible(false);
  const d = $("#moodleDialog");
  if (d) d.classList.remove("moodle-loaded");
  setMoodleMessage("Inicia sesión con tu correo institucional de Moodle.", "");
  setMoodleBusy(false);
  const list = $("#moodleAssignmentsList");
  if (list) list.innerHTML = "";
  fillMoodleForm();
  bindMoodleClearButton();
}

// --- UI helpers ---

function setMoodleMessage(msg, tone = "") {
  const el = $("#moodleMessage");
  if (!el) return;
  el.textContent = msg;
  el.dataset.tone = tone;
}

function setMoodleBusy(isBusy) {
  const btn = $("#moodleSubmitButton");
  if (btn) btn.disabled = isBusy;
}

function setMoodleResultsVisible(visible) {
  const s = $("#moodleResultsSection");
  if (s) s.hidden = !visible;
  const d = $("#moodleDialog");
  if (d) d.classList.toggle("moodle-loaded", Boolean(visible));
}

// --- Main handler ---

async function loadMoodleAssignments(event) {
  event.preventDefault();
  const username = ($("#moodleUsername").value || "").trim();
  const password = ($("#moodlePassword").value || "").trim();

  if (!username || !password) {
    setMoodleMessage("Escribe tu correo y contraseña institucional.", "error");
    return;
  }

  if ($("#moodleRemember") && $("#moodleRemember").checked) {
    saveMoodleCredentials(username, password);
    const clearBtn = $("#moodleClearSaved");
    if (clearBtn) clearBtn.hidden = false;
  } else {
    clearMoodleCredentials();
    const clearBtn = $("#moodleClearSaved");
    if (clearBtn) clearBtn.hidden = true;
  }

  setMoodleBusy(true);
  setMoodleResultsVisible(false);
  setMoodleMessage("Autenticando con Moodle...", "pending");

  try {
    const token = await fetchMoodleToken(username, password);
    setMoodleMessage("Obteniendo tareas...", "pending");
    const assignments = await fetchMoodleUpcoming(token);

    if (!assignments.length) {
      setMoodleMessage("No encontré tareas con fecha de entrega en tus cursos de Moodle.", "");
      return;
    }

    const overdueCount = assignments.filter((a) => a.overdue).length;
    const upcomingCount = assignments.length - overdueCount;
    let summary = `${assignments.length} tarea${assignments.length !== 1 ? "s" : ""} encontrada${assignments.length !== 1 ? "s" : ""}`;
    if (overdueCount > 0 && upcomingCount > 0)
      summary += ` (${overdueCount} atrasada${overdueCount !== 1 ? "s" : ""}, ${upcomingCount} próxima${upcomingCount !== 1 ? "s" : ""})`;
    else if (overdueCount > 0)
      summary += ` — todas atrasadas`;
    setMoodleMessage(summary, overdueCount > 0 ? "error" : "success");
    renderMoodleAssignments(assignments);
    setMoodleResultsVisible(true);
  } catch (error) {
    logSiiEvent("moodle:error", { url: MOODLE_LOGIN_URL, error });
    setMoodleMessage(getMoodleLoginErrorMessage(error), "error");
  } finally {
    setMoodleBusy(false);
  }
}

// --- REST API calls ---

async function fetchMoodleToken(username, password) {
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postForm !== "function") {
    throw Object.assign(new Error("Cliente HTTP nativo no disponible."), { code: "missing_http_client" });
  }

  const resp = await window.AppHorarioHttp.postForm(
    "https://plataforma.itdurango.edu.mx/login/token.php",
    { username, password, service: "moodle_mobile_app" },
    { readTimeout: 20000 }
  );

  let data;
  try { data = JSON.parse(resp.data); }
  catch {
    throw Object.assign(
      new Error("Respuesta inesperada del servidor. El servicio de Moodle puede no estar disponible."),
      { code: "bad_json", raw: String(resp.data).slice(0, 200) }
    );
  }

  if (data.errorcode === "invalidlogin") {
    throw Object.assign(new Error("Correo o contraseña incorrectos."), { code: "invalidlogin" });
  }
  if (data.errorcode === "servicenotavailable" || (!data.token && data.errorcode)) {
    throw Object.assign(
      new Error(data.error || "El servicio web móvil de Moodle no está habilitado."),
      { code: "servicenotavailable", raw: JSON.stringify(data).slice(0, 300) }
    );
  }
  if (!data.token) {
    throw Object.assign(
      new Error(data.error || "No se recibió token de autenticación."),
      { code: "no_token", raw: JSON.stringify(data).slice(0, 200) }
    );
  }

  logSiiEvent("moodle:tokenOk", { url: MOODLE_LOGIN_URL });
  return data.token;
}

async function fetchMoodleUpcoming(token) {
  const resp = await window.AppHorarioHttp.postForm(
    "https://plataforma.itdurango.edu.mx/webservice/rest/server.php",
    { wstoken: token, wsfunction: "mod_assign_get_assignments", moodlewsrestformat: "json" },
    { readTimeout: 30000 }
  );

  let data;
  try { data = JSON.parse(resp.data); }
  catch {
    throw Object.assign(
      new Error("La respuesta de tareas no es JSON válido."),
      { code: "bad_json", raw: String(resp.data).slice(0, 200) }
    );
  }

  if (data.exception || data.errorcode) {
    throw Object.assign(
      new Error(data.message || data.error || "Error al leer las tareas de Moodle."),
      { code: data.errorcode || "api_error" }
    );
  }

  logSiiEvent("moodle:assignmentsOk", { url: MOODLE_UPCOMING_URL });
  return parseMoodleAssignments(data);
}

// --- API response parsing ---

function parseMoodleAssignments(data) {
  if (!data || !Array.isArray(data.courses)) return [];
  const now = Math.floor(Date.now() / 1000);
  const results = [];

  for (const course of data.courses) {
    if (!Array.isArray(course.assignments)) continue;
    for (const a of course.assignments) {
      if (!a.duedate) continue;
      const { date, time } = moodleTimestampToLocal(a.duedate);
      results.push({
        title: cleanText(a.name || "Sin título").slice(0, 70),
        course: cleanText(course.fullname || ""),
        date,
        time,
        externalId: `moodle_assign_${a.cmid || a.id}`,
        overdue: a.duedate < now
      });
    }
  }

  return results.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.time || "") < (b.time || "") ? -1 : 1;
  });
}

function moodleTimestampToLocal(ts) {
  if (!ts) return { date: "", time: "23:59" };
  const d = new Date(ts * 1000);
  const date = toDateInput(d);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return { date, time: `${h}:${m}` };
}

// --- Rendering ---

function renderMoodleAssignments(assignments) {
  moodleAssignmentsCache = assignments;
  const container = $("#moodleAssignmentsList");
  if (!container) return;

  const imported = new Set(
    state.tasks
      .filter((t) => t.source === MOODLE_TASK_SOURCE && t.externalId)
      .map((t) => t.externalId)
  );

  const now = Math.floor(Date.now() / 1000);
  const soon48 = now + 48 * 3600;

  function buildCard(a) {
    const done = imported.has(a.externalId);
    const cardClass = a.overdue ? "is-overdue" : "";
    const dateClass = a.overdue ? "assign-date overdue-label" : "assign-date assign-meta";
    const dateText = a.overdue
      ? `ATRASADA · ${escapeHtml(a.date)}`
      : `Entrega: ${escapeHtml(a.date)} ${escapeHtml(a.time || "23:59")}`;
    return `
      <article class="moodle-assign-card ${cardClass}">
        <p class="assign-title">${escapeHtml(a.title)}</p>
        ${a.course ? `<p class="assign-meta">${escapeHtml(a.course)}</p>` : ""}
        <p class="${dateClass}">${dateText}</p>
        <button class="primary-button small assign-import" type="button"
                data-moodle-import="${escapeHtml(a.externalId)}"
                ${done ? "disabled" : ""}>
          ${done ? "✓ Importada" : "Importar"}
        </button>
      </article>`;
  }

  if (moodleDialogSort === "course") {
    const byGroup = {};
    assignments.forEach((a) => {
      const key = a.course || "Sin materia";
      (byGroup[key] = byGroup[key] || []).push(a);
    });
    container.innerHTML = Object.keys(byGroup).sort().map((course) => `
      <button class="moodle-section-header" type="button"
              onclick="this.nextElementSibling.classList.toggle('collapsed')">
        ${escapeHtml(course)} (${byGroup[course].length})
        <span class="section-toggle">▼</span>
      </button>
      <div class="moodle-section-body">
        ${byGroup[course].map(buildCard).join("")}
      </div>`).join("");
  } else {
    const overdue = assignments.filter((a) => a.overdue);
    const upcoming = assignments.filter((a) => !a.overdue);
    let html = "";
    if (overdue.length) {
      html += `
        <button class="moodle-section-header is-overdue" type="button"
                onclick="this.nextElementSibling.classList.toggle('collapsed')">
          ⚠ Atrasadas (${overdue.length})
          <span class="section-toggle">▼</span>
        </button>
        <div class="moodle-section-body">
          ${overdue.map(buildCard).join("")}
        </div>`;
    }
    if (upcoming.length) {
      html += `
        <button class="moodle-section-header" type="button"
                onclick="this.nextElementSibling.classList.toggle('collapsed')">
          Próximas (${upcoming.length})
          <span class="section-toggle">▼</span>
        </button>
        <div class="moodle-section-body">
          ${upcoming.map(buildCard).join("")}
        </div>`;
    }
    container.innerHTML = html;
  }

  if (typeof renderIcons === "function") renderIcons();
}

// --- Import ---

function buildMoodleTask(assignment) {
  const dueDate = assignment.date;
  const dueTime = assignment.time || "23:59";
  return {
    id: createId(),
    title: cleanText(assignment.title).slice(0, 70),
    classId: findMatchingMoodleClass(assignment.course),
    date: dueDate,
    dueTime,
    reminderTime: "08:00",
    time: "08:00",
    priority: "normal",
    repeat: "none",
    details: cleanText(assignment.course || "").slice(0, 240),
    done: false,
    completedDates: [],
    source: MOODLE_TASK_SOURCE,
    externalId: assignment.externalId
  };
}

function findMatchingMoodleClass(courseName) {
  if (!courseName || !state.classes || !state.classes.length) return "";
  const normalized = normalizeHeader(courseName);
  const exact = state.classes.find((c) => normalizeHeader(c.name) === normalized);
  if (exact) return exact.id;
  const partial = state.classes.find((c) => {
    const cn = normalizeHeader(c.name);
    return cn.length >= 4 && (normalized.includes(cn) || cn.includes(normalized));
  });
  return partial ? partial.id : "";
}

function importMoodleAssignment(externalId) {
  const assignment = moodleAssignmentsCache.find((a) => a.externalId === externalId);
  if (!assignment) return;

  const duplicate = state.tasks.find(
    (t) => t.source === MOODLE_TASK_SOURCE && t.externalId === externalId
  );
  if (duplicate) {
    showToast("Esta tarea ya fue importada.");
    return;
  }

  const task = buildMoodleTask(assignment);
  state.tasks = [...state.tasks, task];
  saveState();
  render();
  rescheduleNativeNotificationsSoon();
  if (typeof renderMoodleImportedTasks === "function") renderMoodleImportedTasks();
  showToast(`"${task.title.slice(0, 30)}" importada con recordatorio.`);

  const btn = document.querySelector(`[data-moodle-import="${CSS.escape(externalId)}"]`);
  if (btn) {
    btn.textContent = "Importada";
    btn.disabled = true;
  }
}

function importAllMoodleAssignments() {
  let imported = 0;
  let skipped = 0;

  moodleAssignmentsCache.forEach((assignment) => {
    const duplicate = state.tasks.find(
      (t) => t.source === MOODLE_TASK_SOURCE && t.externalId === assignment.externalId
    );
    if (duplicate) { skipped++; return; }
    state.tasks = [...state.tasks, buildMoodleTask(assignment)];
    imported++;
  });

  if (imported) {
    saveState();
    render();
    rescheduleNativeNotificationsSoon();
  }

  const msg = imported
    ? `${imported} tarea${imported !== 1 ? "s" : ""} importada${imported !== 1 ? "s" : ""}${skipped ? `, ${skipped} ya existente${skipped !== 1 ? "s" : ""}` : ""}.`
    : "Todas las tareas ya estaban importadas.";
  showToast(msg);

  $$("[data-moodle-import]").forEach((btn) => {
    btn.textContent = "Importada";
    btn.disabled = true;
  });
  const allBtn = $("#moodleImportAllButton");
  if (allBtn) allBtn.disabled = true;
}

// --- Error messages ---

function getMoodleLoginErrorMessage(error) {
  if (!error) return "Error desconocido al conectar con Moodle.";
  const code = error.code || "";

  if (code === "missing_http_client") return "La app no cargó el cliente HTTP nativo. Reinstala el APK.";
  if (code === "invalidlogin") return error.message;
  if (code === "servicenotavailable") {
    const detail = error.raw ? `\n\nDetalle técnico: ${error.raw.slice(0, 150)}` : "";
    return `El servicio web de Moodle no está habilitado. Contacta al admin del Tec para que active "Moodle mobile web service".${detail}`;
  }
  if (code === "bad_json") {
    const raw = error.raw ? `\n\nRespuesta recibida:\n${error.raw}` : "";
    return `El servidor de Moodle respondió de forma inesperada. Intenta de nuevo.${raw}`;
  }
  if (code === "no_token") {
    const raw = error.raw ? `\n\nDetalle: ${error.raw}` : "";
    return `Moodle no envió token de acceso.${raw}`;
  }

  const msg = cleanText((error.message || error.errorMessage || String(error))).toLowerCase();
  if (msg.includes("timeout") || msg.includes("too long")) {
    return "La conexión tardó demasiado. Revisa tu internet e intenta de nuevo.";
  }
  if (msg.includes("ssl") || msg.includes("certificate") || msg.includes("pkix") || msg.includes("handshake")) {
    return "Error de certificado SSL con Moodle. Actualiza la app.";
  }
  if (msg.includes("cleartext") || msg.includes("blocked")) {
    return "Android bloqueó la conexión. Verifica la configuración de red de la app.";
  }

  return `Error al conectar con Moodle: "${error.message || error}".`;
}
