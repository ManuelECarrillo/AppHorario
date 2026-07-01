function setSoundSummary(settingKey, soundKey) {
  const summaryId = settingKey === "notificationSound"
    ? "notificationSoundSummary" : "taskNotificationSoundSummary";
  const el = document.getElementById(summaryId);
  if (el) el.textContent = NOTIFICATION_SOUNDS[soundKey]?.label || "";
}

function renderSoundPicker(containerId, settingKey, currentValue) {
  const container = document.getElementById(containerId);
  if (!container) return;

  setSoundSummary(settingKey, currentValue);

  container.innerHTML = Object.entries(NOTIFICATION_SOUNDS).map(([key, cfg]) => `
    <div class="sound-card${currentValue === key ? " selected" : ""}"
         data-sound-key="${key}" data-sound-setting="${settingKey}" role="button" tabindex="0">
      <div class="sound-card-top">
        <div class="sound-card-icon"><i data-lucide="${cfg.icon}"></i></div>
        ${cfg.previewFile
          ? `<button class="sound-card-play" type="button" data-preview-sound="${cfg.previewFile}" title="Escuchar">
               <i data-lucide="play"></i>
             </button>`
          : `<div style="width:28px"></div>`}
      </div>
      <p class="sound-card-name">${escapeHtml(cfg.label)}</p>
      <p class="sound-card-desc">${escapeHtml(cfg.desc)}</p>
    </div>`).join("");

  renderIcons();

  container.querySelectorAll(".sound-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".sound-card-play")) return;
      const key = card.dataset.soundKey;
      const setting = card.dataset.soundSetting;
      state.settings[setting] = key;
      saveState();
      rescheduleNativeNotificationsSoon();
      container.querySelectorAll(".sound-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      setSoundSummary(setting, key);
      const hiddenSelect = document.getElementById(setting);
      if (hiddenSelect) hiddenSelect.value = key;
    });
  });

  container.querySelectorAll("[data-preview-sound]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const file = btn.dataset.previewSound;
      if (!file) return;
      const audio = new Audio(file);
      audio.play().catch(() => undefined);
    });
  });
}

function bindSoundPickers() {
  renderSoundPicker("notificationSoundPicker", "notificationSound", getNotificationSoundKey());
  renderSoundPicker("taskNotificationSoundPicker", "taskNotificationSound", getTaskNotificationSoundKey());

  const miuiNotice = document.getElementById("miuiNotice");
  if (miuiNotice) {
    const isMiui = /xiaomi|miui|redmi|poco/i.test(navigator.userAgent)
      || /xiaomi|miui|redmi|poco/i.test(navigator.vendor || "");
    miuiNotice.hidden = !isMiui;
    const openBtn = document.getElementById("openAppNotifSettings");
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        if (window.Capacitor?.Plugins?.LocalNotifications) {
          window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        }
        showToast("Ve a Ajustes → Apps → AppHorario → Notificaciones");
      });
    }
  }
}

