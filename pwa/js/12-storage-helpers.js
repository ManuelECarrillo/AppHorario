// Local export/import and IndexedDB blob storage.
async function exportBackup() {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const filename = `apphorario-respaldo-${toDateInput(new Date())}.json`;
  const backupPlugin = getBackupPlugin();

  if (backupPlugin && isNativeRuntime()) {
    try {
      const result = await backupPlugin.saveBackup({ filename, content: payload });
      alert(`Respaldo guardado en ${result && result.location ? result.location : "Descargas"}.`);
      return;
    } catch {
      alert("No pude exportar el respaldo en Android.");
      return;
    }
  }

  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
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
    const request = indexedDB.open(AUDIO_DB_NAME, 2);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) db.createObjectStore(AUDIO_STORE_NAME);
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) db.createObjectStore(PHOTO_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function saveAudioBlob(id, blob) {
  return saveStoredBlob(AUDIO_STORE_NAME, id, blob);
}

async function getAudioBlob(id) {
  return getStoredBlob(AUDIO_STORE_NAME, id);
}

async function deleteAudioBlob(id) {
  return deleteStoredBlob(AUDIO_STORE_NAME, id);
}

async function savePhotoBlob(id, blob) {
  return saveStoredBlob(PHOTO_STORE_NAME, id, blob);
}

async function getPhotoBlob(id) {
  return getStoredBlob(PHOTO_STORE_NAME, id);
}

async function deletePhotoBlob(id) {
  return deleteStoredBlob(PHOTO_STORE_NAME, id);
}

async function checkStorageAvailable(blobSize) {
  if (!navigator.storage || !navigator.storage.estimate) return;
  const estimate = await navigator.storage.estimate().catch(() => null);
  if (!estimate || !estimate.quota) return;
  const free = estimate.quota - (estimate.usage || 0);
  if (free < blobSize + 5 * 1024 * 1024) {
    throw Object.assign(
      new Error("No hay suficiente espacio en el dispositivo. Elimina grabaciones o fotos antiguas para liberar espacio."),
      { code: "storage_quota" }
    );
  }
}

async function saveStoredBlob(storeName, id, blob) {
  await checkStorageAvailable(blob ? blob.size || 0 : 0);
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(blob, id);
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

async function getStoredBlob(storeName, id) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(id);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("complete", () => db.close());
  });
}

async function deleteStoredBlob(storeName, id) {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
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
  const taskDateStr = task.date;
  const targetDateStr = toDateInput(date);
  const repeat = task.repeat || "none";

  if (repeat === "daily") return targetDateStr >= taskDateStr;
  if (repeat === "weekly") {
    if (targetDateStr < taskDateStr) return false;
    const taskDay = new Date(`${taskDateStr}T12:00:00`).getDay();
    const targetDay = new Date(`${targetDateStr}T12:00:00`).getDay();
    return taskDay === targetDay;
  }
  return taskDateStr === targetDateStr;
}

function isTaskComplete(task, dateValue) {
  if ((task.repeat || "none") === "none") return Boolean(task.done);
  return (task.completedDates || []).includes(dateValue);
}

// Shared date, time and formatting helpers.
function getDaysUntil(dateValue) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

function formatDaysLeft(daysLeft) {
  if (daysLeft < 0) return `Hace ${Math.abs(daysLeft)} d`;
  if (daysLeft === 0) return "Hoy";
  if (daysLeft === 1) return "Manana";
  return `Faltan ${daysLeft} d`;
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

function getTimeFormat() {
  return state.settings.timeFormat === "12" ? "12" : "24";
}

function formatClockTime(date) {
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: getTimeFormat() === "12"
  });
}

function formatDisplayTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value || "";

  if (getTimeFormat() !== "12") {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDisplayTimeRange(start, end) {
  return `${formatDisplayTime(start)} - ${formatDisplayTime(end)}`;
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

function emptyState(text, icon = "") {
  const iconHtml = icon ? `<i data-lucide="${icon}"></i>` : "";
  return `<div class="empty-state">${iconHtml}<p>${text}</p></div>`;
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
