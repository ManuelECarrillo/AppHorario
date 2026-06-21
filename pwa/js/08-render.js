let toastTimer = null;
let undoTimer = null;
let undoAction = null;

function showToast(message, options = {}) {
  const el = document.getElementById("toast");
  if (!el) return;

  clearTimeout(toastTimer);
  clearTimeout(undoTimer);
  undoAction = null;

  if (options.undo) {
    undoAction = options.undo;
    el.innerHTML = `${escapeHtml(message)} <button class="toast-undo" type="button">Deshacer</button>`;
    el.classList.add("visible");
    undoTimer = setTimeout(() => {
      undoAction = null;
      el.classList.remove("visible");
    }, 5000);
  } else {
    el.textContent = message;
    el.classList.add("visible");
    toastTimer = setTimeout(() => el.classList.remove("visible"), 2200);
  }
}

function animateCardRemoval(buttonSelector, callback) {
  const button = document.querySelector(buttonSelector);
  const card = button ? button.closest("article, .card") : null;
  if (!card) {
    callback();
    return;
  }
  card.classList.add("removing");
  card.addEventListener("animationend", () => callback(), { once: true });
  setTimeout(callback, 360);
}

function bindToastUndo() {
  document.getElementById("toast").addEventListener("click", (event) => {
    if (!event.target.classList.contains("toast-undo")) return;
    if (undoAction) {
      undoAction();
      undoAction = null;
    }
    clearTimeout(undoTimer);
    document.getElementById("toast").classList.remove("visible");
  });
}

// Main rendering pipeline.
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
  renderTaskClassOptions();
  renderTaskFilterOptions();
  renderTasks();
  renderMoodleImportedTasks();
  renderExamClassOptions();
  bindDynamicActions();
  refreshOpenClassDetail();

  renderIcons();
}

function renderMoodleImportedTasks() {
  const container = document.getElementById("moodleImportedList");
  if (!container || container.hidden) {
    // Update badge even when tab is hidden
    const badge = document.getElementById("moodleImportedBadge");
    if (badge) {
      const today = toDateInput(new Date());
      const pending = state.tasks.filter(
        (t) => t.source === MOODLE_TASK_SOURCE && !isTaskComplete(t, today)
      );
      badge.textContent = pending.length || "";
    }
    return;
  }

  const today = toDateInput(new Date());
  const moodleTasks = state.tasks.filter((t) => t.source === MOODLE_TASK_SOURCE);

  const badge = document.getElementById("moodleImportedBadge");
  if (badge) {
    const pendingCount = moodleTasks.filter((t) => !isTaskComplete(t, today)).length;
    badge.textContent = pendingCount || "";
  }

  if (!moodleTasks.length) {
    container.innerHTML = emptyState(
      "Sin tareas de Moodle importadas. Toca ↺ para sincronizar.",
      "book-marked"
    );
    renderIcons();
    return;
  }

  const sort = window._moodleImportedSort || "date";

  if (sort === "course") {
    const byGroup = {};
    moodleTasks.forEach((t) => {
      const key = t.details || "Sin materia";
      (byGroup[key] = byGroup[key] || []).push(t);
    });
    container.innerHTML = Object.keys(byGroup)
      .sort()
      .map(
        (course) => `
      <section class="task-group">
        <h3>${escapeHtml(course)}</h3>
        ${getSortedTasks(byGroup[course]).map(renderTaskCard).join("")}
      </section>`
      )
      .join("");
  } else {
    const sorted = getSortedTasks(moodleTasks);
    const pending = sorted.filter((t) => !isTaskComplete(t, today));
    const done = sorted.filter((t) => isTaskComplete(t, today));
    container.innerHTML = `
      <section class="task-group">
        <h3>Pendientes</h3>
        ${pending.length ? pending.map(renderTaskCard).join("") : emptyState("No hay tareas Moodle pendientes.")}
      </section>
      <section class="task-group">
        <h3>Completadas</h3>
        ${done.length ? done.map(renderTaskCard).join("") : emptyState("Ninguna completada aún.")}
      </section>`;
  }

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
  elements.currentTime.textContent = formatClockTime(now);

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
      ? `${getClassDisplayName(next)} a las ${formatDisplayTime(next.start)}${location ? ` · ${location}` : ""}`
      : "Sin clases próximas";
  }

  renderSmartPanel();
  renderTodaySchedule();
  checkClassNotifications(now);
  checkTaskNotifications(now);
  updateCommuteSummary();
}

