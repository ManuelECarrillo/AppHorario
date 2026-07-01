function bindNotifications() {
  updateNotificationButton();
  rescheduleNativeNotificationsSoon();
  elements.notifyButton.addEventListener("click", async () => {
    const permission = await getNotificationPermission();
    const isActive = permission === "granted" && !state.settings.notificationsPaused;

    if (isActive) {
      const confirmed = await showConfirmDialog(
        "Desactivar notificaciones",
        "Puedes volver a activarlas tocando este mismo botón."
      );
      if (confirmed) {
        state.settings.notificationsPaused = true;
        saveState();
        const localNotifications = getLocalNotificationsPlugin();
        if (localNotifications) await cancelPendingNativeNotifications(localNotifications);
        state.nativeNotificationIds = [];
        saveState();
        showToast("Notificaciones desactivadas.");
      }
      updateNotificationButton();
      return;
    }

    state.settings.notificationsPaused = false;
    saveState();

    if (permission === "granted") {
      await rescheduleNativeNotifications();
      showToast("Notificaciones reactivadas.");
    } else {
      const granted = await requestNotificationPermission();
      if (!granted) {
        await showConfirmDialog("Sin permiso", "No se activaron las notificaciones. Revisa el permiso en ajustes del teléfono.", { alertOnly: true });
      } else if (!await ensureExactNotificationPermission({ prompt: true })) {
        await rescheduleNativeNotifications();
        showToast("Notificaciones activas. Para avisos exactos activa Alarmas en Ajustes de Android.");
      } else {
        await rescheduleNativeNotifications();
        showToast("Notificaciones activadas.");
      }
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
  const active = permission === "granted" && !state.settings.notificationsPaused;
  const label = active ? "Desactivar notificaciones" : "Activar notificaciones";
  elements.notifyButton.setAttribute("aria-label", label);
  elements.notifyButton.setAttribute("title", label);
  elements.notifyButton.classList.toggle("enabled", active);
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

function getCameraPlugin() {
  return window.Capacitor && window.Capacitor.Plugins
    ? window.Capacitor.Plugins.Camera
    : null;
}

function getBackupPlugin() {
  return window.Capacitor && window.Capacitor.Plugins
    ? window.Capacitor.Plugins.AppHorarioBackup
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

function getTaskNotificationSoundKey() {
  const key = state.settings.taskNotificationSound || "digital";
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_SOUNDS, key) ? key : "digital";
}

function getNotificationSoundConfig(soundKey = getNotificationSoundKey()) {
  return NOTIFICATION_SOUNDS[soundKey] || NOTIFICATION_SOUNDS.chime;
}

function getNotificationSoundKeyForData(data = {}) {
  return data.taskId ? getTaskNotificationSoundKey() : getNotificationSoundKey();
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

  if (state.settings.notificationsPaused) {
    await cancelPendingNativeNotifications(localNotifications);
    return;
  }

  await ensureExactNotificationPermission();
  // Pre-create all sound channels so they're ready when needed
  for (const key of Object.keys(NOTIFICATION_SOUNDS)) {
    await ensureNativeNotificationChannel(key);
  }
  await ensureNativeNotificationChannel(getNotificationSoundKey());
  await ensureNativeNotificationChannel(getTaskNotificationSoundKey());

  await cancelPendingNativeNotifications(localNotifications);

  const previousIds = state.nativeNotificationIds || [];
  if (previousIds.length) {
    await localNotifications.cancel({
      notifications: previousIds.map((id) => ({ id }))
    }).catch(() => undefined);
  }

  const notifications = buildNativeNotificationSchedule(new Date());
  const BATCH = 100;
  for (let i = 0; i < notifications.length; i += BATCH) {
    await localNotifications.schedule({ notifications: notifications.slice(i, i + BATCH) }).catch(() => undefined);
  }

  state.nativeNotificationIds = notifications.map((notification) => notification.id);
  saveState();
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
  const limit = 300;
  const RECURRING_CAP = 4;
  const recurringTaskCount = {};

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
        let minutes;
        let body;
        if (state.settings.classStartNotifyMode === "commute") {
          const cache = state.commuteMinutesCache || {};
          const modes = getEnabledCommuteModes();
          const times = modes.map((m) => cache[m.key]).filter(Boolean);
          if (times.length) {
            const travel = Math.min(...times);
            const buffer = Number(state.settings.classStartCommuteBuffer ?? 5);
            minutes = travel + buffer;
            body = `${getClassDisplayName(item)} — ¡Sal ya! ~${travel} min de traslado`;
          } else {
            minutes = Number(state.settings.classStartMinutes || 5);
            body = `${getClassDisplayName(item)} inicia en ${minutes} min.`;
          }
        } else {
          minutes = Number(state.settings.classStartMinutes || 5);
          body = `${getClassDisplayName(item)} inicia en ${minutes} min.`;
        }
        const at = addMinutes(classStart, -minutes);
        scheduled.push({
          key: `${dateValue}:class-start:${item.id}`,
          title: "Clase por iniciar",
          body,
          at,
          extra: { classId: item.id }
        });
      }
    });

    state.tasks.forEach((task) => {
      if (!isTaskDueOn(task, day) || isTaskComplete(task, dateValue)) return;
      const reminderAt = task.reminderTime || task.time;
      if (!reminderAt) return;
      const isRecurring = task.repeat && task.repeat !== "none";
      if (isRecurring) {
        recurringTaskCount[task.id] = (recurringTaskCount[task.id] || 0) + 1;
        if (recurringTaskCount[task.id] > RECURRING_CAP) return;
      }
      scheduled.push({
        key: `${dateValue}:task:${task.id}`,
        title: "Recordatorio",
        body: task.title,
        at: dateTimeFromParts(dateValue, reminderAt),
        extra: { taskId: task.id, classId: task.classId },
        soundKey: getTaskNotificationSoundKey()
      });
    });
  }

  // Pre-schedule hourly reminders for the last 24 h before each Moodle task's due date.
  // All alarms are set in advance so the app does NOT need to be open on that day.
  state.tasks
    .filter((task) => task.source === MOODLE_TASK_SOURCE && !isTaskComplete(task, toDateInput(now)))
    .forEach((task) => {
      const dueAt = dateTimeFromParts(task.date, task.dueTime || task.time || "23:59");
      if (dueAt <= now) return;

      const windowStart = new Date(dueAt.getTime() - 24 * 60 * 60 * 1000);
      const scheduleFrom = new Date(Math.max(windowStart.getTime(), now.getTime()));
      const nextHour = new Date(scheduleFrom);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);

      for (let t = new Date(nextHour); t < dueAt; t = new Date(t.getTime() + 60 * 60 * 1000)) {
        const hour = t.getHours();
        if (hour < 8 || hour >= 23) continue;
        const hoursLeft = Math.max(1, Math.round((dueAt - t) / (60 * 60 * 1000)));
        scheduled.push({
          key: `moodle-urgent:${task.id}:${toDateInput(t)}:${hour}`,
          title: `Tarea Moodle — ${hoursLeft}h restante${hoursLeft !== 1 ? "s" : ""}`,
          body: task.title,
          at: new Date(t),
          extra: { taskId: task.id },
          soundKey: getTaskNotificationSoundKey()
        });
      }
    });

  return scheduled
    .filter((item) => item.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map((item) => {
      const sound = getNotificationSoundConfig(item.soundKey || getNotificationSoundKey());
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

async function cancelTaskNotificationImmediate(taskId) {
  const localNotifications = getLocalNotificationsPlugin();
  if (!localNotifications) return;
  const today = toDateInput(new Date());
  const key = `${today}:task:${taskId}`;
  const id = notificationIdFromKey(key);
  await localNotifications.cancel({ notifications: [{ id }] }).catch(() => undefined);
}

async function cancelOldExamNotifications(taskIds) {
  const localNotifications = getLocalNotificationsPlugin();
  if (!localNotifications || !taskIds.length) return;
  const today = new Date();
  const notifications = [];
  for (let offset = 0; offset <= 30; offset++) {
    const dateValue = toDateInput(addDays(today, offset));
    taskIds.forEach((taskId) => {
      notifications.push({ id: notificationIdFromKey(`${dateValue}:task:${taskId}`) });
    });
  }
  await localNotifications.cancel({ notifications }).catch(() => undefined);
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
