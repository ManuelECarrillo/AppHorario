const STORAGE_KEY = "appHorario.state.v1";
const AUDIO_DB_NAME = "appHorario.audio.v1";
const AUDIO_STORE_NAME = "recordings";
const PHOTO_STORE_NAME = "photos";
const APP_NOTIFICATION_ICON = "assets/icon-192.png";
const DEFAULT_SII_LOGIN_URL = "https://siit.itdurango.edu.mx/sistema/acceso.php";
const SII_CLASS_SOURCE = "sii";
const MOODLE_TASK_SOURCE = "moodle";
const MOODLE_CREDS_KEY = "appHorario.moodle.creds.v1";
const MOODLE_LOGIN_URL = "https://plataforma.itdurango.edu.mx/login/index.php";
const MOODLE_UPCOMING_URL = "https://plataforma.itdurango.edu.mx/calendar/view.php?view=upcoming";
const GEOCODING_API_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_GEOCODING_API_URL = "https://photon.komoot.io/api/";
const ROUTING_API_URL = "https://router.project-osrm.org/route/v1";
const OSM_ROUTING_API_URLS = {
  car: "https://routing.openstreetmap.de/routed-car/route/v1",
  walk: "https://routing.openstreetmap.de/routed-foot/route/v1",
  bike: "https://routing.openstreetmap.de/routed-bike/route/v1",
  bus: "https://routing.openstreetmap.de/routed-car/route/v1"
};
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
    channelId: "apphorario_chime_v3",
    name: "AppHorario - Campana suave",
    label: "Campana suave",
    desc: "Tono suave y agradable",
    icon: "bell",
    previewFile: "sounds/apphorario_chime.wav",
    sound: "apphorario_chime",
    vibration: true
  },
  focus: {
    channelId: "apphorario_focus_v3",
    name: "AppHorario - Pulso de estudio",
    label: "Pulso de estudio",
    desc: "Tono discreto para concentración",
    icon: "zap",
    previewFile: "sounds/apphorario_focus.wav",
    sound: "apphorario_focus",
    vibration: true
  },
  digital: {
    channelId: "apphorario_digital_v3",
    name: "AppHorario - Digital claro",
    label: "Digital claro",
    desc: "Tono electrónico moderno",
    icon: "radio",
    previewFile: "sounds/apphorario_digital.wav",
    sound: "apphorario_digital",
    vibration: true
  },
  system: {
    channelId: "apphorario_system_v1",
    name: "AppHorario - Predeterminado",
    label: "Predeterminado del sistema",
    desc: "Usa el sonido que tienes configurado en Android",
    icon: "smartphone",
    previewFile: "",
    sound: "",
    vibration: true
  },
  silent: {
    channelId: "apphorario_silent_v3",
    name: "AppHorario - Solo vibración",
    label: "Solo vibración",
    desc: "Sin sonido, solo vibración",
    icon: "vibrate",
    previewFile: "",
    sound: "",
    vibration: true
  }
};