// Commute estimates and school location helpers.
function updateCommuteSummary(force = false) {
  if (!elements.commuteSummary) return;

  if (!getEnabledCommuteModes().length) {
    elements.commuteSummary.hidden = true;
    elements.commuteSummary.innerHTML = "";
    return;
  }

  const school = getSchoolCoordinates();
  if (!school) {
    elements.commuteSummary.hidden = true;
    elements.commuteSummary.innerHTML = "";
    return;
  }

  const now = Date.now();
  if (!force && commuteLastUpdatedAt && now - commuteLastUpdatedAt < 120000) return;
  if (commuteUpdating) return;

  commuteUpdating = true;
  elements.commuteSummary.hidden = false;
  elements.commuteSummary.innerHTML = `<div class="commute-skeleton"><div class="skeleton-line" style="width:52px;height:10px;display:inline-block"></div><div class="skeleton-line" style="width:40px;height:10px;display:inline-block;margin-left:6px"></div></div>`;
  getCurrentPosition({ maximumAge: 120000, timeout: 8000 })
    .then(async (position) => {
      commuteLastUpdatedAt = Date.now();
      const distanceKm = getDistanceKm(position.coords.latitude, position.coords.longitude, school.lat, school.lng);
      const routeTimes = await getCommuteRouteTimes(position.coords, school, distanceKm);
      renderCommuteSummary(routeTimes);
    })
    .catch(() => {
      elements.commuteSummary.hidden = false;
      elements.commuteSummary.innerHTML = `<p class="muted">Activa ubicacion para ver tiempo a escuela.</p>`;
    })
    .finally(() => {
      commuteUpdating = false;
    });
}

function renderCommuteSummary(routeTimes) {
  if (!routeTimes.length) {
    elements.commuteSummary.hidden = true;
    elements.commuteSummary.innerHTML = "";
    return;
  }

  const ageMs = commuteLastUpdatedAt ? Date.now() - commuteLastUpdatedAt : 0;
  const ageMin = Math.floor(ageMs / 60000);
  const ageText = ageMin >= 2 ? `<span class="commute-age muted">Hace ${ageMin} min</span>` : "";

  elements.commuteSummary.hidden = false;
  elements.commuteSummary.innerHTML = `
    <div class="commute-pills">
      ${routeTimes.map((route) => `
        <span title="${route.label}${route.estimated ? " estimado" : " por ruta"}" aria-label="${route.label} ${route.minutes} minutos">
          <i data-lucide="${route.icon}"></i>
          ${route.estimated ? "~" : ""}${route.minutes} min
        </span>
      `).join("")}
    </div>
    ${ageText}
  `;
  renderIcons();
}

async function getCommuteRouteTimes(currentCoords, school, distanceKm) {
  const modes = getEnabledCommuteModes();
  if (!modes.length) return [];

  const routes = await Promise.all(modes.map(async (mode) => {
    try {
      const apiMinutes = await getRouteMinutes(currentCoords.latitude, currentCoords.longitude, school.lat, school.lng, mode.key);
      if (apiMinutes) {
        const adjustedMinutes = mode.key === "bus" ? apiMinutes + 8 : apiMinutes;
        return { ...mode, minutes: adjustedMinutes, estimated: mode.key === "bus" };
      }
    } catch (error) {
      console.warn(`Route API failed for ${mode.key}`, error);
    }

    return {
      ...mode,
      minutes: estimateTravelMinutes(distanceKm, mode.key),
      estimated: true
    };
  }));

  return routes;
}

