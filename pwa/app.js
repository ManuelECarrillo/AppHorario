const STORAGE_KEY = "appHorario.state.v1";
const AUDIO_DB_NAME = "appHorario.audio.v1";
const AUDIO_STORE_NAME = "recordings";
const DEFAULT_SII_LOGIN_URL = "https://siit.itdurango.edu.mx/sistema/acceso.php";
const SII_CLASS_SOURCE = "sii";
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_CLASS_COLOR = "#216869";
const PRIORITY_LABELS = {
  high: "Urgente",
  normal: "Normal",
  low: "Baja"
};
const PRIORITY_ORDER = {
  high: 0,
  normal: 1,
  low: 2
};
const REPEAT_LABELS = {
  none: "Una vez",
  daily: "Diario",
  weekly: "Semanal"
};
const NOTIFICATION_SOUNDS = {
  chime: {
    channelId: "apphorario_chime",
    name: "AppHorario - Campana suave",
    sound: "apphorario_chime.wav",
    vibration: true
  },
  focus: {
    channelId: "apphorario_focus",
    name: "AppHorario - Pulso de estudio",
    sound: "apphorario_focus.wav",
    vibration: true
  },
  digital: {
    channelId: "apphorario_digital",
    name: "AppHorario - Digital claro",
    sound: "apphorario_digital.wav",
    vibration: true
  },
  silent: {
    channelId: "apphorario_silent",
    name: "AppHorario - Solo vibracion",
    sound: "",
    vibration: true
  }
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ICON_PATHS = {
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  "calendar-days": '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  "calendar-range": '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M17 14h-6"/><path d="M13 18H7"/>',
  "graduation-cap": '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
  "book-open": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3V7a3 3 0 0 0-3-3H4a1 1 0 0 0-1 1z"/><path d="M21 18a1 1 0 0 0-1-1h-5a3 3 0 0 0-3 3V7a3 3 0 0 1 3-3h5a1 1 0 0 1 1 1z"/>',
  "check-square": '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  "settings-2": '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  pencil: '<path d="M21.17 6.83 17.17 2.83 3 17v4h4z"/><path d="m15 5 4 4"/>',
  "trash-2": '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  "panel-right-open": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="m10 9 3 3-3 3"/>',
  "check-check": '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  square: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  play: '<path d="M5 5v14l14-7z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'
};

const defaultState = {
  settings: {
    appTitle: "AppHorario",
    themeMode: "light",
    primaryColor: "#216869",
    accentColor: "#c7503d",
    backgroundColor: "#f5f7fb",
    todayViewMode: "full",
    weekViewMode: "full",
    taskPromptMinutes: 10,
    classStartMinutes: 5,
    notificationSound: "chime",
    taskPromptEnabled: true,
    classStartEnabled: true
  },
  classes: [],
  tasks: [],
  exams: [],
  notified: {}
};

let state = loadState();
let dynamicActionsBound = false;
let deferredInstallPrompt = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingClassId = "";
let recordingStartedAt = "";
let recordingStream = null;
let nativeNotificationChannelsReady = new Set();
let notificationRescheduleTimer = null;
let dialogHistoryDepth = 0;
let closingDialogFromHistory = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  appTitle: $("#appTitle"),
  currentTime: $("#currentTime"),
  classStatusLabel: $("#classStatusLabel"),
  nextClassText: $("#nextClassText"),
  smartPanel: $("#smartPanel"),
  todaySchedule: $("#todaySchedule"),
  todayViewButton: $("#todayViewButton"),
  weekHeading: $("#weekHeading"),
  weekSchedule: $("#weekSchedule"),
  weekViewButton: $("#weekViewButton"),
  classList: $("#classList"),
  taskList: $("#taskList"),
  examList: $("#examList"),
  taskClass: $("#taskClass"),
  examClass: $("#examClass"),
  classDetailMeta: $("#classDetailMeta"),
  classDetailTasks: $("#classDetailTasks"),
  classDetailExams: $("#classDetailExams"),
  audioHistory: $("#audioHistory"),
  recordAudioButton: $("#recordAudioButton"),
  stopAudioButton: $("#stopAudioButton"),
  recordingStatus: $("#recordingStatus"),
  notifyButton: $("#notifyButton"),
  testNotificationButton: $("#testNotificationButton"),
  siiStatus: $("#siiStatus"),
  siiLoginMessage: $("#siiLoginMessage"),
  siiSubmitButton: $("#siiSubmitButton"),
  installButton: $("#installButton"),
  exportButton: $("#exportButton"),
  importFile: $("#importFile"),
  installHint: $("#installHint"),
  settings: {
    appTitle: $("#appTitleInput"),
    themeMode: $("#themeMode"),
    primaryColor: $("#primaryColor"),
    accentColor: $("#accentColor"),
    backgroundColor: $("#backgroundColor"),
    taskPromptMinutes: $("#taskPromptMinutes"),
    classStartMinutes: $("#classStartMinutes"),
    notificationSound: $("#notificationSound"),
    taskPromptEnabled: $("#taskPromptEnabled"),
    classStartEnabled: $("#classStartEnabled")
  }
};

document.addEventListener("DOMContentLoaded", init);

window.addEventListener("error", (event) => {
  showStartupError(event.message || "Error inesperado al iniciar.");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason && event.reason.message ? event.reason.message : "Error inesperado al iniciar.";
  showStartupError(reason);
});

function init() {
  render();
  tick();
  setInterval(tick, 30_000);
  renderIcons();

  safeRun(bindTabs);
  safeRun(bindViewControls);
  safeRun(bindDialogs);
  safeRun(bindForms);
  safeRun(bindSettings);
  safeRun(bindNotifications);
  safeRun(bindNativeBackButton);
  safeRun(bindInstall);
  safeRun(bindBackup);
  safeRun(registerServiceWorker);
  safeRun(() => {
    const colorSchemeQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    if (colorSchemeQuery && typeof colorSchemeQuery.addEventListener === "function") {
      colorSchemeQuery.addEventListener("change", renderTheme);
    }
  });
  safeRun(handleQuickTaskFromUrl);
}

function showStartupError(message) {
  const schedule = document.querySelector("#todaySchedule");
  if (!schedule || schedule.dataset.hasStartupError) return;

  schedule.dataset.hasStartupError = "true";
  schedule.innerHTML = `<div class="empty-state">Error de inicio: ${escapeHtml(message)}</div>`;
}

function safeRun(callback) {
  try {
    const result = callback();
    if (result && typeof result.catch === "function") result.catch(() => undefined);
  } catch {
    // Keep the app usable even if one native/browser capability fails.
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return normalizeState({
      ...defaultState,
      ...parsed,
      settings: { ...defaultState.settings, ...parsed.settings },
      classes: parsed.classes || defaultState.classes,
      tasks: parsed.tasks || defaultState.tasks,
      exams: parsed.exams || defaultState.exams,
      notified: parsed.notified || {}
    });
  } catch {
    return normalizeState(defaultState);
  }
}