function bindSettings() {
  const settings = elements.settings;
  settings.appTitle.value = state.settings.appTitle;
  settings.themeMode.value = state.settings.themeMode;
  settings.timeFormat.value = getTimeFormat();
  settings.primaryColor.value = state.settings.primaryColor;
  settings.accentColor.value = state.settings.accentColor;
  settings.backgroundColor.value = state.settings.backgroundColor;
  settings.taskPromptMinutes.value = state.settings.taskPromptMinutes;
  settings.classStartMinutes.value = state.settings.classStartMinutes;

  bindSegmentedControl("themeModeControl", "themeMode");
  bindSegmentedControl("timeFormatControl", "timeFormat");
  renderThemePresets();
  bindThemePresets();

  settings.notificationSound.value = getNotificationSoundKey();
  settings.taskNotificationSound.value = getTaskNotificationSoundKey();
  settings.taskPromptEnabled.checked = state.settings.taskPromptEnabled;
  settings.classStartEnabled.checked = state.settings.classStartEnabled;
  if (settings.classStartCommuteBuffer) settings.classStartCommuteBuffer.value = state.settings.classStartCommuteBuffer ?? 5;
  if (settings.maxRecordingsPerClass) settings.maxRecordingsPerClass.value = state.settings.maxRecordingsPerClass || 20;
  settings.commuteCarEnabled.checked = Boolean(state.settings.commuteCarEnabled);
  settings.commuteWalkEnabled.checked = Boolean(state.settings.commuteWalkEnabled);
  settings.commuteBikeEnabled.checked = Boolean(state.settings.commuteBikeEnabled);
  settings.commuteBusEnabled.checked = Boolean(state.settings.commuteBusEnabled);

  Object.entries(settings).forEach(([key, input]) => {
    input.addEventListener("input", () => {
      state.settings[key] = getSettingInputValue(input);
      syncAccentWithPrimary(key);
      saveState();
      renderTitle();
      renderTheme();
      tick();
      if (key === "timeFormat") render();
      if (key.startsWith("commute")) updateCommuteSummary(true);
      if (key === "classStartCommuteBuffer") updateCommuteNotifyStatus();
      rescheduleNativeNotificationsSoon();
    });

    input.addEventListener("change", () => {
      state.settings[key] = getSettingInputValue(input);
      syncAccentWithPrimary(key);
      saveState();
      renderTitle();
      renderTheme();
      tick();
      if (key === "timeFormat") render();
      if (key.startsWith("commute")) updateCommuteSummary(true);
      if (key === "classStartCommuteBuffer") updateCommuteNotifyStatus();
      rescheduleNativeNotificationsSoon();
    });
  });

  bindClassStartTimingOptions();
}

function bindSegmentedControl(containerId, selectId) {
  const container = document.getElementById(containerId);
  const select = document.getElementById(selectId);
  if (!container || !select) return;

  function update(value) {
    container.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.segValue === value);
    });
  }

  update(select.value);

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    const value = btn.dataset.segValue;
    update(value);
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function bindClassStartTimingOptions() {
  const enabledToggle = document.getElementById("classStartEnabled");
  const optionsPanel = document.getElementById("classStartOptions");
  const manualField = document.getElementById("classStartManualField");
  const commuteField = document.getElementById("classStartCommuteField");
  const manualInput = document.getElementById("classStartMinutesVisible");

  function syncMode(mode) {
    const isCommute = mode === "commute";
    if (manualField) manualField.hidden = isCommute;
    if (commuteField) commuteField.hidden = !isCommute;
    if (!isCommute && manualInput) manualInput.value = state.settings.classStartMinutes || 5;
    if (isCommute) updateCommuteNotifyStatus();
  }

  function applyToggle() {
    if (optionsPanel) optionsPanel.hidden = !enabledToggle?.checked;
  }

  // Set initial radio state
  const currentMode = state.settings.classStartNotifyMode || "manual";
  const radioEl = document.querySelector(`[name="classStartNotifyMode"][value="${currentMode}"]`);
  if (radioEl) radioEl.checked = true;
  if (manualInput) manualInput.value = state.settings.classStartMinutes || 5;
  applyToggle();
  syncMode(currentMode);

  // Toggle visibility of the sub-panel
  if (enabledToggle) {
    enabledToggle.addEventListener("change", () => {
      applyToggle();
    });
  }

  // Sync manual minutes input → hidden input (used by auto-binding loop)
  if (manualInput) {
    manualInput.addEventListener("input", () => {
      const hidden = document.getElementById("classStartMinutes");
      if (hidden) hidden.value = manualInput.value;
      state.settings.classStartMinutes = Number(manualInput.value) || 5;
      saveState();
      rescheduleNativeNotificationsSoon();
    });
  }

  // Radio buttons
  document.querySelectorAll('[name="classStartNotifyMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      state.settings.classStartNotifyMode = radio.value;
      saveState();
      syncMode(radio.value);
      rescheduleNativeNotificationsSoon();
    });
  });
}