async function getRouteMinutes(fromLat, fromLng, toLat, toLng, mode) {
  const profile = getRouteProfile(mode);
  if (!profile) return null;

  const urls = [
    `${OSM_ROUTING_API_URLS[mode] || OSM_ROUTING_API_URLS.car}/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=false&steps=false`,
    `${ROUTING_API_URL}/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false&alternatives=false&steps=false`
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {}, 5000);
      if (!response.ok) throw new Error(`Routing failed: ${response.status}`);

      const payload = await response.json();
      const durationSeconds = payload?.routes?.[0]?.duration;
      if (Number.isFinite(durationSeconds)) {
        return Math.max(1, Math.round(durationSeconds / 60));
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

function getRouteProfile(mode) {
  const profiles = {
    car: "driving",
    walk: "foot",
    bike: "bike",
    bus: "driving"
  };
  return profiles[mode] || null;
}

function getEnabledCommuteModes() {
  const modes = [
    { key: "car", label: "Auto", icon: "car", enabled: state.settings.commuteCarEnabled },
    { key: "walk", label: "Pie", icon: "footprints", enabled: state.settings.commuteWalkEnabled },
    { key: "bike", label: "Bici", icon: "bike", enabled: state.settings.commuteBikeEnabled },
    { key: "bus", label: "Camion", icon: "bus", enabled: state.settings.commuteBusEnabled }
  ];
  return modes.filter((mode) => mode.enabled);
}

function estimateTravelMinutes(distanceKm, mode) {
  const speeds = { car: 32, walk: 3.5, bike: 14, bus: 22 };
  const extra = mode === "bus" ? 8 : mode === "car" ? 3 : 0;
  return Math.max(1, Math.round((distanceKm / (speeds[mode] || 20)) * 60 + extra));
}

function getSchoolCoordinates() {
  const rawLat = String(state.settings.schoolLat ?? "").trim();
  const rawLng = String(state.settings.schoolLng ?? "").trim();
  const lat = rawLat === "" ? Number.NaN : Number(rawLat);
  const lng = rawLng === "" ? Number.NaN : Number(rawLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  const parsed = parseCoordinates(state.settings.schoolLocationText || "");
  return parsed;
}

function parseCoordinates(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const pairMatch = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const match = atMatch || pairMatch;
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function formatCoordinates(lat, lng) {
  if (lat === "" || lng === "" || lat === undefined || lng === undefined) return "";
  return `${lat}, ${lng}`;
}

// Network helper used by map, geocoding and routing APIs.
function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    });
  });
}