function normalizeState(nextState) {
  return {
    ...nextState,
    classes: nextState.classes.map((item, index) => ({
      ...item,
      color: item.color || ["#216869", "#c7503d", "#c7972b", "#3563a9"][index % 4],
      notes: item.notes || [],
      recordings: item.recordings || []
    })),
    tasks: nextState.tasks.map((task) => ({
      ...task,
      priority: task.priority || "normal",
      repeat: task.repeat || "none",
      completedDates: task.completedDates || []
    })),
    exams: (nextState.exams || []).map((exam) => ({
      ...exam,
      reminderDays: exam.reminderDays || [7, 3, 1],
      taskIds: exam.taskIds || []
    })),
    nativeNotificationIds: nextState.nativeNotificationIds || []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindTabs() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      $$(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${tab}Panel`));
    });
  });
}

function bindViewControls() {
  if (elements.todayViewButton) {
    elements.todayViewButton.addEventListener("click", () => {
      state.settings.todayViewMode = getTodayViewMode() === "full" ? "pending" : "full";
      saveState();
      renderTodaySchedule();
      renderViewControls();
    });
  }

  if (elements.weekViewButton) {
    elements.weekViewButton.addEventListener("click", () => {
      state.settings.weekViewMode = getWeekViewMode() === "full" ? "upcoming" : "full";
      saveState();
      renderWeekSchedule();
      renderViewControls();
    });
  }
}

function bindDialogs() {
  $$("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.openDialog === "classDialog") resetClassForm();
      if (button.dataset.openDialog === "taskDialog") resetTaskForm();
      if (button.dataset.openDialog === "examDialog") resetExamForm();
      openDialog(button.dataset.openDialog);
    });
  });

  $$("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
  });

  $$(".dialog").forEach((dialog) => {
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog.id);
    });
  });

  window.addEventListener("popstate", () => {
    const dialog = getTopOpenDialog();
    if (!dialog) return;

    closingDialogFromHistory = true;
    dialog.close();
    dialogHistoryDepth = Math.max(0, dialogHistoryDepth - 1);
    updateDialogLock();
    setTimeout(() => {
      closingDialogFromHistory = false;
    }, 0);
  });
}

function openDialog(id, options = {}) {
  const dialog = $(`#${id}`);
  if (!dialog || dialog.open) return;

  dialog.showModal();
  if (!isNativeRuntime()) {
    if (options.replaceHistory) {
      window.history.replaceState({ dialog: id }, "", window.location.href);
    } else {
      dialogHistoryDepth += 1;
      window.history.pushState({ dialog: id }, "", window.location.href);
    }
  }
  updateDialogLock();
}

function closeDialog(id, options = {}) {
  const dialog = $(`#${id}`);
  if (!dialog || !dialog.open) return;

  dialog.close();
  updateDialogLock();

  if (!isNativeRuntime() && !options.keepHistory && !closingDialogFromHistory && dialogHistoryDepth > 0) {
    dialogHistoryDepth -= 1;
    window.history.back();
  }
}

function replaceDialog(currentId, nextId, beforeOpen) {
  closeDialog(currentId, { keepHistory: true });
  if (typeof beforeOpen === "function") beforeOpen();
  openDialog(nextId, { replaceHistory: true });
}

function getTopOpenDialog() {
  const dialogs = $$(".dialog").filter((dialog) => dialog.open);
  return dialogs[dialogs.length - 1] || null;
}

function updateDialogLock() {
  document.body.classList.toggle("modal-open", Boolean(getTopOpenDialog()));
}

function bindNativeBackButton() {
  const appPlugin = getAppPlugin();
  if (!appPlugin || typeof appPlugin.addListener !== "function") return;

  const listener = appPlugin.addListener("backButton", (event) => {
    const dialog = getTopOpenDialog();
    if (dialog) {
      closeDialog(dialog.id, { keepHistory: true });
      return;
    }

    if (event && event.canGoBack) {
      window.history.back();
      return;
    }

    if (typeof appPlugin.exitApp === "function") {
      appPlugin.exitApp();
    }
  });

  if (listener && typeof listener.catch === "function") listener.catch(() => undefined);

  const stateListener = appPlugin.addListener("appStateChange", (event) => {
    if (!event || !event.isActive) return;
    rescheduleNativeNotificationsSoon();
    updateNotificationButton();
  });

  if (stateListener && typeof stateListener.catch === "function") stateListener.catch(() => undefined);
}

function bindForms() {
  $("#classForm").addEventListener("submit", saveClass);
  $("#taskForm").addEventListener("submit", saveTask);
  $("#examForm").addEventListener("submit", saveExam);
  $("#noteForm").addEventListener("submit", saveNote);
  $("#siiLoginForm").addEventListener("submit", loginSii);
  $("#detailAddTask").addEventListener("click", addTaskFromDetail);
  $("#detailAddExam").addEventListener("click", addExamFromDetail);
  $("#detailEditClass").addEventListener("click", editClassFromDetail);
  elements.recordAudioButton.addEventListener("click", startAudioRecording);
  elements.stopAudioButton.addEventListener("click", stopAudioRecording);
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
    setSiiLoginMessage(`Conexión correcta, pero todavía no encontré clases en la respuesta. ${responseSummary}`, "success");
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

async function postSiiForm(url, control, password) {
  if (!window.AppHorarioHttp || typeof window.AppHorarioHttp.postForm !== "function") {
    throw Object.assign(new Error("Missing HTTP client."), { code: "missing_http_client" });
  }

  const response = await window.AppHorarioHttp.postForm(url, {
    tipo: "a",
    usuario: control,
    contrasena: password
  }, {
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  return response;
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

  if (error && error.code === "missing_http_client") {
    return "La app no cargó el cliente HTTP nativo. Vuelve a sincronizar y reinstalar el APK.";
  }

  if (error && error.code === "http_status") {
    return `El servidor respondió con HTTP ${error.status || "desconocido"}. La app sí llegó al endpoint, pero el servidor rechazó la solicitud.`;
  }

  const message = cleanText(error && (error.message || String(error))).toLowerCase();
  if (message.includes("timeout")) {
    return "La conexión tardó demasiado. Puede ser internet lento o el servidor del SII/API ocupado.";
  }

  if (message.includes("ssl") || message.includes("trust anchor") || message.includes("certificate")) {
    return "Android rechazó el certificado del servidor. La app ya acepta el certificado del SII, pero el endpoint puede estar usando otro certificado.";
  }

  if (message.includes("cleartext") || message.includes("http")) {
    return "Android bloqueó o no pudo abrir la conexión HTTP. Ya habilité compatibilidad con endpoints http://; recompila e instala esta versión.";
  }

  if (message.includes("failed to fetch") || message.includes("cors")) {
    return "El navegador bloqueó la conexión. En el teléfono debe usarse el cliente nativo del APK, no solo la web.";
  }

  return "No se pudo conectar con el SII. Revisa internet, confirma que el endpoint del .env esté activo e intenta otra vez.";
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

  try {
    return normalizeSiiScheduleData(JSON.parse(trimmed));
  } catch {
    return parseSiiScheduleHtml(trimmed);
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
    recordings: []
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
    return {
      ...item,
      id: previous ? previous.id : item.id,
      color: previous ? previous.color : pickClassColor(index),
      notes: previous ? previous.notes || [] : [],
      recordings: previous ? previous.recordings || [] : []
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

function pickFirst(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== "") {
      return source[key];
    }
  }

  const normalizedSource = Object.entries(source).reduce((values, [key, value]) => {
    values[normalizeHeader(key)] = value;
    return values;
  }, {});

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    if (normalizedSource[normalizedKey] !== undefined && normalizedSource[normalizedKey] !== null && String(normalizedSource[normalizedKey]).trim() !== "") {
      return normalizedSource[normalizedKey];
    }
  }

  return "";
}

function normalizeHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitSiiClassNameAndTeacher(value, knownTeacher = "") {
  const originalName = cleanText(value);
  let name = originalName;
  let teacher = cleanText(knownTeacher).replace(/^prof\.?\s*/i, "");

  if (!name) {
    return { name: "", teacher };
  }

  if (teacher) {
    const teacherPattern = escapeRegExp(teacher).replace(/\s+/g, "\\s+");
    const withoutTeacher = cleanText(name
      .replace(new RegExp(`(?:[\\s·|,;:/\\-–—]+)?(?:prof(?:esor|esora)?\\.?|docente|maestr[oa]|catedr[aá]tico|instructor)?\\s*:?\\s*${teacherPattern}`, "i"), "")
      .replace(/[·|,;:/\-–—]+$/g, ""));

    if (withoutTeacher && withoutTeacher.length >= 3) {
      name = withoutTeacher;
    }
  }

  const labeledTeacher = name.match(/(?:^|[\s·|,;:/\-–—]+)(?:prof(?:esor|esora)?\.?|docente|maestr[oa]|catedr[aá]tico|instructor)\s*:?\s+(.+)$/i);
  if (labeledTeacher) {
    const beforeLabel = cleanText(name
      .slice(0, labeledTeacher.index)
      .replace(/[·|,;:/\-–—]+$/g, ""));
    const teacherCandidate = cleanTeacherName(labeledTeacher[1]);

    if (beforeLabel && teacherCandidate) {
      name = beforeLabel;
      teacher = teacher || teacherCandidate;
    }
  }

  return {
    name: cleanText(name) || originalName,
    teacher
  };
}

function cleanTeacherName(value) {
  const text = cleanText(value)
    .replace(/\b(?:aula|sal[oó]n|salon|room|classroom|grupo|edificio|horario)\b.*$/i, "")
    .replace(/[·|,;:/\-–—]+$/g, "")
    .trim();

  return text.length >= 3 ? text : "";
}

function normalizeTime(value) {
  const text = cleanText(value);
  const match = text.match(/(\d{1,2}):?(\d{2})/);
  if (!match) return "";

  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeRange(value) {
  const text = cleanText(value);
  const matches = Array.from(text.matchAll(/(\d{1,2}):?(\d{2})/g));
  if (matches.length < 2) return { start: "", end: "" };

  return {
    start: normalizeTime(matches[0][0]),
    end: normalizeTime(matches[1][0])
  };
}

function getScheduleFromDayColumns(row) {
  const schedule = { days: [], start: "", end: "", place: "" };
  const dayColumns = [
    { day: 0, keys: ["domingo", "dom", "sunday", "sun"] },
    { day: 1, keys: ["lunes", "lun", "monday", "mon", "l"] },
    { day: 2, keys: ["martes", "mar", "tuesday", "tue", "m"] },
    { day: 3, keys: ["miercoles", "mie", "wednesday", "wed", "x"] },
    { day: 4, keys: ["jueves", "jue", "thursday", "thu", "j"] },
    { day: 5, keys: ["viernes", "vie", "friday", "fri", "v"] },
    { day: 6, keys: ["sabado", "sab", "saturday", "sat", "s"] }
  ];

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    const column = dayColumns.find((item) => item.keys.includes(normalizedKey));
    if (!column || !isActiveScheduleCell(value)) return;

    schedule.days.push(column.day);
    const range = parseTimeRange(value);
    if (!schedule.start && range.start) schedule.start = range.start;
    if (!schedule.end && range.end) schedule.end = range.end;
    if (!schedule.place) schedule.place = extractPlaceFromScheduleCell(value);
  });

  schedule.days = Array.from(new Set(schedule.days)).sort((a, b) => a - b);
  return schedule;
}

function extractPlaceFromScheduleCell(value) {
  const text = cleanText(value);
  if (!text) return "";

  const withoutTimes = text
    .replace(/\d{1,2}:?\d{2}\s*(?:-|a|A|–|—|\/)?\s*/g, " ")
    .replace(/\bhrs?\.?\b/gi, " ")
    .replace(/\bhoras?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutTimes || parseScheduleDays(withoutTimes).length) return "";
  if (/^(si|yes|true|x)$/i.test(withoutTimes)) return "";

  return withoutTimes;
}

function formatClassPlace({ room = "", teacher = "" } = {}) {
  const parts = [
    room ? String(room).trim() : "",
    teacher ? `Prof. ${String(teacher).trim().replace(/^prof\.?\s*/i, "")}` : ""
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(" · ");
}

function isActiveScheduleCell(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;

  const text = cleanText(value).toLowerCase();
  if (!text) return false;

  return !["0", "no", "false", "-", "n/a", "na", "null"].includes(text);
}

function parseScheduleDays(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap(parseScheduleDays))).sort((a, b) => a - b);
  }

  const text = cleanText(value).toLowerCase();
  if (!text) return [];

  const dayMap = [
    ["domingo", "dom", "sunday", "sun"],
    ["lunes", "lun", "monday", "mon", "l"],
    ["martes", "mar", "tuesday", "tue", "m"],
    ["miercoles", "miércoles", "mie", "mié", "wednesday", "wed", "x"],
    ["jueves", "jue", "thursday", "thu", "j"],
    ["viernes", "vie", "friday", "fri", "v"],
    ["sabado", "sábado", "sab", "sáb", "saturday", "sat", "s"]
  ];
  const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const days = new Set();

  dayMap.forEach((names, day) => {
    if (names.some((name) => new RegExp(`(^|[^a-z])${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}([^a-z]|$)`).test(normalizedText))) {
      days.add(day);
    }
  });

  if (/lunes\s*a\s*viernes|lun\s*a\s*vie|l-v|lv/.test(normalizedText)) {
    [1, 2, 3, 4, 5].forEach((day) => days.add(day));
  }

  return Array.from(days).sort((a, b) => a - b);
}

function pickClassColor(index) {
  const colors = ["#216869", "#c7503d", "#c7972b", "#3563a9", "#7a4f9f", "#0f766e", "#db2777", "#65a30d"];
  return colors[index % colors.length];
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setSiiBusy(isBusy) {
  if (elements.siiSubmitButton) elements.siiSubmitButton.disabled = isBusy;
}

function setSiiLoginMessage(message, tone = "") {
  if (!elements.siiLoginMessage) return;
  elements.siiLoginMessage.textContent = message;
  elements.siiLoginMessage.dataset.tone = tone;
}

function setSiiStatus(message) {
  if (elements.siiStatus) elements.siiStatus.textContent = message;
}

function bindSettings() {
  const settings = elements.settings;
  settings.appTitle.value = state.settings.appTitle;
  settings.themeMode.value = state.settings.themeMode;
  settings.primaryColor.value = state.settings.primaryColor;
  settings.accentColor.value = state.settings.accentColor;
  settings.backgroundColor.value = state.settings.backgroundColor;
  settings.taskPromptMinutes.value = state.settings.taskPromptMinutes;
  settings.classStartMinutes.value = state.settings.classStartMinutes;
  settings.notificationSound.value = getNotificationSoundKey();
  settings.taskPromptEnabled.checked = state.settings.taskPromptEnabled;
  settings.classStartEnabled.checked = state.settings.classStartEnabled;

  Object.entries(settings).forEach(([key, input]) => {
    input.addEventListener("input", () => {
      state.settings[key] = getSettingInputValue(input);
      saveState();
      renderTitle();
      renderTheme();
      tick();
      rescheduleNativeNotificationsSoon();
    });

    input.addEventListener("change", () => {
      state.settings[key] = getSettingInputValue(input);
      saveState();
      renderTitle();
      renderTheme();
      tick();
      rescheduleNativeNotificationsSoon();
    });
  });
}

function getSettingInputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value);
  return input.value.trim() || "AppHorario";
}

function bindNotifications() {
  updateNotificationButton();
  rescheduleNativeNotificationsSoon();
  elements.notifyButton.addEventListener("click", async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      alert("No se activaron las notificaciones. Revisa el permiso de la app en ajustes del teléfono.");
    } else if (!await ensureExactNotificationPermission({ prompt: true })) {
      await rescheduleNativeNotifications();
      alert("Falta activar Alarmas y recordatorios exactos en Android. Sin eso, el teléfono puede atrasar los avisos varios minutos.");
    } else {
      await rescheduleNativeNotifications();
      alert("Notificaciones activadas. Te avisaré de clases, tareas y estudio aunque cierres la app.");
    }
    updateNotificationButton();
  });
  elements.testNotificationButton.addEventListener("click", sendTestNotification);
  bindNativeNotificationActions();
}