function syncAccentWithPrimary(key) {
  if (key !== "primaryColor") return;
  state.settings.accentColor = state.settings.primaryColor;
  if (elements.settings.accentColor) elements.settings.accentColor.value = state.settings.accentColor;
}

function bindCommuteSettings() {
  if (!elements.schoolLocationInput) return;

  elements.schoolLocationInput.value = state.settings.schoolLocationText || formatCoordinates(state.settings.schoolLat, state.settings.schoolLng);
  elements.schoolLocationInput.addEventListener("change", saveSchoolLocationFromInput);
  elements.schoolLocationInput.addEventListener("blur", saveSchoolLocationFromInput);
  elements.schoolLocationInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    openSchoolMapPicker();
  });

  if (elements.searchSchoolAddressButton) {
    elements.searchSchoolAddressButton.addEventListener("click", openSchoolMapPicker);
  }

  if (elements.useCurrentLocationButton) {
    elements.useCurrentLocationButton.addEventListener("click", saveCurrentLocationAsSchool);
  }

  if (elements.mapAddressSearchButton) {
    elements.mapAddressSearchButton.addEventListener("click", searchSchoolMapAddress);
  }

  if (elements.centerMapOnCurrentLocationButton) {
    elements.centerMapOnCurrentLocationButton.addEventListener("click", centerSchoolMapOnCurrentLocation);
  }

  if (elements.mapAddressSearchInput) {
    elements.mapAddressSearchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      searchSchoolMapAddress();
    });
  }

  if (elements.schoolMapPicker) {
    elements.schoolMapPicker.addEventListener("pointerdown", startSchoolMapDrag);
    elements.schoolMapPicker.addEventListener("pointermove", moveSchoolMapDrag);
    elements.schoolMapPicker.addEventListener("pointerup", finishSchoolMapDrag);
    elements.schoolMapPicker.addEventListener("pointercancel", cancelSchoolMapDrag);
  }

  if (elements.mapZoomInButton) {
    elements.mapZoomInButton.addEventListener("click", () => zoomSchoolMap(1));
  }

  if (elements.mapZoomOutButton) {
    elements.mapZoomOutButton.addEventListener("click", () => zoomSchoolMap(-1));
  }

  if (elements.confirmSchoolLocationButton) {
    elements.confirmSchoolLocationButton.addEventListener("click", confirmSchoolMapLocation);
  }

  window.addEventListener("resize", () => {
    const dialog = $("#schoolMapDialog");
    if (dialog?.open) renderSchoolMap();
  });
}

function saveSchoolLocationFromInput() {
  const rawValue = elements.schoolLocationInput.value.trim();
  const coordinates = parseCoordinates(rawValue);
  state.settings.schoolLocationText = rawValue;

  if (coordinates) {
    state.settings.schoolLat = String(coordinates.lat);
    state.settings.schoolLng = String(coordinates.lng);
  } else if (!rawValue) {
    state.settings.schoolLat = "";
    state.settings.schoolLng = "";
  }

  saveState();
  commuteLastUpdatedAt = 0;
  updateCommuteSummary();
}

function saveCurrentLocationAsSchool() {
  alert("Esta opcion usa tu ubicacion actual para guardarla como ubicacion de la escuela. Android te pedira permiso solo para esta accion.");
  getCurrentPosition()
    .then((position) => {
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      const text = formatCoordinates(lat, lng);
      saveSchoolCoordinates(lat, lng, text);
      alert("Ubicacion de la escuela guardada.");
    })
    .catch(() => alert("No pude obtener tu ubicacion. Revisa el permiso de ubicacion."));
}