function haptic(pattern = 50) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ICON_PATHS = {
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
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
  search: '<path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/>',
  "panel-right-open": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="m10 9 3 3-3 3"/>',
  "check-check": '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  "map-pin": '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 5.8A3 3 0 0 0 15.7 4H8.3a3 3 0 0 0-2.7 1.8L3.5 11.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 11h14"/>',
  footprints: '<path d="M4 16v-2.4a2.4 2.4 0 0 1 4.8 0V16a2.4 2.4 0 0 1-4.8 0Z"/><path d="M13.2 8V5.6a2.4 2.4 0 0 1 4.8 0V8a2.4 2.4 0 0 1-4.8 0Z"/><path d="M8.8 18.4c0 1.3-1.1 2.4-2.4 2.4S4 19.7 4 18.4"/><path d="M18 10.4c0 1.3-1.1 2.4-2.4 2.4s-2.4-1.1-2.4-2.4"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l1.5 11.5"/><path d="M9 6l3 5 3-5"/><path d="M12 11 8.5 17.5"/><path d="M12 11h4l2.5 6.5"/><path d="M9 6H7"/>',
  bus: '<path d="M8 6v6"/><path d="M16 6v6"/><path d="M6 19v2"/><path d="M18 19v2"/><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M8 16h.01"/><path d="M16 16h.01"/>',
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
    timeFormat: "24",
    todayViewMode: "full",
    weekViewMode: "full",
    taskPromptMinutes: 10,
    classStartMinutes: 5,
    notificationSound: "chime",
    taskNotificationSound: "digital",
    schoolLocationText: "",
    schoolLat: "",
    schoolLng: "",
    commuteCarEnabled: false,
    commuteWalkEnabled: false,
    commuteBikeEnabled: false,
    commuteBusEnabled: false,
    taskPromptEnabled: true,
    classStartEnabled: true,
    maxRecordingsPerClass: 20
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
let photoViewerUrl = "";
let commuteLastUpdatedAt = 0;
let commuteUpdating = false;
let schoolAddressResults = [];
let lastGeocodingAt = 0;
let schoolMapAddressResults = [];
let schoolMapState = {
  centerLat: 24.0277,
  centerLng: -104.6532,
  selectedLat: null,
  selectedLng: null,
  zoom: 15,
  dragging: false,
  moved: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startCenterX: 0,
  startCenterY: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// Cached DOM references. Keeping them in one object makes event wiring and
// render functions easier to scan without repeating selectors everywhere.
const elements = {
  appTitle: $("#appTitle"),
  currentTime: $("#currentTime"),
  classStatusLabel: $("#classStatusLabel"),
  nextClassText: $("#nextClassText"),
  commuteSummary: $("#commuteSummary"),
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
  taskClassFilter: $("#taskClassFilter"),
  examClass: $("#examClass"),
  classDetailMeta: $("#classDetailMeta"),
  classDetailTasks: $("#classDetailTasks"),
  classDetailExams: $("#classDetailExams"),
  audioHistory: $("#audioHistory"),
  recordAudioButton: $("#recordAudioButton"),
  stopAudioButton: $("#stopAudioButton"),
  recordingStatus: $("#recordingStatus"),
  photoInput: $("#boardPhotoInput"),
  photoGallery: $("#photoGallery"),
  photoViewerImage: $("#photoViewerImage"),
  photoViewerDate: $("#photoViewerDate"),
  photoViewerDownloadButton: $("#photoViewerDownloadButton"),
  gradesButton: $("#gradesButton"),
  gradesMessage: $("#gradesMessage"),
  gradesSubmitButton: $("#gradesSubmitButton"),
  gradesList: $("#gradesList"),
  moodleMessage: $("#moodleMessage"),
  moodleSubmitButton: $("#moodleSubmitButton"),
  moodleImportedList: $("#moodleImportedList"),
  moodleSubToolbar: $("#moodleSubToolbar"),
  taskManualToolbar: $("#taskManualToolbar"),
  moodleImportedBadge: $("#moodleImportedBadge"),
  notifyButton: $("#notifyButton"),
  testNotificationButton: $("#testNotificationButton"),
  siiStatus: $("#siiStatus"),
  siiLoginMessage: $("#siiLoginMessage"),
  siiSubmitButton: $("#siiSubmitButton"),
  installButton: $("#installButton"),
  exportButton: $("#exportButton"),
  importFile: $("#importFile"),
  schoolLocationInput: $("#schoolLocationInput"),
  searchSchoolAddressButton: $("#searchSchoolAddressButton"),
  schoolAddressResults: $("#schoolAddressResults"),
  useCurrentLocationButton: $("#useCurrentLocationButton"),
  mapAddressSearchInput: $("#mapAddressSearchInput"),
  mapAddressSearchButton: $("#mapAddressSearchButton"),
  centerMapOnCurrentLocationButton: $("#centerMapOnCurrentLocationButton"),
  mapAddressResults: $("#mapAddressResults"),
  schoolMapPicker: $("#schoolMapPicker"),
  schoolMapTileLayer: $("#schoolMapTileLayer"),
  schoolMapMarker: $("#schoolMapMarker"),
  mapSelectedLocationText: $("#mapSelectedLocationText"),
  mapZoomInButton: $("#mapZoomInButton"),
  mapZoomOutButton: $("#mapZoomOutButton"),
  confirmSchoolLocationButton: $("#confirmSchoolLocationButton"),
  installHint: $("#installHint"),
  settings: {
    appTitle: $("#appTitleInput"),
    themeMode: $("#themeMode"),
    timeFormat: $("#timeFormat"),
    primaryColor: $("#primaryColor"),
    accentColor: $("#accentColor"),
    backgroundColor: $("#backgroundColor"),
    taskPromptMinutes: $("#taskPromptMinutes"),
    classStartMinutes: $("#classStartMinutes"),
    notificationSound: $("#notificationSound"),
    taskNotificationSound: $("#taskNotificationSound"),
    commuteCarEnabled: $("#commuteCarEnabled"),
    commuteWalkEnabled: $("#commuteWalkEnabled"),
    commuteBikeEnabled: $("#commuteBikeEnabled"),
    commuteBusEnabled: $("#commuteBusEnabled"),
    taskPromptEnabled: $("#taskPromptEnabled"),
    classStartEnabled: $("#classStartEnabled"),
    maxRecordingsPerClass: $("#maxRecordingsPerClass")
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

// App startup and global event wiring.
function pruneNotified() {
  const today = toDateInput(new Date());
  state.notified = Object.fromEntries(
    Object.entries(state.notified).filter(([key]) => key.startsWith(today))
  );
}

function init() {
  pruneNotified();
  render();
  tick();
  setInterval(tick, 30_000);
  renderIcons();

  safeRun(bindTabs);
  safeRun(bindViewControls);
  safeRun(bindTaskFilters);
  safeRun(bindDialogs);
  safeRun(bindForms);
  safeRun(bindSettings);
  safeRun(bindSoundPickers);
  safeRun(bindCommuteSettings);
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
  safeRun(bindToastUndo);
  safeRun(bindOfflineBanner);
  safeRun(bindStorageIndicator);
  safeRun(bindExportSchedule);
  if (typeof bindPinSettings === "function") safeRun(bindPinSettings);
  if (typeof bindSiiLogButton === "function") safeRun(bindSiiLogButton);
  if (typeof bindMoodleDialog === "function") safeRun(bindMoodleDialog);
  if (typeof bindMoodleTaskView === "function") safeRun(bindMoodleTaskView);
  if (typeof checkEncryptedStartup === "function") {
    checkEncryptedStartup().catch(() => undefined).then(completeStartup);
    return;
  }
  completeStartup();
}

function showStartupError(message) {
  const schedule = document.querySelector("#todaySchedule");
  if (!schedule || schedule.dataset.hasStartupError) return;

  schedule.dataset.hasStartupError = "true";
  schedule.innerHTML = `<div class="empty-state">Error de inicio: ${escapeHtml(message)}</div>`;
  completeStartup();
}

function completeStartup() {
  const loader = $("#appLoader");
  if (!loader) return;

  window.setTimeout(() => {
    loader.classList.add("done");
  }, 360);
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
      room: item.room || "",
      teacher: item.teacher || "",
      notes: item.notes || [],
      recordings: item.recordings || [],
      photos: item.photos || []
    })),
    tasks: nextState.tasks.map((task) => ({
      ...task,
      priority: task.priority || "normal",
      repeat: task.repeat || "none",
      dueTime: task.dueTime || task.time || "",
      reminderTime: task.reminderTime || task.time || "",
      completedDates: task.completedDates || [],
      source: task.source || "",
      externalId: task.externalId || ""
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
  if (typeof isPinEnabled === "function" && isPinEnabled()) {
    if (typeof schedulePinEncryptedSave === "function") schedulePinEncryptedSave();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (error && (error.name === "QuotaExceededError" || error.code === 22)) {
      alert("No hay suficiente espacio en el dispositivo para guardar los cambios. Ve a Ajustes y elimina grabaciones o fotos antiguas para liberar espacio.");
    }
  }
}