async function sendTestNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) {
    alert("No se pudo enviar la prueba. Revisa el permiso de notificaciones en Android.");
    updateNotificationButton();
    return;
  }

  updateNotificationButton();
  await sendNotification(
    "Prueba de AppHorario",
    "Así se verán tus avisos de clases, tareas y estudio.",
    { test: true },
    `test:${Date.now()}`
  );
}

function bindInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    elements.installButton.hidden = false;
    elements.installHint.textContent = "La app ya está lista para instalarse desde este botón.";
  });

  elements.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      alert("Si no aparece el instalador, usa el menú del navegador y elige Instalar app o Agregar a pantalla principal.");
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    elements.installHint.textContent = "App instalada en este dispositivo.";
    elements.installButton.hidden = true;
  });
}

function bindBackup() {
  elements.exportButton.addEventListener("click", exportBackup);
  elements.importFile.addEventListener("change", importBackup);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (isNativeRuntime()) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach((registration) => registration.unregister());
    return;
  }

  await navigator.serviceWorker.register("sw.js");
}

async function updateNotificationButton() {
  const permission = await getNotificationPermission();
  const label = permission === "granted" ? "Notificaciones activas" : "Activar notificaciones";
  elements.notifyButton.setAttribute("aria-label", label);
  elements.notifyButton.setAttribute("title", label);
  elements.notifyButton.classList.toggle("enabled", permission === "granted");
}

async function getNotificationPermission() {
  const localNotifications = getLocalNotificationsPlugin();
  if (localNotifications) {
    try {
      const result = await localNotifications.checkPermissions();
      return result.display;
    } catch {
      return "prompt";
    }
  }

  if ("Notification" in window) return Notification.permission;
  return "denied";
}

async function requestNotificationPermission() {
  const localNotifications = getLocalNotificationsPlugin();
  if (localNotifications) {
    try {
      const result = await localNotifications.requestPermissions();
      if (result.display === "granted") {
        await ensureNativeNotificationChannel(getNotificationSoundKey());
      }
      return result.display === "granted";
    } catch {
      return false;
    }
  }

  if (!("Notification" in window)) return false;
  return await Notification.requestPermission() === "granted";
}

async function ensureExactNotificationPermission(options = {}) {
  const localNotifications = getLocalNotificationsPlugin();
  if (!localNotifications || typeof localNotifications.checkExactNotificationSetting !== "function") return true;

  try {
    const current = await localNotifications.checkExactNotificationSetting();
    if (!current || current.exact_alarm === "granted") return true;

    if (options.prompt && typeof localNotifications.changeExactNotificationSetting === "function") {
      const changed = await localNotifications.changeExactNotificationSetting();
      return Boolean(changed && changed.exact_alarm === "granted");
    }
  } catch {
    return true;
  }

  return false;
}

function getLocalNotificationsPlugin() {
  return window.Capacitor && window.Capacitor.Plugins
    ? window.Capacitor.Plugins.LocalNotifications
    : null;
}

function getAppPlugin() {
  return window.Capacitor && window.Capacitor.Plugins
    ? window.Capacitor.Plugins.App
    : null;
}

function isNativeRuntime() {
  if (!window.Capacitor) return false;
  if (typeof window.Capacitor.isNativePlatform === "function") {
    return window.Capacitor.isNativePlatform();
  }
  return Boolean(window.Capacitor.Plugins);
}

async function ensureNativeNotificationChannel(soundKey = getNotificationSoundKey()) {
  const localNotifications = getLocalNotificationsPlugin();
  const sound = getNotificationSoundConfig(soundKey);
  if (!localNotifications || nativeNotificationChannelsReady.has(sound.channelId)) return;

  try {
    const channel = {
      id: sound.channelId,
      name: sound.name,
      description: "Recordatorios de clases, tareas y estudio",
      importance: 5,
      visibility: 1,
      vibration: sound.vibration
    };

    if (sound.sound) channel.sound = sound.sound;
    await localNotifications.createChannel(channel);
  } catch {
    // iOS/web do not support Android channels; native Android can continue with the default channel.
  }

  nativeNotificationChannelsReady.add(sound.channelId);
}

function getNotificationSoundKey() {
  const key = state.settings.notificationSound || "chime";
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_SOUNDS, key) ? key : "chime";
}

function getNotificationSoundConfig(soundKey = getNotificationSoundKey()) {
  return NOTIFICATION_SOUNDS[soundKey] || NOTIFICATION_SOUNDS.chime;
}

function rescheduleNativeNotificationsSoon() {
  if (!getLocalNotificationsPlugin()) return;

  clearTimeout(notificationRescheduleTimer);
  notificationRescheduleTimer = setTimeout(() => {
    rescheduleNativeNotifications().catch(() => undefined);
  }, 500);
}

