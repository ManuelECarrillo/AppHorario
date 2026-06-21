// SII connection, schedule import and response parsing.

const siiLog = [];

function logSiiEvent(type, detail) {
  const rawData = detail.data && detail.data.data != null ? detail.data.data : (detail.data || null);
  const dataStr = rawData != null ? String(rawData) : "";
  siiLog.push({
    ts: new Date().toISOString(),
    type,
    url: detail.url || "",
    status: (detail.data && detail.data.status) || detail.status || null,
    dataSize: dataStr.length,
    dataPreview: dataStr.slice(0, 1000),
    error: detail.error ? String(detail.error) : null,
    note: detail.note || ""
  });
  if (siiLog.length > 50) siiLog.shift();
}

async function exportSiiLog() {
  if (!siiLog.length) {
    alert("No hay eventos registrados del SII todavía.");
    return;
  }
  const json = JSON.stringify(siiLog, null, 2);

  const plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppHorarioHttp;
  if (plugin && typeof plugin.saveTextFile === "function") {
    try {
      await plugin.saveTextFile({ text: json, filename: `sii-log-${toDateInput(new Date())}.json` });
      showToast("Log guardado en Descargas.");
      return;
    } catch (e) {
      // fall through to alert
    }
  }

  const preview = json.slice(0, 3000);
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);display:flex;align-items:flex-start;padding:16px;overflow:auto";
  modal.innerHTML = `<div style="background:#1a1a1a;color:#eee;border-radius:8px;padding:12px;font-size:11px;white-space:pre-wrap;word-break:break-all;flex:1;max-height:90vh;overflow:auto"><b>SII Log (copia este texto):</b>\n\n${preview}</div>`;
  modal.addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

function bindSiiLogButton() {
  const btn = document.getElementById("exportSiiLogButton");
  if (btn) btn.addEventListener("click", exportSiiLog);
}
async function loginSii(event) {
  event.preventDefault();

  const control = $("#siiControl").value.trim();
  const password = $("#siiPassword").value.trim();

  if (!control || !password) {
    setSiiLoginMessage("Escribe tu número de control y NIP para continuar.", "error");
    return;
  }

  if (!/^\d{1,4}$/.test(password)) {
    setSiiLoginMessage("El NIP debe ser numérico y de máximo 4 dígitos.", "error");
    return;
  }

  setSiiBusy(true);
  setSiiLoginMessage("Conectando con el SII...", "pending");

  try {
    const accessResponse = await postSiiLogin(control, password);
    let response = accessResponse;
    let importedClasses = parseSiiSchedule(accessResponse.data);

    if (!importedClasses.length && shouldRequestSiiSchedule()) {
      setSiiLoginMessage("Acceso revisado. Buscando el horario del alumno...", "pending");
      response = await postSiiSchedule(control, password);
      importedClasses = parseSiiSchedule(response.data);
    }

    if (importedClasses.length) {
      importSiiClasses(importedClasses);
      $("#siiPassword").value = "";
      closeDialog("siiLoginDialog");
      setSiiLoginMessage("La contraseña solo se usa para conectar con el SII; no se guarda en la app.");
      setSiiStatus(`Horario importado: ${importedClasses.length} clase${importedClasses.length === 1 ? "" : "s"}.`);
      return;
    }

    const responseSummary = describeSiiResponse(response, importedClasses.length);
    if (response && (response.status < 200 || response.status >= 400)) {
      setSiiLoginMessage(`La app llegó al endpoint, pero el servidor respondió con HTTP ${response.status}. ${responseSummary}`, "error");
      setSiiStatus("SII escolar sin conectar.");
      return;
    }

    if (!isSiiLoginSuccessful(accessResponse) && !isSiiLoginSuccessful(response)) {
      setSiiLoginMessage(`No se pudo confirmar el acceso. Revisa número de control y NIP. ${responseSummary}`, "error");
      setSiiStatus("SII escolar sin conectar.");
      return;
    }

    $("#siiPassword").value = "";
    const hadData = response && response.data && String(response.data).trim().length > 100;
    const parseMsg = hadData
      ? "Recibimos respuesta del SII pero no pudimos leer el horario. Es posible que el formato del portal haya cambiado."
      : "Conexión correcta, pero el SII no devolvió clases. Verifica que tu horario esté cargado en el portal.";
    setSiiLoginMessage(`${parseMsg} ${responseSummary}`, hadData ? "error" : "success");
    setSiiStatus(`SII conectado para ${control}.`);
  } catch (error) {
    setSiiLoginMessage(getSiiLoginErrorMessage(error), "error");
    setSiiStatus("SII escolar sin conectar.");
  } finally {
    setSiiBusy(false);
  }
}