function openSchoolMapPicker() {
  const school = getSchoolCoordinates();
  const fallback = parseCoordinates(elements.schoolLocationInput?.value || "");
  const selectedStart = school || fallback;
  const start = selectedStart || { lat: schoolMapState.centerLat, lng: schoolMapState.centerLng };

  schoolMapState.centerLat = start.lat;
  schoolMapState.centerLng = start.lng;
  schoolMapState.selectedLat = selectedStart ? start.lat : null;
  schoolMapState.selectedLng = selectedStart ? start.lng : null;

  if (elements.mapAddressSearchInput) {
    elements.mapAddressSearchInput.value = state.settings.schoolLocationText || elements.schoolLocationInput.value || "";
  }

  if (elements.mapAddressResults) {
    elements.mapAddressResults.innerHTML = "";
  }

  updateSchoolMapSelectedText();
  openDialog("schoolMapDialog");
  setTimeout(renderSchoolMap, 80);
  centerSchoolMapIfLocationAlreadyAllowed();
}

async function centerSchoolMapIfLocationAlreadyAllowed() {
  if (!navigator.permissions || !navigator.geolocation) return;

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state !== "granted") return;

    const position = await getCurrentPosition({ maximumAge: 300000, timeout: 4500 });
    moveSchoolMapTo(position.coords.latitude, position.coords.longitude, false);
    renderSchoolMapAddressMessage("Mapa centrado con tu ubicacion actual. Toca el punto exacto de tu escuela para seleccionarlo.");
  } catch (error) {
    console.warn(error);
  }
}

async function centerSchoolMapOnCurrentLocation() {
  if (!elements.centerMapOnCurrentLocationButton) return;

  elements.centerMapOnCurrentLocationButton.disabled = true;
  renderSchoolMapAddressMessage("La app usara tu ubicacion actual solo para centrar el mapa. Android puede pedir permiso ahora.");

  try {
    const position = await getCurrentPosition({ maximumAge: 120000, timeout: 10000 });
    moveSchoolMapTo(position.coords.latitude, position.coords.longitude, false);
    renderSchoolMapAddressMessage("Mapa centrado en tu ubicacion. Toca el punto exacto de tu escuela y guarda.");
  } catch (error) {
    console.warn(error);
    renderSchoolMapAddressMessage("No pude obtener tu ubicacion. Puedes buscar la direccion manualmente.");
  } finally {
    elements.centerMapOnCurrentLocationButton.disabled = false;
  }
}

async function searchSchoolMapAddress() {
  if (!elements.mapAddressSearchInput || !elements.mapAddressResults) return;

  const rawValue = elements.mapAddressSearchInput.value.trim();
  const coordinates = parseCoordinates(rawValue);
  if (coordinates) {
    moveSchoolMapTo(coordinates.lat, coordinates.lng, true);
    renderSchoolMapAddressMessage("Coordenadas seleccionadas.");
    return;
  }

  if (!rawValue) {
    renderSchoolMapAddressMessage("Escribe una direccion o pega un link de Maps.");
    return;
  }

  if (elements.mapAddressSearchButton) elements.mapAddressSearchButton.disabled = true;
  renderSchoolMapAddressMessage("Buscando direccion...");

  try {
    const results = await geocodeSchoolAddress(rawValue);
    schoolMapAddressResults = results;
    renderSchoolMapAddressResults(results);
    if (results[0]) moveSchoolMapTo(results[0].lat, results[0].lng, true);
  } catch (error) {
    console.warn(error);
    schoolMapAddressResults = [];
    renderSchoolMapAddressMessage("No pude buscar la direccion. Revisa internet e intenta de nuevo.");
  } finally {
    if (elements.mapAddressSearchButton) elements.mapAddressSearchButton.disabled = false;
  }
}

function renderSchoolMapAddressResults(results) {
  if (!elements.mapAddressResults) return;

  if (!results.length) {
    renderSchoolMapAddressMessage("No encontre direcciones. Prueba con calle, ciudad y estado.");
    return;
  }

  elements.mapAddressResults.innerHTML = results.map((result, index) => `
    <button class="address-result-button" type="button" data-map-address="${index}">
      <i data-lucide="map-pin"></i>
      <span>${escapeHtml(result.label)}</span>
    </button>
  `).join("");
  renderIcons();
}