async function rescheduleNativeNotifications() {
  const localNotifications = getLocalNotificationsPlugin();
  if (!localNotifications) return;

  const permission = await getNotificationPermission();
  if (permission !== "granted") return;

  await ensureExactNotificationPermission();
  await ensureNativeNotificationChannel(getNotificationSoundKey());

  await cancelPendingNativeNotifications(localNotifications);

  const previousIds = state.nativeNotificationIds || [];
  if (previousIds.length) {
    await localNotifications.cancel({
      notifications: previousIds.map((id) => ({ id }))
    }).catch(() => undefined);
  }

  const notifications = buildNativeNotificationSchedule(new Date());
  if (notifications.length) {
    await localNotifications.schedule({ notifications }).catch(() => undefined);
  }

  state.nativeNotificationIds = notifications.map((notification) => notification.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function cancelPendingNativeNotifications(localNotifications) {
  if (!localNotifications || typeof localNotifications.getPending !== "function") return;

  try {
    const pending = await localNotifications.getPending();
    const notifications = pending && pending.notifications ? pending.notifications : [];
    if (!notifications.length) return;

    await localNotifications.cancel({
      notifications: notifications.map((notification) => ({ id: notification.id }))
    });
  } catch {
    // Older plugin/web fallbacks can skip this; specific stored IDs are cancelled below.
  }
}

function buildNativeNotificationSchedule(now) {
  const scheduled = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizonDays = 30;
  const limit = 60;
  const sound = getNotificationSoundConfig();

  for (let offset = 0; offset <= horizonDays; offset++) {
    const day = addDays(today, offset);
    const dateValue = toDateInput(day);

    state.classes.forEach((item) => {
      if (!item.days.includes(day.getDay())) return;

      const classStart = dateTimeFromParts(dateValue, item.start);
      if (state.settings.taskPromptEnabled) {
        const at = getTaskPromptDateTime(dateValue, item);
        scheduled.push({
          key: `${dateValue}:task-prompt:${item.id}`,
          title: "¿Alguna tarea?",
          body: `¿Alguna tarea de ${getClassDisplayName(item)}?`,
          at,
          extra: { classId: item.id, quickTask: true }
        });
      }

      if (state.settings.classStartEnabled) {
        const minutes = Number(state.settings.classStartMinutes || 5);
        const at = addMinutes(classStart, -minutes);
        scheduled.push({
          key: `${dateValue}:class-start:${item.id}`,
          title: "Clase por iniciar",
          body: `${getClassDisplayName(item)} inicia en ${minutes} min.`,
          at,
          extra: { classId: item.id }
        });
      }
    });

    state.tasks.forEach((task) => {
      if (!isTaskDueOn(task, day) || isTaskComplete(task, dateValue)) return;
      scheduled.push({
        key: `${dateValue}:task:${task.id}`,
        title: "Recordatorio",
        body: task.title,
        at: dateTimeFromParts(dateValue, task.time),
        extra: { taskId: task.id, classId: task.classId }
      });
    });
  }

  return scheduled
    .filter((item) => item.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((item) => {
      const notification = {
        id: notificationIdFromKey(item.key),
        title: item.title,
        body: item.body,
        channelId: sound.channelId,
        extra: item.extra,
        autoCancel: true,
        schedule: {
          at: item.at,
          allowWhileIdle: true
        }
      };

      if (sound.sound) notification.sound = sound.sound;
      return notification;
    });
}

function bindNativeNotificationActions() {
  const localNotifications = getLocalNotificationsPlugin();
  if (!localNotifications) return;

  const listener = localNotifications.addListener("localNotificationActionPerformed", (event) => {
    const data = event.notification && event.notification.extra ? event.notification.extra : {};
    if (data.quickTask && data.classId) {
      openQuickTask(data.classId);
    }
  });

  if (listener && typeof listener.catch === "function") listener.catch(() => undefined);
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  $$("i[data-lucide]").forEach((icon) => {
    const name = icon.dataset.lucide;
    const paths = ICON_PATHS[name] || ICON_PATHS.circle;
    icon.classList.add("icon-fallback");
    icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  });
}

function render() {
  renderTitle();
  renderTheme();
  renderViewControls();
  renderSmartPanel();
  renderTodaySchedule();
  renderWeekSchedule();
  renderClasses();
  renderExams();
  renderTasks();
  renderTaskClassOptions();
  renderExamClassOptions();
  bindDynamicActions();
  refreshOpenClassDetail();

  renderIcons();
}

function getTodayViewMode() {
  return state.settings.todayViewMode === "pending" ? "pending" : "full";
}

function getWeekViewMode() {
  return state.settings.weekViewMode === "upcoming" ? "upcoming" : "full";
}

function renderViewControls() {
  if (elements.todayViewButton) {
    const pending = getTodayViewMode() === "pending";
    elements.todayViewButton.innerHTML = `
      <i data-lucide="${pending ? "calendar-days" : "check-check"}"></i>
      ${pending ? "Todo" : "Pendientes"}
    `;
    elements.todayViewButton.setAttribute("aria-label", pending ? "Ver todo el horario de hoy" : "Ver solo clases pendientes de hoy");
    elements.todayViewButton.setAttribute("title", pending ? "Ver todo el horario de hoy" : "Ver solo clases pendientes de hoy");
  }

  if (elements.weekHeading) {
    elements.weekHeading.textContent = getWeekViewMode() === "upcoming" ? "Semana desde hoy" : "Semana completa";
  }

  if (elements.weekViewButton) {
    const upcoming = getWeekViewMode() === "upcoming";
    elements.weekViewButton.innerHTML = `
      <i data-lucide="${upcoming ? "calendar-range" : "calendar-days"}"></i>
      ${upcoming ? "Completa" : "Desde hoy"}
    `;
    elements.weekViewButton.setAttribute("aria-label", upcoming ? "Ver semana completa" : "Ver desde hoy en adelante");
    elements.weekViewButton.setAttribute("title", upcoming ? "Ver semana completa" : "Ver desde hoy en adelante");
  }

  renderIcons();
}

function renderTitle() {
  const title = state.settings.appTitle ? state.settings.appTitle.trim() || "AppHorario" : "AppHorario";
  elements.appTitle.textContent = title;
  document.title = title;
}

function renderTheme() {
  const mode = state.settings.themeMode || "light";
  const prefersDark = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedMode = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;
  const root = document.documentElement;
  const primary = state.settings.primaryColor || "#216869";
  const accent = state.settings.accentColor || "#c7503d";
  const background = state.settings.backgroundColor || "#f5f7fb";

  root.dataset.theme = resolvedMode;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-dark", darkenColor(primary, 24));
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--bg", resolvedMode === "dark" ? "#0f1720" : background);
  root.style.setProperty("--theme-wash", hexToRgb(primary));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", resolvedMode === "dark" ? "#0f1720" : background);
}

function tick() {
  const now = new Date();
  elements.currentTime.textContent = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const current = getCurrentClass(now);
  const next = getUpcomingClasses(now)[0];

  if (current) {
    elements.classStatusLabel.textContent = "En clase";
    const location = getClassLocationText(current);
    elements.nextClassText.textContent = `${getClassDisplayName(current)}${location ? ` · ${location}` : ""}`;
  } else {
    elements.classStatusLabel.textContent = "Siguiente clase";
    const location = next ? getClassLocationText(next) : "";
    elements.nextClassText.textContent = next
      ? `${getClassDisplayName(next)} a las ${next.start}${location ? ` · ${location}` : ""}`
      : "Sin clases próximas";
  }

  renderSmartPanel();
  renderTodaySchedule();
  checkClassNotifications(now);
  checkTaskNotifications(now);
}

function renderSmartPanel() {
  const now = new Date();
  const current = getCurrentClass(now);
  const next = getUpcomingClasses(now)[0];
  const candidate = current || next;

  if (!candidate) {
    elements.smartPanel.hidden = true;
    elements.smartPanel.innerHTML = "";
    return;
  }

  const minutesLeft = timeToMinutes(candidate.start) - getCurrentMinutes(now);
  const shouldShow = current || (minutesLeft >= 0 && minutesLeft <= state.settings.taskPromptMinutes);

  if (!shouldShow) {
    elements.smartPanel.hidden = true;
    elements.smartPanel.innerHTML = "";
    return;
  }

  elements.smartPanel.hidden = false;
  elements.smartPanel.style.setProperty("--class-color", candidate.color || DEFAULT_CLASS_COLOR);
  elements.smartPanel.innerHTML = `
    <div>
      <p class="eyebrow">${current ? "En clase" : `Faltan ${minutesLeft} min`}</p>
      <h2>${escapeHtml(getClassDisplayName(candidate))}</h2>
      <p class="muted">¿Quieres anotar una tarea o revisar esta clase?</p>
    </div>
    <div class="smart-actions">
      <button class="text-button" type="button" data-quick-task="${candidate.id}">
        <i data-lucide="zap"></i>
        Anotar tarea
      </button>
      <button class="text-button" type="button" data-class-detail="${candidate.id}">
        <i data-lucide="panel-right-open"></i>
        Abrir clase
      </button>
    </div>
  `;
  renderIcons();
}

function renderTodaySchedule() {
  const now = new Date();
  const today = new Date().getDay();
  const currentMinutes = getCurrentMinutes(now);
  const classes = state.classes
    .filter((item) => item.days.includes(today))
    .sort((a, b) => a.start.localeCompare(b.start));

  const current = classes.filter((item) => isClassCurrent(item, now));
  const upcoming = classes.filter((item) => timeToMinutes(item.start) > currentMinutes);
  const completed = classes.filter((item) => timeToMinutes(item.end) <= currentMinutes);
  const groups = getTodayViewMode() === "pending"
    ? [
      renderTodayGroup("En curso", current, "Tu clase activa aparece aquí."),
      renderTodayGroup("Por venir", upcoming, "Ya no quedan clases pendientes por hoy.")
    ]
    : [
      renderTodayGroup("En curso", current, "Tu clase activa aparece aquí."),
      renderTodayGroup("Por venir", upcoming, "Ya no quedan clases pendientes por hoy."),
      renderTodayGroup("Cursadas", completed, "Aún no hay clases cursadas hoy.")
    ];

  elements.todaySchedule.innerHTML = classes.length
    ? groups.join("")
    : emptyState("No tienes clases registradas para hoy.");
}

function renderTodayGroup(title, classes, emptyText) {
  return `
    <section class="today-group ${classes.length ? "" : "is-empty"}">
      <div class="today-group-heading">
        <h3>${title}</h3>
        <span>${classes.length}</span>
      </div>
      <div class="today-stack">
        ${classes.length ? classes.map(renderTimelineItem).join("") : emptyState(emptyText)}
      </div>
    </section>
  `;
}

function renderTimelineItem(item) {
  const now = new Date();
  const pendingCount = getTasksForClass(item.id).filter((task) => !isTaskComplete(task, toDateInput(now))).length;
  const isCurrent = isClassCurrent(item, now);
  const location = getClassLocationText(item);

  return `
    <article class="timeline-item ${isCurrent ? "current" : ""}" style="--class-color:${item.color || DEFAULT_CLASS_COLOR}">
      <div class="time-pill">${item.start}</div>
      <div>
        <h3>${escapeHtml(getClassDisplayName(item))}${isCurrent ? ` <span class="status-chip">En clase</span>` : ""}</h3>
        <p class="muted">${item.end}${location ? ` · ${escapeHtml(location)}` : ""}${pendingCount ? ` · ${pendingCount} tarea${pendingCount === 1 ? "" : "s"}` : ""}</p>
      </div>
    </article>
  `;
}

function renderWeekSchedule() {
  const days = getWeekDaysForCurrentView();
  elements.weekSchedule.innerHTML = days.map((day) => {
    const classes = state.classes
      .filter((item) => item.days.includes(day))
      .sort((a, b) => a.start.localeCompare(b.start));

    return `
      <section class="week-day">
        <h3>${DAY_NAMES[day]}</h3>
        ${classes.length ? classes.map(renderWeekItem).join("") : `<p class="muted">Libre</p>`}
      </section>
    `;
  }).join("");
}

function renderWeekItem(item) {
  return `
    <article class="week-item" style="--class-color:${item.color || DEFAULT_CLASS_COLOR}">
      <strong>${escapeHtml(getClassDisplayName(item))}</strong>
      <span>${item.start} - ${item.end}</span>
    </article>
  `;
}

function getWeekDaysForCurrentView() {
  if (getWeekViewMode() !== "upcoming") return WEEK_DAYS;

  const today = new Date().getDay();
  const todayIndex = WEEK_DAYS.indexOf(today);
  if (todayIndex < 0) return WEEK_DAYS;
  return WEEK_DAYS.slice(todayIndex);
}

function renderClasses() {
  elements.classList.innerHTML = state.classes.length
    ? state.classes
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(renderClassCard)
      .join("")
    : emptyState("Agrega tus materias para empezar.");
}

function renderClassCard(item) {
  const days = item.days.slice().sort((a, b) => a - b).map((day) => `<span class="tag">${DAY_NAMES[day]}</span>`).join("");
  const pendingCount = getTasksForClass(item.id).filter((task) => !isTaskComplete(task, toDateInput(new Date()))).length;
  const location = getClassLocationText(item);

  return `
    <article class="class-card" style="--class-color:${item.color || DEFAULT_CLASS_COLOR}">
      <div class="card-title-row">
        <div>
          <h3>${escapeHtml(getClassDisplayName(item))}</h3>
          <p class="muted">${item.start} - ${item.end}${location ? ` · ${escapeHtml(location)}` : ""}${pendingCount ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : ""}</p>
        </div>
        <div class="card-actions">
          <button class="tiny-button" type="button" data-delete-class="${item.id}" aria-label="Eliminar ${escapeHtml(getClassDisplayName(item))}" title="Eliminar">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div class="tag-row">${days}</div>
      <button class="text-button" type="button" data-class-detail="${item.id}">
        <i data-lucide="panel-right-open"></i>
        Abrir clase
      </button>
    </article>
  `;
}

function getClassDisplayName(item) {
  if (!item) return "";
  return splitSiiClassNameAndTeacher(item.name, item.teacher).name || item.name || "";
}

function getClassLocationText(item) {
  if (!item) return "";

  const savedPlace = cleanText(item.place);
  const teacher = cleanText(item.teacher);
  const teacherLabel = teacher ? `Prof. ${teacher.replace(/^prof\.?\s*/i, "")}` : "";

  if (savedPlace && (!teacherLabel || savedPlace.toLowerCase().includes(teacher.toLowerCase()))) {
    return savedPlace;
  }

  return formatClassPlace({
    room: item.room || savedPlace,
    teacher
  });
}

function getClassRoomText(item) {
  if (!item) return "";
  if (item.room) return cleanText(item.room);

  const place = cleanText(item.place);
  if (!item.teacher) return place;

  return cleanText(place.replace(new RegExp(`\\s*·?\\s*prof\\.?\\s*${escapeRegExp(cleanText(item.teacher))}`, "i"), ""));
}

function getClassTeacherText(item) {
  return item && item.teacher ? cleanText(item.teacher).replace(/^prof\.?\s*/i, "") : "";
}

function renderTasks() {
  const today = toDateInput(new Date());
  const tasks = getSortedTasks(state.tasks);
  const pending = tasks.filter((task) => !isTaskComplete(task, today));
  const done = tasks.filter((task) => isTaskComplete(task, today));

  elements.taskList.innerHTML = tasks.length
    ? `
      <section class="task-group">
        <h3>Pendientes</h3>
        ${pending.length ? pending.map(renderTaskCard).join("") : emptyState("No tienes tareas pendientes.")}
      </section>
      <section class="task-group">
        <h3>Completadas</h3>
        ${done.length ? done.map(renderTaskCard).join("") : emptyState("Aún no hay tareas completadas.")}
      </section>
    `
    : emptyState("Guarda tareas o recordatorios con una hora exacta.");
}

function renderExams() {
  const exams = getSortedExams(state.exams);

  elements.examList.innerHTML = exams.length
    ? `
      <section class="task-group">
        <h3>Exámenes</h3>
        ${exams.map(renderExamCard).join("")}
      </section>
    `
    : emptyState("Agrega fechas de examen para crear recordatorios de estudio.");
}

function renderExamCard(exam) {
  const className = getClassName(exam.classId);
  const classItem = getClassById(exam.classId);
  const reminders = exam.reminderDays
    .slice()
    .sort((a, b) => b - a)
    .map((day) => day === 0 ? "mismo día" : `${day} día${day === 1 ? "" : "s"} antes`)
    .join(", ");

  return `
    <article class="task-card exam-card" style="--class-color:${(classItem && classItem.color) || DEFAULT_CLASS_COLOR}">
      <div class="time-pill">${exam.time}</div>
      <div>
        <h3>${escapeHtml(exam.title)}</h3>
        <p class="muted">${formatDate(exam.date)}${className ? ` · ${escapeHtml(className)}` : ""}</p>
        <div class="tag-row">
          <span class="tag priority-high">Examen</span>
          <span class="tag">${escapeHtml(reminders || "sin recordatorios")}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="tiny-button" type="button" data-edit-exam="${exam.id}" aria-label="Editar examen" title="Editar examen">
          <i data-lucide="pencil"></i>
        </button>
        <button class="tiny-button" type="button" data-delete-exam="${exam.id}" aria-label="Eliminar examen" title="Eliminar examen">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </article>
  `;
}

function renderTaskCard(task) {
  const className = getClassName(task.classId);
  const classItem = getClassById(task.classId);
  const today = toDateInput(new Date());
  const complete = isTaskComplete(task, today);

  return `
    <article class="task-card ${complete ? "done" : ""}" style="--class-color:${(classItem && classItem.color) || DEFAULT_CLASS_COLOR}">
      <button class="check-button" type="button" data-toggle-task="${task.id}" aria-label="Marcar tarea">
        <i data-lucide="${complete ? "check-check" : "circle"}"></i>
      </button>
      <div>
        <h3>${escapeHtml(task.title)}</h3>
        <p class="muted">${formatDate(task.date)} · ${task.time}${className ? ` · ${escapeHtml(className)}` : ""}</p>
        <div class="tag-row">
          <span class="tag priority-${task.priority || "normal"}">${PRIORITY_LABELS[task.priority || "normal"]}</span>
          <span class="tag">${REPEAT_LABELS[task.repeat || "none"]}</span>
        </div>
        ${task.details ? `<p>${escapeHtml(task.details)}</p>` : ""}
      </div>
      <button class="tiny-button" type="button" data-delete-task="${task.id}" aria-label="Eliminar tarea" title="Eliminar">
        <i data-lucide="trash-2"></i>
      </button>
    </article>
  `;
}

function renderTaskClassOptions() {
  elements.taskClass.innerHTML = `<option value="">Sin clase</option>` + state.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}">${escapeHtml(getClassDisplayName(item))}</option>`)
    .join("");
}

function renderExamClassOptions() {
  elements.examClass.innerHTML = `<option value="">Sin clase</option>` + state.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}">${escapeHtml(getClassDisplayName(item))}</option>`)
    .join("");
}

function bindDynamicActions() {
  if (dynamicActionsBound) return;
  dynamicActionsBound = true;

  document.addEventListener("click", (event) => {
    const quickTaskButton = event.target.closest("[data-quick-task]");
    if (quickTaskButton) {
      openQuickTask(quickTaskButton.dataset.quickTask);
      return;
    }

    const classDetailButton = event.target.closest("[data-class-detail]");
    if (classDetailButton) {
      openClassDetail(classDetailButton.dataset.classDetail);
      return;
    }

    const editClassButton = event.target.closest("[data-edit-class]");
    if (editClassButton) {
      editClass(editClassButton.dataset.editClass);
      return;
    }

    const deleteClassButton = event.target.closest("[data-delete-class]");
    if (deleteClassButton) {
      deleteClass(deleteClassButton.dataset.deleteClass);
      return;
    }

    const deleteTaskButton = event.target.closest("[data-delete-task]");
    if (deleteTaskButton) {
      deleteTask(deleteTaskButton.dataset.deleteTask);
      return;
    }

    const toggleTaskButton = event.target.closest("[data-toggle-task]");
    if (toggleTaskButton) {
      toggleTask(toggleTaskButton.dataset.toggleTask);
      return;
    }

    const editExamButton = event.target.closest("[data-edit-exam]");
    if (editExamButton) {
      editExam(editExamButton.dataset.editExam);
      return;
    }

    const deleteExamButton = event.target.closest("[data-delete-exam]");
    if (deleteExamButton) {
      deleteExam(deleteExamButton.dataset.deleteExam);
      return;
    }

    const editNoteButton = event.target.closest("[data-edit-note]");
    if (editNoteButton) {
      editNote(editNoteButton.dataset.editNote);
      return;
    }

    const saveNoteButton = event.target.closest("[data-save-note]");
    if (saveNoteButton) {
      saveEditedNote(saveNoteButton.dataset.saveNote);
      return;
    }

    const cancelNoteButton = event.target.closest("[data-cancel-note]");
    if (cancelNoteButton) {
      cancelEditNote(cancelNoteButton.dataset.cancelNote);
      return;
    }

    const deleteNoteButton = event.target.closest("[data-delete-note]");
    if (deleteNoteButton) {
      deleteNote(deleteNoteButton.dataset.deleteNote);
      return;
    }

    const playAudioButton = event.target.closest("[data-play-audio]");
    if (playAudioButton) {
      playAudio(playAudioButton.dataset.playAudio);
      return;
    }

    const downloadAudioButton = event.target.closest("[data-download-audio]");
    if (downloadAudioButton) {
      downloadAudio(downloadAudioButton.dataset.downloadAudio);
      return;
    }

    const deleteAudioButton = event.target.closest("[data-delete-audio]");
    if (deleteAudioButton) {
      deleteAudio(deleteAudioButton.dataset.deleteAudio);
      return;
    }

    const classColorButton = event.target.closest("[data-class-color]");
    if (classColorButton) {
      setClassColor(classColorButton.dataset.classColor);
    }
  });
}

function resetClassForm() {
  $("#classForm").reset();
  $("#classId").value = "";
  setClassColor(DEFAULT_CLASS_COLOR);
  $("#classStart").value = "08:00";
  $("#classEnd").value = "09:00";
  $$('input[name="classDay"]').forEach((input) => input.checked = [1, 2, 3, 4, 5].includes(Number(input.value)));
}

function saveClass(event) {
  event.preventDefault();
  const id = $("#classId").value || createId();
  const days = $$('input[name="classDay"]:checked').map((input) => Number(input.value));

  if (!days.length) {
    alert("Elige al menos un día.");
    return;
  }

  const existing = state.classes.find((item) => item.id === id);
  const place = $("#classPlace").value.trim();
  const nextClass = {
    id,
    name: $("#className").value.trim(),
    place,
    room: place,
    teacher: existing && existing.teacher ? existing.teacher : "",
    source: existing && existing.source ? existing.source : undefined,
    externalId: existing && existing.externalId ? existing.externalId : undefined,
    color: $("#classColor").value || DEFAULT_CLASS_COLOR,
    start: $("#classStart").value,
    end: $("#classEnd").value,
    days,
    notes: existing && existing.notes ? existing.notes : [],
    recordings: existing && existing.recordings ? existing.recordings : []
  };

  state.classes = existing
    ? state.classes.map((item) => item.id === id ? nextClass : item)
    : [...state.classes, nextClass];

  saveState();
  closeDialog("classDialog");
  render();
  tick();
  rescheduleNativeNotificationsSoon();
}

function editClass(id) {
  const item = state.classes.find((classItem) => classItem.id === id);
  if (!item) return;

  fillClassForm(item);
  openDialog("classDialog");
}

function fillClassForm(item) {
  $("#classId").value = item.id;
  $("#className").value = item.name;
  $("#classPlace").value = item.place || "";
  setClassColor(item.color || DEFAULT_CLASS_COLOR);
  $("#classStart").value = item.start;
  $("#classEnd").value = item.end;
  $$('input[name="classDay"]').forEach((input) => input.checked = item.days.includes(Number(input.value)));
}

function setClassColor(color) {
  const normalizedColor = color || DEFAULT_CLASS_COLOR;
  const input = $("#classColor");
  if (input) input.value = normalizedColor;

  $$("[data-class-color]").forEach((button) => {
    const selected = button.dataset.classColor.toLowerCase() === normalizedColor.toLowerCase();
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function deleteClass(id) {
  const item = state.classes.find((classItem) => classItem.id === id);
  if (!item || !confirm(`¿Eliminar ${getClassDisplayName(item)}?`)) return;

  state.classes = state.classes.filter((classItem) => classItem.id !== id);
  state.tasks = state.tasks.map((task) => task.classId === id ? { ...task, classId: "" } : task);
  state.exams = state.exams.map((exam) => exam.classId === id ? { ...exam, classId: "" } : exam);
  saveState();
  render();
  tick();
  rescheduleNativeNotificationsSoon();
}

function resetTaskForm() {
  $("#taskForm").reset();
  $("#taskId").value = "";
  $("#taskDate").value = toDateInput(new Date());
  $("#taskTime").value = toTimeInput(new Date(Date.now() + 60 * 60 * 1000));
  $("#taskPriority").value = "normal";
  $("#taskRepeat").value = "none";
  renderTaskClassOptions();
}

function saveTask(event) {
  event.preventDefault();
  const id = $("#taskId").value || createId();
  const existing = state.tasks.find((item) => item.id === id);
  const task = {
    id,
    title: $("#taskTitle").value.trim(),
    classId: $("#taskClass").value,
    date: $("#taskDate").value,
    time: $("#taskTime").value,
    priority: $("#taskPriority").value,
    repeat: $("#taskRepeat").value,
    details: $("#taskDetails").value.trim(),
    done: existing && existing.done ? existing.done : false,
    completedDates: existing && existing.completedDates ? existing.completedDates : []
  };

  state.tasks = [...state.tasks.filter((item) => item.id !== id), task];
  saveState();
  closeDialog("taskDialog");
  render();
  rescheduleNativeNotificationsSoon();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  render();
  rescheduleNativeNotificationsSoon();
}

function toggleTask(id) {
  const today = toDateInput(new Date());
  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;

    if ((task.repeat || "none") === "none") {
      return { ...task, done: !task.done };
    }

    const completedDates = new Set(task.completedDates || []);
    if (completedDates.has(today)) {
      completedDates.delete(today);
    } else {
      completedDates.add(today);
    }

    return { ...task, completedDates: Array.from(completedDates) };
  });
  saveState();
  render();
  rescheduleNativeNotificationsSoon();
}

function resetExamForm() {
  $("#examForm").reset();
  $("#examId").value = "";
  $("#examDate").value = toDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  $("#examTime").value = "08:00";
  $("#examStudyTime").value = "18:00";
  renderExamClassOptions();
  $$('input[name="studyDay"]').forEach((input) => input.checked = [7, 3, 1].includes(Number(input.value)));
}

function saveExam(event) {
  event.preventDefault();
  const id = $("#examId").value || createId();
  const existing = state.exams.find((exam) => exam.id === id);
  const reminderDays = $$('input[name="studyDay"]:checked').map((input) => Number(input.value));

  const exam = {
    id,
    title: $("#examTitle").value.trim(),
    classId: $("#examClass").value,
    date: $("#examDate").value,
    time: $("#examTime").value,
    studyTime: $("#examStudyTime").value,
    reminderDays,
    taskIds: existing && existing.taskIds ? existing.taskIds : []
  };

  state.tasks = state.tasks.filter((task) => !exam.taskIds.includes(task.id) && task.examId !== exam.id);
  const reminderTasks = createStudyReminderTasks(exam);
  exam.taskIds = reminderTasks.map((task) => task.id);
  state.tasks = [...state.tasks, ...reminderTasks];
  state.exams = existing
    ? state.exams.map((item) => item.id === id ? exam : item)
    : [...state.exams, exam];

  saveState();
  closeDialog("examDialog");
  render();
  rescheduleNativeNotificationsSoon();
}

function createStudyReminderTasks(exam, existingIds = []) {
  return exam.reminderDays
    .slice()
    .sort((a, b) => b - a)
    .map((daysBefore, index) => {
      const date = addDays(new Date(`${exam.date}T00:00:00`), -daysBefore);
      const className = getClassName(exam.classId);
      const timing = daysBefore === 0 ? "hoy" : `${daysBefore} día${daysBefore === 1 ? "" : "s"} antes`;

      return {
        id: existingIds[index] || createId(),
        title: `Estudiar para ${exam.title}`,
        classId: exam.classId,
        date: toDateInput(date),
        time: exam.studyTime,
        priority: "high",
        repeat: "none",
        details: `Recordatorio ${timing} del examen${className ? ` de ${className}` : ""}.`,
        done: false,
        completedDates: [],
        examId: exam.id
      };
    });
}

function editExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;

  renderExamClassOptions();
  $("#examId").value = exam.id;
  $("#examTitle").value = exam.title;
  $("#examClass").value = exam.classId || "";
  $("#examDate").value = exam.date;
  $("#examTime").value = exam.time;
  $("#examStudyTime").value = exam.studyTime || "18:00";
  $$('input[name="studyDay"]').forEach((input) => input.checked = (exam.reminderDays || []).includes(Number(input.value)));
  openDialog("examDialog");
}

function deleteExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam || !confirm(`¿Eliminar ${exam.title}? También se eliminan sus recordatorios de estudio.`)) return;

  state.exams = state.exams.filter((item) => item.id !== id);
  state.tasks = state.tasks.filter((task) => task.examId !== id && !(exam.taskIds || []).includes(task.id));
  saveState();
  render();
  rescheduleNativeNotificationsSoon();
}

