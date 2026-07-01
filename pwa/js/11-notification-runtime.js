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

// Notification scheduling and delivery.
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
    if (!isTaskDueOn(task, now) || isTaskComplete(task, today) || (task.reminderTime || task.time) !== currentTime) return;
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

    const soundKey = getNotificationSoundKeyForData(data);
    const sound = getNotificationSoundConfig(soundKey);
    await ensureNativeNotificationChannel(soundKey);
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
        icon: APP_NOTIFICATION_ICON,
        badge: APP_NOTIFICATION_ICON
      };

      if (data.quickTask) {
        options.actions = [{ action: "quickTask", title: "Anotar tarea" }];
      }

      registration.showNotification(title, options);
    });
    return;
  }

  new Notification(title, { body, icon: APP_NOTIFICATION_ICON, data });
}

function notificationIdFromKey(key) {
  let hash = 0;
  for (let index = 0; index < key.length; index++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index);
    hash |= 0;
  }
  return (Math.abs(hash) % 2147483646) + 1;
}