async function postSiiLogin(control, password) {
  const url = getSiiApiUrl("access");
  if (!url) {
    throw Object.assign(new Error("Missing SII API URL."), { code: "missing_api_url" });
  }

  return postSiiForm(url, control, password);
}

async function postSiiSchedule(control, password) {
  const url = getSiiApiUrl("schedule");
  if (!url) {
    throw Object.assign(new Error("Missing SII schedule URL."), { code: "missing_schedule_url" });
  }

  return postSiiForm(url, control, password);
}

async function postSiiGrades(control, password) {
  const url = getSiiApiUrl("grades");
  if (!url) {
    throw Object.assign(new Error("Missing SII grades URL."), { code: "missing_grades_url" });
  }

  const variants = getSiiGradeRequestVariants();
  let fallbackResponse = null;
  let needsBrowserSession = false;

  for (const variant of variants) {
    const response = await postSiiForm(url, control, password, variant);
    const grades = parseSiiGrades(response.data);
    if (grades.length) return response;

    if (!fallbackResponse || getResponseSize(response) > getResponseSize(fallbackResponse)) {
      fallbackResponse = response;
    }

    if (shouldLoadSiiResponseWithWebView(response)) {
      needsBrowserSession = true;
      break;
    }
  }

  if (needsBrowserSession || canLoadSiiGradesWithBrowserSession()) {
    const sessionResponse = await postSiiGradesWithWebViewSession(control, password);
    const sessionGrades = parseSiiGrades(sessionResponse.data);
    if (sessionGrades.length) return sessionResponse;

    if (!fallbackResponse || getResponseSize(sessionResponse) > getResponseSize(fallbackResponse)) {
      fallbackResponse = sessionResponse;
    }
  }

  return fallbackResponse;
}