function openClassDetail(id) {
  const item = state.classes.find((classItem) => classItem.id === id);
  if (!item) return;

  $("#noteClassId").value = item.id;
  $("#notesTitle").textContent = getClassDisplayName(item);
  $("#noteText").value = "";
  renderClassDetail(item);
  renderNotesHistory(item);
  renderAudioHistory(item);
  updateRecordingUi(false);
  openDialog("notesDialog");

  renderIcons();
}

function renderClassDetail(item) {
  const days = item.days
    .slice()
    .sort((a, b) => a - b)
    .map((day) => `<span class="tag">${DAY_NAMES[day]}</span>`)
    .join("");
  const room = getClassRoomText(item);
  const teacher = getClassTeacherText(item);

  elements.classDetailMeta.style.setProperty("--class-color", item.color || DEFAULT_CLASS_COLOR);
  elements.classDetailMeta.innerHTML = `
    <div>
      <strong>${item.start} - ${item.end}</strong>
      <p class="muted">${room ? `Aula: ${escapeHtml(room)}` : "Sin aula registrada"}</p>
      ${teacher ? `<p class="muted">Profesor: ${escapeHtml(teacher)}</p>` : ""}
    </div>
    <div class="tag-row">${days}</div>
  `;

  renderClassDetailExams(item.id);
  renderClassDetailTasks(item.id);
}