function getDistanceKm(fromLat, fromLng, toLat, toLng) {
  const radiusKm = 6371;
  const dLat = degreesToRadians(toLat - fromLat);
  const dLng = degreesToRadians(toLng - fromLng);
  const lat1 = degreesToRadians(fromLat);
  const lat2 = degreesToRadians(toLat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value) {
  return value * Math.PI / 180;
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
      ${current ? `
        <button class="text-button" type="button" data-capture-photo="${candidate.id}">
          <i data-lucide="camera"></i>
          Pizarron
        </button>
      ` : ""}
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
    : emptyState("No tienes clases registradas para hoy.", "calendar-x");
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
      <div class="time-pill">
        <strong>${formatDisplayTime(item.start)}</strong>
        ${isCurrent ? `<span class="status-chip">En clase</span>` : ""}
      </div>
      <div class="timeline-content">
        <h3>${escapeHtml(getClassDisplayName(item))}</h3>
        <p class="muted">${formatDisplayTime(item.end)}${location ? ` · ${escapeHtml(location)}` : ""}${pendingCount ? ` · ${pendingCount} tarea${pendingCount === 1 ? "" : "s"}` : ""}</p>
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
      <span>${formatDisplayTimeRange(item.start, item.end)}</span>
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
    : emptyState("Agrega tus materias para empezar.", "book-open");
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
          <p class="muted">${formatDisplayTimeRange(item.start, item.end)}${location ? ` · ${escapeHtml(location)}` : ""}${pendingCount ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : ""}</p>
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
  const selectedClass = elements.taskClassFilter ? elements.taskClassFilter.value : "";
  const searchEl = document.getElementById("taskSearch");
  const searchTerm = searchEl ? searchEl.value.trim().toLowerCase() : "";

  // Exclude Moodle-imported tasks from the manual tab
  const manualTasks = state.tasks.filter((task) => task.source !== MOODLE_TASK_SOURCE);

  let filteredTasks = selectedClass
    ? manualTasks.filter((task) => task.classId === selectedClass)
    : manualTasks;

  if (searchTerm) {
    filteredTasks = filteredTasks.filter((task) => {
      const classItem = state.classes.find((c) => c.id === task.classId);
      const className = classItem ? getClassDisplayName(classItem).toLowerCase() : "";
      return (
        (task.title || "").toLowerCase().includes(searchTerm) ||
        (task.details || "").toLowerCase().includes(searchTerm) ||
        className.includes(searchTerm)
      );
    });
  }

  const tasks = getSortedTasks(filteredTasks);
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
    : emptyState(selectedClass ? "No hay tareas para esta materia." : "Guarda tareas o recordatorios con una hora exacta.", "check-circle");

  const badge = document.getElementById("tasksBadge");
  if (badge) {
    const allPending = manualTasks.filter((task) => !isTaskComplete(task, today));
    const count = allPending.length;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  }
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
    : emptyState("Agrega fechas de examen para crear recordatorios de estudio.", "clipboard-list");
}

function renderExamCard(exam) {
  const className = getClassName(exam.classId);
  const classItem = getClassById(exam.classId);
  const daysLeft = getDaysUntil(exam.date);
  const reminders = exam.reminderDays
    .slice()
    .sort((a, b) => b - a)
    .map((day) => day === 0 ? "mismo día" : `${day} día${day === 1 ? "" : "s"} antes`)
    .join(", ");

  return `
    <article class="task-card exam-card" style="--class-color:${(classItem && classItem.color) || DEFAULT_CLASS_COLOR}">
      <div class="time-pill">
        <strong>${formatDisplayTime(exam.time)}</strong>
        <span class="status-chip">${escapeHtml(formatDaysLeft(daysLeft))}</span>
      </div>
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
  const daysLeft = getDaysUntil(task.date);
  const dueTime = task.dueTime || task.time;
  const reminderTime = task.reminderTime || task.time;

  return `
    <article class="task-card ${complete ? "done" : ""}" style="--class-color:${(classItem && classItem.color) || DEFAULT_CLASS_COLOR}">
      <button class="check-button" type="button" data-toggle-task="${task.id}" aria-label="Marcar tarea">
        <i data-lucide="${complete ? "check-check" : "circle"}"></i>
      </button>
      <details class="task-details">
        <summary>
          <span class="task-summary-main">
            <strong>${escapeHtml(task.title)}${task.source === MOODLE_TASK_SOURCE ? ' <span class="source-badge moodle-badge">Moodle</span>' : ""}</strong>
            <span>${className ? `${escapeHtml(className)} - ` : ""}Recordatorio ${escapeHtml(formatDisplayTime(reminderTime))}</span>
          </span>
          <span class="task-due-badge">
            <strong>${escapeHtml(formatDate(task.date))}</strong>
            <span>${escapeHtml(formatDisplayTime(dueTime))} - ${escapeHtml(formatDaysLeft(daysLeft))}</span>
          </span>
        </summary>
        <div class="task-detail-body">
          <div class="tag-row">
            <span class="tag priority-${task.priority || "normal"}">${PRIORITY_LABELS[task.priority || "normal"]}</span>
            <span class="tag">${REPEAT_LABELS[task.repeat || "none"]}</span>
          </div>
          ${task.details ? `<p>${escapeHtml(task.details)}</p>` : `<p class="muted">Sin detalles extra.</p>`}
          <div class="inline-actions">
            <button class="text-button" type="button" data-edit-task="${task.id}">
              <i data-lucide="pencil"></i>
              Editar
            </button>
            <button class="text-button danger" type="button" data-delete-task="${task.id}">
              <i data-lucide="trash-2"></i>
              Eliminar
            </button>
          </div>
        </div>
      </details>
      <div class="legacy-task-content" hidden>
        <h3>${escapeHtml(task.title)}</h3>
        <p class="muted">${formatDate(task.date)} · ${formatDisplayTime(task.time)}${className ? ` · ${escapeHtml(className)}` : ""}</p>
        <div class="tag-row">
          <span class="tag priority-${task.priority || "normal"}">${PRIORITY_LABELS[task.priority || "normal"]}</span>
          <span class="tag">${REPEAT_LABELS[task.repeat || "none"]}</span>
        </div>
        ${task.details ? `<p>${escapeHtml(task.details)}</p>` : ""}
      </div>
      <button class="tiny-button legacy-task-content" hidden type="button" data-delete-task="${task.id}" aria-label="Eliminar tarea" title="Eliminar">
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

function renderTaskFilterOptions() {
  if (!elements.taskClassFilter) return;

  const current = elements.taskClassFilter.value;
  elements.taskClassFilter.innerHTML = `<option value="">Todas</option>` + state.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}">${escapeHtml(getClassDisplayName(item))}</option>`)
    .join("");

  elements.taskClassFilter.value = state.classes.some((item) => item.id === current) ? current : "";
}

function renderExamClassOptions() {
  elements.examClass.innerHTML = `<option value="">Sin clase</option>` + state.classes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}">${escapeHtml(getClassDisplayName(item))}</option>`)
    .join("");
}