function getSiiGradeRequestVariants() {
  const configuredType = window.AppHorarioHttp && typeof window.AppHorarioHttp.getEnvValue === "function"
    ? window.AppHorarioHttp.getEnvValue("API_TIPO_CALIFICACIONES")
    : "";
  const variants = [
    configuredType ? { tipo: configuredType } : null,
    { tipo: "c" },
    { tipo: "calificaciones" },
    { tipo: "k" },
    { tipo: "p" },
    { tipo: "a", accion: "calificaciones" },
    { tipo: "a", modulo: "calificaciones" },
    { tipo: "a" },
    {}
  ].filter(Boolean);
  const seen = new Set();

  return variants.filter((variant) => {
    const key = JSON.stringify(variant);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getResponseSize(response) {
  if (!response) return 0;
  if (typeof response.data === "string") return response.data.length;
  if (response.data && typeof response.data === "object") return JSON.stringify(response.data).length;
  return 0;
}

async function postSiiForm(url, control, password, extraData = { tipo: "a" }) {
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postForm !== "function") {
    throw Object.assign(new Error("Missing HTTP client."), { code: "missing_http_client" });
  }

  const payload = removeEmptyFormValues({
    tipo: "a",
    ...extraData,
    usuario: control,
    contrasena: password
  });

  let response;
  try {
    response = await window.AppHorarioHttp.postForm(url, payload, {
      headers: {
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    logSiiEvent("postForm:ok", { url, data: response });
  } catch (err) {
    logSiiEvent("postForm:error", { url, error: err });
    throw err;
  }

  return response;
}

async function postSiiFormWithWebView(url, control, password, extraData = { tipo: "a" }) {
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postFormWithWebView !== "function") {
    throw Object.assign(new Error("Missing WebView HTTP client."), { code: "missing_webview_http_client" });
  }

  const payload = removeEmptyFormValues({
    tipo: "a",
    ...extraData,
    usuario: control,
    contrasena: password
  });

  let result;
  try {
    result = await window.AppHorarioHttp.postFormWithWebView(url, payload, {
      readTimeout: 50000,
      settleDelay: 3500
    });
    logSiiEvent("postFormWithWebView:ok", { url, data: result });
  } catch (err) {
    logSiiEvent("postFormWithWebView:error", { url, error: err });
    throw err;
  }
  return result;
}

async function postSiiGradesWithWebViewSession(control, password) {
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postFormThenLoadWithWebView !== "function") {
    throw Object.assign(new Error("Missing WebView HTTP client."), { code: "missing_webview_http_client" });
  }

  const loginUrl = getSiiApiUrl("access") || DEFAULT_SII_LOGIN_URL;
  const gradesUrl = getSiiApiUrl("grades");
  const payload = removeEmptyFormValues({
    tipo: "a",
    usuario: control,
    contrasena: password
  });

  return window.AppHorarioHttp.postFormThenLoadWithWebView(loginUrl, gradesUrl, payload, {
    readTimeout: 65000,
    loginDelay: 4500,
    settleDelay: 5500
  });
}

function shouldLoadSiiResponseWithWebView(response) {
  if (!response || typeof response.data !== "string") return false;
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postFormWithWebView !== "function") return false;

  const text = normalizeTextForSearch(
    response.data
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  return text.includes("javascript")
    || text.includes("habilitelo")
    || text.includes("habilite javascript")
    || text.includes("no tiene javascript");
}

function canLoadSiiGradesWithBrowserSession() {
  return Boolean(window.AppHorarioHttp && typeof window.AppHorarioHttp.postFormThenLoadWithWebView === "function");
}

function normalizeTextForSearch(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function removeEmptyFormValues(values) {
  return Object.entries(values).reduce((cleanValues, [key, value]) => {
    if (value === undefined || value === null || value === "") return cleanValues;
    cleanValues[key] = value;
    return cleanValues;
  }, {});
}

function getSiiApiUrl(kind = "default") {
  if (window.AppHorarioHttp && typeof window.AppHorarioHttp.getApiUrl === "function") {
    return window.AppHorarioHttp.getApiUrl(kind);
  }

  return "";
}

function shouldRequestSiiSchedule() {
  const accessUrl = getSiiApiUrl("access");
  const scheduleUrl = getSiiApiUrl("schedule");
  return Boolean(scheduleUrl && scheduleUrl !== accessUrl);
}

function describeSiiResponse(response, importedCount = 0) {
  const status = response && response.status ? `HTTP ${response.status}` : "sin código HTTP";
  const data = response ? response.data : "";
  const dataKind = Array.isArray(data) ? "lista" : typeof data;
  const dataSize = typeof data === "string"
    ? `${data.length} caracteres`
    : data && typeof data === "object"
      ? `${Object.keys(data).length} campos`
      : "sin datos";

  return `Respuesta ${status}; formato ${dataKind}; ${dataSize}; ${importedCount} clases detectadas.`;
}

function getSiiLoginErrorMessage(error) {
  if (error && error.code === "missing_api_url") {
    return "No encontré la URL de acceso del SII dentro del build. Revisa que esté en .env como API_URL_ACCESO, API_URL_HORARIO o API_URL y vuelve a compilar la app.";
  }

  if (error && error.code === "missing_schedule_url") {
    return "No encontré la URL del horario dentro del build. Revisa que esté en .env como API_URL_HORARIO o API_URL y vuelve a compilar la app.";
  }

  if (error && error.code === "missing_grades_url") {
    return "Todavía no encontré la URL de calificaciones. Agrega API_URL_CALIFICACIONES al .env y vuelve a compilar la app.";
  }

  if (error && error.code === "missing_http_client") {
    return "La app no cargó el cliente HTTP nativo. Vuelve a sincronizar y reinstalar el APK.";
  }

  if (error && error.code === "http_status") {
    return `El servidor respondió con HTTP ${error.status || "desconocido"}. La app sí llegó al endpoint, pero el servidor rechazó la solicitud.`;
  }

  const message = cleanText(error && (error.message || String(error))).toLowerCase();
  if (message.includes("timeout") || message.includes("too long") || message.includes("webviewtimeout")) {
    return "La conexión tardó demasiado. Puede ser internet lento o el servidor del SII/API ocupado.";
  }

  if (message.includes("ssl") || message.includes("trust anchor") || message.includes("certificate") || message.includes("handshake") || message.includes("pkix")) {
    return "Android rechazó el certificado del servidor. La app ya acepta el certificado del SII, pero el endpoint puede estar usando otro certificado.";
  }

  if (message.includes("cleartext") || message.includes("http")) {
    return "Android bloqueó o no pudo abrir la conexión HTTP. Ya habilité compatibilidad con endpoints http://; recompila e instala esta versión.";
  }

  if (message.includes("failed to fetch") || message.includes("cors")) {
    return "El navegador bloqueó la conexión. En el teléfono debe usarse el cliente nativo del APK, no solo la web.";
  }

  const rawMsg = error && (error.message || error.errorMessage) ? (error.message || error.errorMessage) : String(error);
  return `No se pudo conectar con el SII: "${rawMsg}". Toma captura de este mensaje y compártelo para diagnóstico.`;
}

function isSiiLoginSuccessful(response) {
  if (!response || response.status < 200 || response.status >= 400) return false;

  const html = typeof response.data === "string" ? response.data.toLowerCase() : "";
  if (!html) return true;

  const looksLikeLogin = html.includes("name=\"acceso\"")
    || html.includes("name='acceso'")
    || html.includes("autentific")
    || html.includes("no. de control")
    || html.includes("introduce los datos correspondientes");
  const looksRejected = html.includes("incorrect")
    || html.includes("inválid")
    || html.includes("invalid")
    || html.includes("no existe");

  return !looksLikeLogin && !looksRejected;
}

function parseSiiSchedule(data) {
  if (!data) return [];

  if (typeof data !== "string") {
    return normalizeSiiScheduleData(data);
  }

  const trimmed = data.trim();
  if (!trimmed) return [];

  let jsonError = null;
  try {
    return normalizeSiiScheduleData(JSON.parse(trimmed));
  } catch (err) {
    jsonError = err;
  }

  try {
    return parseSiiScheduleHtml(trimmed);
  } catch {
    throw new Error(`No se pudo leer la respuesta del SII (ni JSON ni HTML). ${jsonError && jsonError.message ? jsonError.message : ""}`);
  }
}

function normalizeSiiScheduleData(data) {
  const rows = getScheduleRows(data);
  return rows.map(normalizeSiiScheduleRow).filter(Boolean);
}

function getScheduleRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const candidateKeys = [
    "horario",
    "horarios",
    "schedule",
    "clases",
    "classes",
    "materias",
    "subjects",
    "data",
    "result",
    "rows",
    "items",
    "records"
  ];

  for (const [key, candidate] of Object.entries(data)) {
    if (!candidateKeys.includes(normalizeHeader(key))) continue;
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nestedRows = getScheduleRows(candidate);
      if (nestedRows.length) return nestedRows;
    }
  }

  for (const candidate of Object.values(data)) {
    if (!candidate || typeof candidate !== "object") continue;
    const nestedRows = getScheduleRows(candidate);
    if (nestedRows.length) return nestedRows;
  }

  return [];
}

function normalizeSiiScheduleRow(row, index = 0) {
  if (!row || typeof row !== "object") return null;

  const dayColumnSchedule = getScheduleFromDayColumns(row);
  const range = parseTimeRange(pickFirst(row, ["horario", "hora", "time", "rango", "periodo", "schedule_time"]));
  const rawName = pickFirst(row, [
    "materia",
    "asignatura",
    "nombre",
    "nombre_materia",
    "nombreMateria",
    "materia_nombre",
    "nom_materia",
    "descripcion",
    "name",
    "clase",
    "subject"
  ]);
  const teacher = pickFirst(row, [
    "profesor",
    "profesora",
    "docente",
    "maestro",
    "maestra",
    "catedratico",
    "catedrático",
    "instructor",
    "teacher",
    "nombre_profesor",
    "nombreProfesor",
    "profesor_nombre",
    "nombre_docente",
    "nombreDocente",
    "docente_nombre",
    "nom_docente",
    "empleado"
  ]);
  const parsedName = splitSiiClassNameAndTeacher(rawName, teacher);
  const name = parsedName.name;
  const teacherName = parsedName.teacher || teacher;
  const room = pickFirst(row, [
    "aula",
    "salon",
    "salón",
    "salon_nombre",
    "salón_nombre",
    "nombre_salon",
    "nombre_salón",
    "aula_nombre",
    "nombre_aula",
    "room",
    "classroom",
    "ubicacion",
    "ubicación",
    "edificio",
    "lugar",
    "place"
  ]) || dayColumnSchedule.place || "";
  const start = normalizeTime(pickFirst(row, [
    "inicio",
    "hora_inicio",
    "horaInicio",
    "hora_ini",
    "hora_inicial",
    "start",
    "startTime",
    "entrada",
    "hora1"
  ])) || range.start || dayColumnSchedule.start;
  const end = normalizeTime(pickFirst(row, [
    "fin",
    "hora_fin",
    "horaFin",
    "hora_final",
    "end",
    "endTime",
    "salida",
    "hora2"
  ])) || range.end || dayColumnSchedule.end;
  const days = parseScheduleDays(pickFirst(row, [
    "dias",
    "días",
    "dia",
    "día",
    "days",
    "day",
    "weekday",
    "semana"
  ])).concat(dayColumnSchedule.days);
  const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);

  if (!name || !start || !end || !uniqueDays.length) return null;

  return {
    id: createId(),
    externalId: pickFirst(row, ["id", "clave", "materia_id", "classId", "class_id", "grupo_id"]) || `${slugify(rawName || name)}-${start}-${end}-${uniqueDays.join("")}-${index}`,
    source: SII_CLASS_SOURCE,
    name: String(name).trim(),
    place: formatClassPlace({ room, teacher: teacherName }),
    room: String(room).trim(),
    teacher: String(teacherName).trim(),
    color: pickClassColor(index),
    start,
    end,
    days: uniqueDays,
    notes: [],
    recordings: [],
    photos: []
  };
}

function parseSiiScheduleHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  const rows = [];

  tables.forEach((table) => {
    const headers = Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td"))
      .map((cell) => normalizeHeader(cell.textContent));

    Array.from(table.querySelectorAll("tr")).forEach((tr, rowIndex) => {
      const cells = Array.from(tr.querySelectorAll("td, th")).map((cell) => cleanText(cell.textContent));
      if (cells.length < 3 || rowIndex === 0) return;

      const row = mapScheduleCells(headers, cells);
      const normalized = normalizeSiiScheduleRow(row, rows.length);
      if (normalized) rows.push(normalized);
    });
  });

  return dedupeSiiClasses(rows);
}