function renderClassDetailExams(classId) {
  const exams = getSortedExams(state.exams.filter((exam) => exam.classId === classId));

  elements.classDetailExams.innerHTML = exams.length
    ? exams.map(renderExamCard).join("")
    : emptyState("Aún no hay exámenes guardados para esta clase.");
}

function renderClassDetailTasks(classId) {
  const today = toDateInput(new Date());
  const tasks = getTasksForClass(classId);
  const pending = tasks.filter((task) => !isTaskComplete(task, today));
  const done = tasks.filter((task) => isTaskComplete(task, today));

  elements.classDetailTasks.innerHTML = tasks.length
    ? `
      ${pending.length ? pending.map(renderTaskCard).join("") : emptyState("No hay tareas pendientes para esta clase.")}
      ${done.length ? `<div class="mini-heading">Completadas</div>${done.map(renderTaskCard).join("")}` : ""}
    `
    : emptyState("Aún no hay tareas guardadas para esta clase.");
}

function addTaskFromDetail() {
  const classId = $("#noteClassId").value;
  replaceDialog("notesDialog", "taskDialog", () => {
    resetTaskForm();
    $("#taskClass").value = classId;
  });
}

function addExamFromDetail() {
  const classId = $("#noteClassId").value;
  replaceDialog("notesDialog", "examDialog", () => {
    resetExamForm();
    $("#examClass").value = classId;
  });
}