function exportScheduleImage() {
  const days = WEEK_DAYS;
  const dayNames = days.map((d) => DAY_NAMES[d].slice(0, 3).toUpperCase());
  const classesByDay = days.map((d) =>
    state.classes.filter((c) => c.days.includes(d)).sort((a, b) => a.start.localeCompare(b.start))
  );

  const SCALE = 2;
  const COL_W = 100;
  const HEADER_H = 36;
  const ROW_H = 52;
  const PAD = 4;
  const maxRows = Math.max(1, ...classesByDay.map((c) => c.length));
  const W = (COL_W * days.length + 1) * SCALE;
  const H = (HEADER_H + maxRows * ROW_H + 20) * SCALE;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  const totalW = COL_W * days.length + 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalW, H / SCALE);

  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  days.forEach((_, i) => {
    const x = i * COL_W;
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(x, 0, COL_W, HEADER_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(dayNames[i], x + COL_W / 2, HEADER_H / 2);

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEADER_H);
    ctx.stroke();
  });

  ctx.font = "700 9.5px system-ui, sans-serif";
  classesByDay.forEach((classes, di) => {
    classes.forEach((cls, ri) => {
      const x = di * COL_W + PAD;
      const y = HEADER_H + ri * ROW_H + PAD;
      const bw = COL_W - PAD * 2;
      const bh = ROW_H - PAD * 2;
      const color = cls.color || DEFAULT_CLASS_COLOR;

      ctx.fillStyle = color;
      const radius = 6;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + bw - radius, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
      ctx.lineTo(x + bw, y + bh - radius);
      ctx.quadraticCurveTo(x + bw, y + bh, x + bw - radius, y + bh);
      ctx.lineTo(x + radius, y + bh);
      ctx.quadraticCurveTo(x, y + bh, x, y + bh - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      const name = getClassDisplayName(cls);
      const nameShort = name.length > 14 ? name.slice(0, 13) + "…" : name;
      ctx.font = "bold 9.5px system-ui, sans-serif";
      ctx.fillText(nameShort, x + bw / 2, y + bh / 2 - 7);
      ctx.font = "9px system-ui, sans-serif";
      ctx.fillText(formatDisplayTimeRange(cls.start, cls.end), x + bw / 2, y + bh / 2 + 7);
    });
  });

  ctx.fillStyle = "#888";
  ctx.font = "8px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(state.settings.appTitle || "AppHorario", totalW - 4, H / SCALE - 6);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const filename = `horario-${toDateInput(new Date())}.png`;
    if (typeof showSchedulePreview === "function") showSchedulePreview(blob, filename);
  }, "image/png");
}

function bindExportSchedule() {
  const btn = document.getElementById("exportScheduleButton");
  if (btn) btn.addEventListener("click", exportScheduleImage);
}