function renderSchoolMapAddressMessage(message) {
  if (!elements.mapAddressResults) return;
  elements.mapAddressResults.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function selectSchoolMapAddress(index) {
  const result = schoolMapAddressResults[Number(index)];
  if (!result) return;
  if (elements.mapAddressSearchInput) elements.mapAddressSearchInput.value = result.label;
  moveSchoolMapTo(result.lat, result.lng, true);
}

function moveSchoolMapTo(lat, lng, selectPoint = false) {
  schoolMapState.centerLat = clampLatitude(lat);
  schoolMapState.centerLng = wrapLongitude(lng);
  if (selectPoint) {
    schoolMapState.selectedLat = schoolMapState.centerLat;
    schoolMapState.selectedLng = schoolMapState.centerLng;
  }
  updateSchoolMapSelectedText();
  renderSchoolMap();
}

function confirmSchoolMapLocation() {
  if (!Number.isFinite(schoolMapState.selectedLat) || !Number.isFinite(schoolMapState.selectedLng)) {
    alert("Selecciona una ubicacion en el mapa.");
    return;
  }

  const text = elements.mapAddressSearchInput?.value.trim() || formatCoordinates(
    Number(schoolMapState.selectedLat.toFixed(6)),
    Number(schoolMapState.selectedLng.toFixed(6))
  );
  saveSchoolCoordinates(schoolMapState.selectedLat, schoolMapState.selectedLng, text);
  renderSchoolAddressMessage("Direccion guardada desde el mapa.");
  closeDialog("schoolMapDialog");
}

async function searchSchoolAddress() {
  if (!elements.schoolLocationInput || !elements.schoolAddressResults) return;

  const rawValue = elements.schoolLocationInput.value.trim();
  const coordinates = parseCoordinates(rawValue);
  if (coordinates) {
    saveSchoolCoordinates(coordinates.lat, coordinates.lng, rawValue || formatCoordinates(coordinates.lat, coordinates.lng));
    renderSchoolAddressMessage("Direccion guardada con coordenadas exactas.");
    return;
  }

  if (!rawValue) {
    renderSchoolAddressMessage("Escribe una direccion o pega un link de Maps.");
    return;
  }

  const now = Date.now();
  const GEOCODING_COOLDOWN_MS = 3000;
  if (now - lastGeocodingAt < GEOCODING_COOLDOWN_MS) {
    renderSchoolAddressMessage("Espera un momento antes de buscar de nuevo.");
    return;
  }

  if (elements.searchSchoolAddressButton) elements.searchSchoolAddressButton.disabled = true;
  renderSchoolAddressMessage("Buscando direccion...");

  try {
    lastGeocodingAt = Date.now();
    const results = await geocodeSchoolAddress(rawValue);
    schoolAddressResults = results;
    renderSchoolAddressResults(results);
  } catch (error) {
    console.warn(error);
    schoolAddressResults = [];
    const msg = error && error.message && error.message.startsWith("El servicio")
      ? error.message
      : "No pude buscar la direccion. Revisa internet e intenta de nuevo.";
    renderSchoolAddressMessage(msg);
  } finally {
    if (elements.searchSchoolAddressButton) elements.searchSchoolAddressButton.disabled = false;
  }
}

async function geocodeSchoolAddress(query) {
  try {
    const photonResults = await geocodeWithPhoton(query);
    if (photonResults.length) return photonResults;
  } catch (error) {
    console.warn("Photon geocoding failed", error);
  }

  return geocodeWithNominatim(query);
}

async function geocodeWithPhoton(query) {
  const url = new URL(PHOTON_GEOCODING_API_URL);
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", query);

  const response = await fetchWithTimeout(url.toString(), {}, 8000);
  if (response.status === 429) throw new Error("El servicio de búsqueda de direcciones está temporalmente limitado. Espera unos minutos e intenta de nuevo.");
  if (!response.ok) throw new Error(`Photon geocoding failed: ${response.status}`);

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features
    .map((feature) => {
      const properties = feature.properties || {};
      const coordinates = feature.geometry?.coordinates || [];
      const labelParts = [
        properties.name,
        properties.street,
        properties.locality,
        properties.city,
        properties.state,
        properties.country
      ].filter(Boolean);

      return {
        label: labelParts.join(", ") || "Direccion sin nombre",
        lat: Number(coordinates[1]),
        lng: Number(coordinates[0])
      };
    })
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function geocodeWithNominatim(query) {
  const url = new URL(GEOCODING_API_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("q", query);

  const response = await fetchWithTimeout(url.toString(), {}, 9000);
  if (response.status === 429) throw new Error("El servicio de búsqueda de direcciones está temporalmente limitado. Espera unos minutos e intenta de nuevo.");
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

  const payload = await response.json();
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => ({
      label: item.display_name || "Direccion sin nombre",
      lat: Number(item.lat),
      lng: Number(item.lon)
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

function renderSchoolAddressResults(results) {
  if (!elements.schoolAddressResults) return;

  if (!results.length) {
    renderSchoolAddressMessage("No encontre direcciones. Prueba con calle, ciudad y estado.");
    return;
  }

  elements.schoolAddressResults.innerHTML = results.map((result, index) => `
    <button class="address-result-button" type="button" data-school-address="${index}">
      <i data-lucide="map-pin"></i>
      <span>${escapeHtml(result.label)}</span>
    </button>
  `).join("");
  renderIcons();
}

function renderSchoolAddressMessage(message) {
  if (!elements.schoolAddressResults) return;
  elements.schoolAddressResults.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function selectSchoolAddress(index) {
  const result = schoolAddressResults[Number(index)];
  if (!result) return;
  saveSchoolCoordinates(result.lat, result.lng, result.label);
  renderSchoolAddressMessage("Direccion guardada. Ya puedo calcular el tiempo de llegada.");
}

function saveSchoolCoordinates(lat, lng, text) {
  const cleanLat = Number(lat);
  const cleanLng = Number(lng);
  if (!Number.isFinite(cleanLat) || !Number.isFinite(cleanLng)) return;

  state.settings.schoolLocationText = text || formatCoordinates(cleanLat, cleanLng);
  state.settings.schoolLat = String(cleanLat);
  state.settings.schoolLng = String(cleanLng);

  if (elements.schoolLocationInput) {
    elements.schoolLocationInput.value = state.settings.schoolLocationText;
  }

  saveState();
  commuteLastUpdatedAt = 0;
  updateCommuteSummary(true);
}

function renderSchoolMap() {
  if (!elements.schoolMapPicker || !elements.schoolMapTileLayer) return;

  const width = elements.schoolMapPicker.clientWidth;
  const height = elements.schoolMapPicker.clientHeight;
  if (!width || !height) return;

  const zoom = schoolMapState.zoom;
  const centerX = longitudeToTileX(schoolMapState.centerLng, zoom) * 256;
  const centerY = latitudeToTileY(schoolMapState.centerLat, zoom) * 256;
  const topLeftX = centerX - width / 2;
  const topLeftY = centerY - height / 2;
  const firstTileX = Math.floor(topLeftX / 256);
  const firstTileY = Math.floor(topLeftY / 256);
  const lastTileX = Math.floor((topLeftX + width) / 256);
  const lastTileY = Math.floor((topLeftY + height) / 256);
  const maxTile = 2 ** zoom;
  const tiles = [];

  for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
    if (tileY < 0 || tileY >= maxTile) continue;

    for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
      const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
      const left = Math.round(tileX * 256 - topLeftX);
      const top = Math.round(tileY * 256 - topLeftY);
      tiles.push(`<img src="https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png" alt="" style="left:${left}px;top:${top}px;">`);
    }
  }

  elements.schoolMapTileLayer.innerHTML = tiles.join("");
  positionSchoolMapMarker(topLeftX, topLeftY, zoom);
  renderIcons();
}

function positionSchoolMapMarker(topLeftX, topLeftY, zoom) {
  if (!elements.schoolMapMarker) return;

  if (!Number.isFinite(schoolMapState.selectedLat) || !Number.isFinite(schoolMapState.selectedLng)) {
    elements.schoolMapMarker.hidden = true;
    return;
  }

  const markerX = longitudeToTileX(schoolMapState.selectedLng, zoom) * 256 - topLeftX;
  const markerY = latitudeToTileY(schoolMapState.selectedLat, zoom) * 256 - topLeftY;
  elements.schoolMapMarker.hidden = false;
  elements.schoolMapMarker.style.transform = `translate(${markerX}px, ${markerY}px) translate(-50%, -100%)`;
}

function startSchoolMapDrag(event) {
  if (event.target.closest("button")) return;

  schoolMapState.dragging = true;
  schoolMapState.moved = false;
  schoolMapState.pointerId = event.pointerId;
  schoolMapState.startX = event.clientX;
  schoolMapState.startY = event.clientY;
  schoolMapState.startCenterX = longitudeToTileX(schoolMapState.centerLng, schoolMapState.zoom);
  schoolMapState.startCenterY = latitudeToTileY(schoolMapState.centerLat, schoolMapState.zoom);
  elements.schoolMapPicker.setPointerCapture(event.pointerId);
}

function moveSchoolMapDrag(event) {
  if (!schoolMapState.dragging || event.pointerId !== schoolMapState.pointerId) return;

  const deltaX = event.clientX - schoolMapState.startX;
  const deltaY = event.clientY - schoolMapState.startY;
  if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) schoolMapState.moved = true;

  const centerX = schoolMapState.startCenterX - deltaX / 256;
  const centerY = schoolMapState.startCenterY - deltaY / 256;
  schoolMapState.centerLng = tileXToLongitude(centerX, schoolMapState.zoom);
  schoolMapState.centerLat = clampLatitude(tileYToLatitude(centerY, schoolMapState.zoom));
  renderSchoolMap();
}

function finishSchoolMapDrag(event) {
  if (!schoolMapState.dragging || event.pointerId !== schoolMapState.pointerId) return;

  if (!schoolMapState.moved) {
    const selected = mapPointToCoordinates(event.clientX, event.clientY);
    if (selected) {
      schoolMapState.selectedLat = selected.lat;
      schoolMapState.selectedLng = selected.lng;
      updateSchoolMapSelectedText();
      renderSchoolMap();
    }
  }

  cancelSchoolMapDrag(event);
}

function cancelSchoolMapDrag(event) {
  if (elements.schoolMapPicker && schoolMapState.pointerId !== null) {
    try {
      elements.schoolMapPicker.releasePointerCapture(schoolMapState.pointerId);
    } catch (error) {
      console.warn(error);
    }
  }

  schoolMapState.dragging = false;
  schoolMapState.pointerId = null;
  schoolMapState.moved = false;
}

function mapPointToCoordinates(clientX, clientY) {
  if (!elements.schoolMapPicker) return null;

  const rect = elements.schoolMapPicker.getBoundingClientRect();
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const centerX = longitudeToTileX(schoolMapState.centerLng, schoolMapState.zoom);
  const centerY = latitudeToTileY(schoolMapState.centerLat, schoolMapState.zoom);
  const tileX = centerX + x / 256;
  const tileY = centerY + y / 256;

  return {
    lat: clampLatitude(tileYToLatitude(tileY, schoolMapState.zoom)),
    lng: wrapLongitude(tileXToLongitude(tileX, schoolMapState.zoom))
  };
}

function zoomSchoolMap(delta) {
  schoolMapState.zoom = Math.max(3, Math.min(18, schoolMapState.zoom + delta));
  renderSchoolMap();
}

function updateSchoolMapSelectedText() {
  if (!elements.mapSelectedLocationText) return;

  if (!Number.isFinite(schoolMapState.selectedLat) || !Number.isFinite(schoolMapState.selectedLng)) {
    elements.mapSelectedLocationText.textContent = "Sin ubicacion seleccionada";
    return;
  }

  elements.mapSelectedLocationText.textContent = formatCoordinates(
    Number(schoolMapState.selectedLat.toFixed(6)),
    Number(schoolMapState.selectedLng.toFixed(6))
  );
}

function longitudeToTileX(lng, zoom) {
  return ((wrapLongitude(lng) + 180) / 360) * (2 ** zoom);
}

function latitudeToTileY(lat, zoom) {
  const radians = degreesToRadians(clampLatitude(lat));
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 * (2 ** zoom);
}

function tileXToLongitude(tileX, zoom) {
  return tileX / (2 ** zoom) * 360 - 180;
}

function tileYToLatitude(tileY, zoom) {
  const radians = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / (2 ** zoom))));
  return radians * 180 / Math.PI;
}

function clampLatitude(lat) {
  return Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
}

function wrapLongitude(lng) {
  const value = Number(lng);
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function getSettingInputValue(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.type === "number") return Number(input.value);
  return input.value.trim() || "AppHorario";
}

async function renderStorageIndicator() {
  const indicator = document.getElementById("storageIndicator");
  const barFill = document.getElementById("storageBarFill");
  const text = document.getElementById("storageText");
  if (!indicator || !barFill || !text) return;

  if (!navigator.storage || !navigator.storage.estimate) return;

  const estimate = await navigator.storage.estimate().catch(() => null);
  if (!estimate || !estimate.quota) return;

  const usedMB = ((estimate.usage || 0) / 1024 / 1024).toFixed(1);
  const quotaMB = (estimate.quota / 1024 / 1024).toFixed(0);
  const pct = Math.min(100, Math.round(((estimate.usage || 0) / estimate.quota) * 100));

  barFill.style.width = `${pct}%`;
  barFill.style.background = pct > 85 ? "var(--priority-high-text, #c0392b)" : "var(--primary)";
  text.textContent = `${usedMB} MB usados de ${quotaMB} MB disponibles (${pct}%)`;
  indicator.hidden = false;
  renderIcons();
}

async function cleanOrphanBlobs() {
  const knownAudioIds = new Set(
    state.classes.flatMap((c) => (c.recordings || []).map((r) => r.id))
  );
  const knownPhotoIds = new Set(
    state.classes.flatMap((c) => (c.photos || []).map((p) => p.id))
  );

  const db = await openAudioDb().catch(() => null);
  if (!db) return;

  async function purgeOrphans(storeName, knownIds) {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.getAllKeys();
      request.addEventListener("success", () => {
        const orphans = (request.result || []).filter((key) => !knownIds.has(key));
        orphans.forEach((key) => store.delete(key));
        resolve(orphans.length);
      });
      request.addEventListener("error", () => resolve(0));
    });
  }

  const audioRemoved = await purgeOrphans("recordings", knownAudioIds);
  const photoRemoved = await purgeOrphans("photos", knownPhotoIds);
  db.close();

  const total = audioRemoved + photoRemoved;
  showToast(total > 0 ? `${total} archivo${total === 1 ? "" : "s"} huérfano${total === 1 ? "" : "s"} eliminado${total === 1 ? "" : "s"}.` : "No se encontraron archivos huérfanos.");
  await renderStorageIndicator();
}

function bindStorageIndicator() {
  const tab = document.querySelector('[data-tab="settings"]');
  if (tab) {
    tab.addEventListener("click", () => setTimeout(renderStorageIndicator, 50), { once: false });
  }
  const cleanBtn = document.getElementById("cleanOrphanBlobsButton");
  if (cleanBtn) cleanBtn.addEventListener("click", cleanOrphanBlobs);
}