function editClassFromDetail() {
  const classId = $("#noteClassId").value;
  const item = getClassById(classId);
  if (!item) return;

  replaceDialog("notesDialog", "classDialog", () => fillClassForm(item));
}

function openQuickTask(classId) {
  fillQuickTaskForm(classId);
  openDialog("taskDialog");
}

function fillQuickTaskForm(classId) {
  const item = getClassById(classId);
  resetTaskForm();
  $("#taskClass").value = classId || "";
  $("#taskTitle").value = item ? `Tarea de ${getClassDisplayName(item)}` : "";
  $("#taskPriority").value = "normal";
  $("#taskRepeat").value = "none";
}

function handleQuickTaskFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("quickTask");
  if (!classId) return;

  openQuickTask(classId);
  window.history.replaceState({}, document.title, window.location.pathname);
}

function saveNote(event) {
  event.preventDefault();
  const classId = $("#noteClassId").value;
  const text = $("#noteText").value.trim();
  if (!text) return;

  const today = toDateInput(new Date());

  state.classes = state.classes.map((item) => {
    if (item.id !== classId) return item;

    const notes = item.notes || [];
    const todayNote = notes.find((note) => toDateInput(new Date(note.date)) === today);

    if (todayNote) {
      return {
        ...item,
        notes: notes.map((note) => note.id === todayNote.id
          ? { ...note, text: `${note.text}\n\n${text}` }
          : note)
      };
    }

    return {
      ...item,
      notes: [
        {
          id: createId(),
          date: new Date().toISOString(),
          text
        },
        ...notes
      ]
    };
  });

  saveState();
  $("#noteText").value = "";
  const item = state.classes.find((classItem) => classItem.id === classId);
  renderClassDetail(item);
  renderNotesHistory(item);
  renderAudioHistory(item);
}

function renderNotesHistory(item) {
  const notes = item && item.notes ? item.notes : [];
  $("#notesHistory").innerHTML = notes.length
    ? notes.map((note) => `
      <article class="note-card" data-note-card="${note.id}">
        <time>${new Date(note.date).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</time>
        <p data-note-display="${note.id}">${escapeHtml(note.text)}</p>
        <div class="note-edit" data-note-edit="${note.id}" hidden>
          <textarea rows="4" maxlength="1000">${escapeHtml(note.text)}</textarea>
          <div class="inline-actions">
            <button class="text-button" type="button" data-save-note="${note.id}">
              <i data-lucide="save"></i>
              Guardar
            </button>
            <button class="text-button" type="button" data-cancel-note="${note.id}">
              <i data-lucide="undo"></i>
              Cancelar
            </button>
          </div>
        </div>
        <div class="inline-actions">
          <button class="tiny-button" type="button" data-edit-note="${note.id}" aria-label="Editar nota" title="Editar nota">
            <i data-lucide="pencil"></i>
          </button>
          <button class="tiny-button" type="button" data-delete-note="${note.id}" aria-label="Eliminar nota" title="Eliminar nota">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </article>
    `).join("")
    : emptyState("Aún no hay notas para esta clase.");
  renderIcons();
}

function editNote(noteId) {
  const display = document.querySelector(`[data-note-display="${noteId}"]`);
  const editor = document.querySelector(`[data-note-edit="${noteId}"]`);
  if (!display || !editor) return;

  display.hidden = true;
  editor.hidden = false;
  const textarea = editor.querySelector("textarea");
  if (textarea) textarea.focus();
}

function cancelEditNote(noteId) {
  const display = document.querySelector(`[data-note-display="${noteId}"]`);
  const editor = document.querySelector(`[data-note-edit="${noteId}"]`);
  if (!display || !editor) return;

  editor.hidden = true;
  display.hidden = false;
}

function saveEditedNote(noteId) {
  const classId = $("#noteClassId").value;
  const editor = document.querySelector(`[data-note-edit="${noteId}"] textarea`);
  const text = editor ? editor.value.trim() : "";
  if (!text) return;

  state.classes = state.classes.map((classItem) => {
    if (classItem.id !== classId) return classItem;

    return {
      ...classItem,
      notes: (classItem.notes || []).map((note) => note.id === noteId ? { ...note, text } : note)
    };
  });

  saveState();
  const item = getClassById(classId);
  renderNotesHistory(item);
}

function deleteNote(noteId) {
  if (!confirm("¿Eliminar esta nota?")) return;

  const classId = $("#noteClassId").value;
  state.classes = state.classes.map((classItem) => classItem.id === classId
    ? { ...classItem, notes: (classItem.notes || []).filter((note) => note.id !== noteId) }
    : classItem);

  saveState();
  renderNotesHistory(getClassById(classId));
}

async function startAudioRecording() {
  const classId = $("#noteClassId").value;
  if (!classId || (mediaRecorder && mediaRecorder.state === "recording")) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    alert("Este navegador no permite grabar audio desde aquí.");
    return;
  }

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    recordingClassId = classId;
    recordingStartedAt = new Date().toISOString();
    mediaRecorder = new MediaRecorder(recordingStream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordingChunks.push(event.data);
    });

    mediaRecorder.addEventListener("stop", saveAudioRecording);
    mediaRecorder.start();
    updateRecordingUi(true);
  } catch {
    alert("No pude acceder al micrófono. Revisa el permiso del navegador.");
  }
}

function stopAudioRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

async function saveAudioRecording() {
  const mimeType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : "audio/webm";
  const blob = new Blob(recordingChunks, { type: mimeType });
  const id = createId();
  const classId = recordingClassId;
  const startedAt = recordingStartedAt || new Date().toISOString();
  const durationSeconds = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));

  if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
  recordingStream = null;
  mediaRecorder = null;
  recordingChunks = [];
  recordingClassId = "";
  recordingStartedAt = "";

  if (blob.size > 0) {
    try {
      await saveAudioBlob(id, blob);
      state.classes = state.classes.map((classItem) => classItem.id === classId
        ? {
          ...classItem,
          recordings: [
            {
              id,
              date: startedAt,
              mimeType,
              size: blob.size,
              durationSeconds
            },
            ...(classItem.recordings || [])
          ]
        }
        : classItem);
      saveState();
    } catch {
      alert("No pude guardar el audio. Puede que el navegador no tenga espacio disponible.");
    }
  }

  updateRecordingUi(false);
  const item = getClassById(classId || $("#noteClassId").value);
  renderAudioHistory(item);
}

function updateRecordingUi(isRecording) {
  elements.recordAudioButton.hidden = isRecording;
  elements.stopAudioButton.hidden = !isRecording;
  elements.recordingStatus.textContent = isRecording
    ? "Grabando audio de la clase..."
    : "Sin grabación activa.";
}

function renderAudioHistory(item) {
  const recordings = item && item.recordings ? item.recordings : [];
  elements.audioHistory.innerHTML = recordings.length
    ? recordings.map((recording) => `
      <article class="audio-card">
        <div>
          <time>${new Date(recording.date).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</time>
          <p class="muted">${formatDuration(recording.durationSeconds)} · ${formatBytes(recording.size)}</p>
          <audio class="audio-player" data-audio-player="${recording.id}" controls preload="none"></audio>
        </div>
        <div class="card-actions">
          <button class="tiny-button" type="button" data-play-audio="${recording.id}" aria-label="Reproducir audio" title="Reproducir audio">
            <i data-lucide="play"></i>
          </button>
          <button class="tiny-button" type="button" data-download-audio="${recording.id}" aria-label="Descargar audio" title="Descargar audio">
            <i data-lucide="download"></i>
          </button>
          <button class="tiny-button" type="button" data-delete-audio="${recording.id}" aria-label="Eliminar audio" title="Eliminar audio">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </article>
    `).join("")
    : emptyState("Aún no hay audios guardados para esta clase.");
  renderIcons();
}