function mapScheduleCells(headers, cells) {
  const row = {};
  headers.forEach((header, index) => {
    if (header) row[header] = cells[index] || "";
  });

  if (!Object.keys(row).length) {
    row.materia = cells[0] || "";
    row.dias = cells.find((value) => parseScheduleDays(value).length) || "";
    const timeRange = cells.map(parseTimeRange).find((value) => value.start && value.end);
    const times = cells.map(normalizeTime).filter(Boolean);
    row.inicio = timeRange ? timeRange.start : times[0] || "";
    row.fin = timeRange ? timeRange.end : times[1] || "";
    row.aula = cells[cells.length - 1] || "";
  }

  return row;
}

function importSiiClasses(classes) {
  const previousByExternalId = new Map(
    state.classes
      .filter((item) => item.source === SII_CLASS_SOURCE && item.externalId)
      .map((item) => [item.externalId, item])
  );

  const imported = dedupeSiiClasses(classes).map((item, index) => {
    const previous = previousByExternalId.get(item.externalId);
    const room = item.room || (previous && previous.room) || "";
    const teacher = item.teacher || (previous && previous.teacher) || "";
    return {
      ...item,
      id: previous ? previous.id : item.id,
      color: previous ? previous.color : pickClassColor(index),
      room,
      teacher,
      place: item.place || formatClassPlace({ room, teacher }),
      notes: previous ? previous.notes || [] : [],
      recordings: previous ? previous.recordings || [] : [],
      photos: previous ? previous.photos || [] : []
    };
  });

  state.classes = [
    ...state.classes.filter((item) => item.source !== SII_CLASS_SOURCE),
    ...imported
  ];

  saveState();
  render();
  tick();
  rescheduleNativeNotificationsSoon();
}

function dedupeSiiClasses(classes) {
  const seen = new Set();
  return classes.filter((item) => {
    const key = `${item.name}|${item.start}|${item.end}|${item.days.join(",")}|${item.place}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