async function downloadAudio(recordingId) {
  const blob = await getAudioBlob(recordingId).catch(() => null);
  if (!blob) {
    alert("No encontré ese audio en este navegador.");
    return;
  }

  const recording = state.classes.flatMap((item) => item.recordings || []).find((item) => item.id === recordingId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audio-clase-${toDateInput(new Date(recording && recording.date ? recording.date : Date.now()))}.webm`;
  link.click();
  URL.revokeObjectURL(url);
}

async function playAudio(recordingId) {
  const player = document.querySelector(`[data-audio-player="${recordingId}"]`);
  if (!player) return;

  if (!player.src) {
    const blob = await getAudioBlob(recordingId).catch(() => null);
    if (!blob) {
      alert("No encontré ese audio en este navegador.");
      return;
    }
    player.src = URL.createObjectURL(blob);
  }

  await player.play().catch(() => undefined);
}

async function deleteAudio(recordingId) {
  if (!confirm("¿Eliminar este audio?")) return;

  const player = document.querySelector(`[data-audio-player="${recordingId}"]`);
  if (player && player.src) URL.revokeObjectURL(player.src);
  await deleteAudioBlob(recordingId).catch(() => undefined);
  state.classes = state.classes.map((classItem) => ({
    ...classItem,
    recordings: (classItem.recordings || []).filter((recording) => recording.id !== recordingId)
  }));
  saveState();
  renderAudioHistory(getClassById($("#noteClassId").value));
}

function getCurrentClass(now) {
  return state.classes
    .filter((item) => item.days.includes(now.getDay()) && isClassCurrent(item, now))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

function getUpcomingClasses(now) {
  const today = now.getDay();
  const currentMinutes = getCurrentMinutes(now);

  return state.classes
    .filter((item) => item.days.includes(today) && timeToMinutes(item.start) >= currentMinutes)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function isClassCurrent(item, now) {
  const currentMinutes = getCurrentMinutes(now);
  return item.days.includes(now.getDay())
    && currentMinutes >= timeToMinutes(item.start)
    && currentMinutes < timeToMinutes(item.end);
}

function getTaskPromptDateTime(dateValue, item) {
  const classStart = dateTimeFromParts(dateValue, item.start);
  const classEnd = dateTimeFromParts(dateValue, item.end);
  const minutes = Number(state.settings.taskPromptMinutes || 10);
  const promptTime = addMinutes(classEnd, -minutes);
  return promptTime < classStart ? classStart : promptTime;
}

function getTaskPromptMinute(item) {
  const startMinutes = timeToMinutes(item.start);
  const endMinutes = timeToMinutes(item.end);
  const minutes = Number(state.settings.taskPromptMinutes || 10);
  return Math.max(startMinutes, endMinutes - minutes);
}

function checkClassNotifications(now) {
  if (getLocalNotificationsPlugin()) return;

  const today = toDateInput(now);
  const currentMinutes = getCurrentMinutes(now);

  state.classes.forEach((item) => {
    if (!item.days.includes(now.getDay())) return;

    const startMinutes = timeToMinutes(item.start);
    const minutesLeft = startMinutes - currentMinutes;

    if (state.settings.taskPromptEnabled && isClassCurrent(item, now) && currentMinutes === getTaskPromptMinute(item)) {
      notifyOnce(
        `${today}:task-prompt:${item.id}`,
        "¿Alguna tarea?",
        `¿Alguna tarea de ${getClassDisplayName(item)}?`,
        { classId: item.id, quickTask: true }
      );
    }

    if (state.settings.classStartEnabled && minutesLeft === state.settings.classStartMinutes) {
      notifyOnce(`${today}:class-start:${item.id}`, "Clase por iniciar", `${getClassDisplayName(item)} inicia en ${minutesLeft} min.`, { classId: item.id });
    }
  });
}

function checkTaskNotifications(now) {
  if (getLocalNotificationsPlugin()) return;

  const today = toDateInput(now);
  const currentTime = toTimeInput(now);

  state.tasks.forEach((task) => {
    if (!isTaskDueOn(task, now) || isTaskComplete(task, today) || task.time !== currentTime) return;
    notifyOnce(`${today}:task:${task.id}`, "Recordatorio", task.title, { taskId: task.id, classId: task.classId });
  });
}

function notifyOnce(key, title, body, data = {}) {
  if (state.notified[key]) return;
  state.notified[key] = true;
  saveState();
  sendNotification(title, body, data, key);
}

async function sendNotification(title, body, data = {}, key = `${Date.now()}`) {
  const localNotifications = getLocalNotificationsPlugin();
  if (localNotifications) {
    const permission = await getNotificationPermission();
    if (permission !== "granted") return;

    const sound = getNotificationSoundConfig();
    await ensureNativeNotificationChannel(getNotificationSoundKey());
    const notification = {
      id: notificationIdFromKey(key),
      title,
      body,
      channelId: sound.channelId,
      extra: data,
      autoCancel: true
    };

    if (sound.sound) notification.sound = sound.sound;
    await localNotifications.schedule({ notifications: [notification] }).catch(() => undefined);
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      const options = {
        body,
        data,
        icon: "assets/icon.svg",
        badge: "assets/icon.svg"
      };

      if (data.quickTask) {
        options.actions = [{ action: "quickTask", title: "Anotar tarea" }];
      }

      registration.showNotification(title, options);
    });
    return;
  }

  new Notification(title, { body, icon: "assets/icon.svg", data });
}

function notificationIdFromKey(key) {
  let hash = 0;
  for (let index = 0; index < key.length; index++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index);
    hash |= 0;
  }
  return (Math.abs(hash) % 2147483647) || Math.floor(Date.now() % 2147483647);
}

function exportBackup() {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `apphorario-respaldo-${toDateInput(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.classes) || !Array.isArray(imported.tasks)) {
        throw new Error("Formato inválido");
      }

      state = normalizeState({
        ...defaultState,
        ...imported,
        settings: { ...defaultState.settings, ...imported.settings },
        exams: imported.exams || [],
        notified: imported.notified || {}
      });
      saveState();
      render();
      tick();
      rescheduleNativeNotificationsSoon();
      alert("Respaldo importado.");
    } catch {
      alert("No pude importar ese archivo. Revisa que sea un respaldo de AppHorario.");
    } finally {
      elements.importFile.value = "";
    }
  });
  reader.readAsText(file);
}

function openAudioDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(AUDIO_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function saveAudioBlob(id, blob) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).put(blob, id);
    transaction.addEventListener("complete", () => {
      db.close();
      resolve();
    });
    transaction.addEventListener("error", () => {
      db.close();
      reject(transaction.error);
    });
  });
}

async function getAudioBlob(id) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readonly");
    const request = transaction.objectStore(AUDIO_STORE_NAME).get(id);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("complete", () => db.close());
  });
}

async function deleteAudioBlob(id) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).delete(id);
    transaction.addEventListener("complete", () => {
      db.close();
      resolve();
    });
    transaction.addEventListener("error", () => {
      db.close();
      reject(transaction.error);
    });
  });
}

function getClassName(id) {
  const classItem = getClassById(id);
  return classItem ? getClassDisplayName(classItem) : "";
}

function getClassById(id) {
  return state.classes.find((item) => item.id === id);
}

function getTasksForClass(classId) {
  return getSortedTasks(state.tasks.filter((task) => task.classId === classId));
}

function getSortedExams(exams) {
  return exams
    .slice()
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function getSortedTasks(tasks) {
  return tasks
    .slice()
    .sort((a, b) => {
      const aPriority = Object.prototype.hasOwnProperty.call(PRIORITY_ORDER, a.priority || "normal") ? PRIORITY_ORDER[a.priority || "normal"] : 1;
      const bPriority = Object.prototype.hasOwnProperty.call(PRIORITY_ORDER, b.priority || "normal") ? PRIORITY_ORDER[b.priority || "normal"] : 1;
      const priority = aPriority - bPriority;
      if (priority !== 0) return priority;
      return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    });
}

function isTaskDueOn(task, date) {
  const taskDate = new Date(`${task.date}T00:00:00`);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const repeat = task.repeat || "none";

  if (repeat === "daily") return targetDate >= taskDate;
  if (repeat === "weekly") return targetDate >= taskDate && targetDate.getDay() === taskDate.getDay();
  return task.date === toDateInput(date);
}

function isTaskComplete(task, dateValue) {
  if ((task.repeat || "none") === "none") return Boolean(task.done);
  return (task.completedDates || []).includes(dateValue);
}

function refreshOpenClassDetail() {
  const dialog = $("#notesDialog");
  if (!dialog.open) return;

  const item = state.classes.find((classItem) => classItem.id === $("#noteClassId").value);
  if (!item) {
    closeDialog("notesDialog");
    return;
  }

  renderClassDetail(item);
  renderNotesHistory(item);
  renderAudioHistory(item);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMinutes(date, amount) {
  return new Date(date.getTime() + amount * 60 * 1000);
}

function dateTimeFromParts(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue || "00:00"}:00`);
}

function toTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function darkenColor(hex, amount) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const red = Math.max(0, ((value >> 16) & 255) - amount);
  const green = Math.max(0, ((value >> 8) & 255) - amount);
  const blue = Math.max(0, (value & 255) - amount);
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
