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
  recordingClassId = "";
  recordingStartedAt = "";

  if (blob.size > 0) {
    try {
      const limit = (state.settings && state.settings.maxRecordingsPerClass) || 20;
      const existing = (state.classes.find((c) => c.id === classId) || {}).recordings || [];
      if (existing.length >= limit) {
        showToast(`Límite de ${limit} grabaciones por clase alcanzado. Elimina algunas antes de grabar.`);
        recordingChunks = [];
        return;
      }
      await saveAudioBlob(id, blob);
      recordingChunks = [];
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
      recordingChunks = [];
      alert("No pude guardar el audio. Puede que el navegador no tenga espacio disponible.");
    }
  } else {
    recordingChunks = [];
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
  $$("[data-audio-player]").forEach((player) => {
    if (player.dataset.blobUrl) {
      URL.revokeObjectURL(player.dataset.blobUrl);
      delete player.dataset.blobUrl;
    }
  });
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
    if (player.dataset.blobUrl) URL.revokeObjectURL(player.dataset.blobUrl);
    const url = URL.createObjectURL(blob);
    player.src = url;
    player.dataset.blobUrl = url;
  }

  await player.play().catch(() => undefined);
}

async function deleteAudio(recordingId) {
  const confirmed = await showConfirmDialog("Eliminar audio", "Esta acción no se puede deshacer.");
  if (!confirmed) return;

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

// Board photo capture and local photo gallery storage.
let pendingScheduleDownload = null; // { blob, filename } — used by schedule preview

async function captureBoardPhoto(classId = $("#noteClassId").value) {
  const item = getClassById(classId);
  if (!item || !elements.photoInput) return;

  const camera = getCameraPlugin();
  if (camera && isNativeRuntime()) {
    try {
      const photo = await camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: "uri",
        source: "CAMERA",
        saveToGallery: false,
        correctOrientation: true
      });
      await saveCameraPhoto(classId, photo);
    } catch (error) {
      if (isCameraCancel(error)) return;
      alert("No pude abrir la camara. Revisa el permiso de camara en Android.");
    }
    return;
  }

  elements.photoInput.value = "";
  elements.photoInput.dataset.captureClassId = classId;
  elements.photoInput.click();
}

async function saveCameraPhoto(classId, photo) {
  const photoUrl = getCameraPhotoUrl(photo);
  if (!photoUrl) throw new Error("Camera photo URL missing.");

  const response = await fetch(photoUrl);
  if (!response.ok) throw new Error("Camera photo fetch failed.");

  const blob = await response.blob();
  await saveClassPhoto(classId, blob, {
    date: new Date().toISOString(),
    mimeType: blob.type || `image/${photo.format || "jpeg"}`,
    size: blob.size,
    name: "pizarron"
  });

  if ($("#notesDialog").open) renderPhotoGallery(getClassById(classId));
}

function showSchedulePreview(blob, filename) {
  clearPhotoViewer();
  pendingScheduleDownload = { blob, filename };
  photoViewerUrl = URL.createObjectURL(blob);
  elements.photoViewerImage.src = photoViewerUrl;
  elements.photoViewerDate.textContent = "Vista previa — Horario semanal";
  openDialog("photoViewerDialog");
}

async function saveScheduleImage(blob, filename) {
  const plugin = window.Capacitor?.Plugins?.AppHorarioHttp;
  if (plugin) {
    try {
      const reader = new FileReader();
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      await plugin.saveImageToGallery({ base64, filename });
      showToast("Imagen guardada en Galería > AppHorario");
    } catch (err) {
      showToast("No se pudo guardar: " + (err?.message || err));
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCameraPhotoUrl(photo) {
  if (!photo) return "";
  if (photo.webPath) return photo.webPath;
  if (photo.path && window.Capacitor && typeof window.Capacitor.convertFileSrc === "function") {
    return window.Capacitor.convertFileSrc(photo.path);
  }
  return photo.path || "";
}

function isCameraCancel(error) {
  const message = String(error && (error.message || error.errorMessage || error) || "").toLowerCase();
  return message.includes("cancel") || message.includes("user denied") || message.includes("no image picked");
}

async function handleBoardPhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  const classId = event.target.dataset.captureClassId || $("#noteClassId").value;
  const isDetailOpen = $("#notesDialog").open;
  delete event.target.dataset.captureClassId;

  if (!file || !classId) return;
  if (!file.type.startsWith("image/")) {
    alert("Elige una imagen del pizarron.");
    return;
  }

  try {
    await saveClassPhoto(classId, file, {
      date: new Date().toISOString(),
      mimeType: file.type || "image/jpeg",
      size: file.size,
      name: file.name || ""
    });
  } catch {
    alert("No pude guardar la foto. Puede que el navegador no tenga espacio disponible.");
    return;
  }

  if (isDetailOpen) renderPhotoGallery(getClassById(classId));
}

async function saveClassPhoto(classId, blob, metadata = {}) {
  const id = createId();
  await savePhotoBlob(id, blob);

  state.classes = state.classes.map((classItem) => classItem.id === classId
    ? {
      ...classItem,
      photos: [
        {
          id,
          date: metadata.date || new Date().toISOString(),
          mimeType: metadata.mimeType || blob.type || "image/jpeg",
          size: metadata.size || blob.size || 0,
          name: metadata.name || ""
        },
        ...(classItem.photos || [])
      ]
    }
    : classItem);
  saveState();
}

function renderPhotoGallery(item) {
  revokePhotoPreviews();
  const photos = item && item.photos ? item.photos : [];
  elements.photoGallery.innerHTML = photos.length
    ? photos.map((photo) => {
      const date = new Date(photo.date);
      const dateText = date.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      return `
        <article class="photo-card">
          <button class="photo-preview-button" type="button" data-view-photo="${photo.id}" aria-label="Abrir foto del pizarron">
            <img data-photo-preview="${photo.id}" alt="Foto del pizarron del ${escapeHtml(dateText)}">
          </button>
          <div class="photo-card-body">
            <time>${escapeHtml(dateText)}</time>
            <p class="muted">${formatBytes(photo.size || 0)}</p>
            <div class="card-actions">
              <button class="tiny-button" type="button" data-download-photo="${photo.id}" aria-label="Descargar foto" title="Descargar foto">
                <i data-lucide="download"></i>
              </button>
              <button class="tiny-button" type="button" data-delete-photo="${photo.id}" aria-label="Eliminar foto" title="Eliminar foto">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("")
    : emptyState("Aun no hay fotos del pizarron para esta clase.");
  renderIcons();
  hydratePhotoPreviews();
}

async function openPhotoViewer(photoId) {
  const blob = await getPhotoBlob(photoId).catch(() => null);
  if (!blob) {
    alert("No encontre esa foto en este navegador.");
    return;
  }

  clearPhotoViewer();
  const photo = state.classes.flatMap((item) => item.photos || []).find((item) => item.id === photoId);
  const date = photo && photo.date ? new Date(photo.date) : new Date();
  const dateText = date.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  photoViewerUrl = URL.createObjectURL(blob);
  elements.photoViewerImage.src = photoViewerUrl;
  elements.photoViewerDate.textContent = dateText;
  elements.photoViewerDownloadButton.dataset.photoId = photoId;
  openDialog("photoViewerDialog");
}

function clearPhotoViewer() {
  if (photoViewerUrl) URL.revokeObjectURL(photoViewerUrl);
  photoViewerUrl = "";
  pendingScheduleDownload = null;
  if (elements.photoViewerImage) elements.photoViewerImage.removeAttribute("src");
  if (elements.photoViewerDownloadButton) delete elements.photoViewerDownloadButton.dataset.photoId;
}

function hydratePhotoPreviews() {
  $$("[data-photo-preview]").forEach(async (image) => {
    const photoId = image.dataset.photoPreview;
    if (!photoId || image.dataset.loaded) return;

    const blob = await getPhotoBlob(photoId).catch(() => null);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    image.src = url;
    image.dataset.blobUrl = url;
    image.dataset.loaded = "true";
  });
}

function revokePhotoPreviews() {
  $$("[data-blob-url]").forEach((el) => {
    URL.revokeObjectURL(el.dataset.blobUrl);
    delete el.dataset.blobUrl;
    delete el.dataset.loaded;
  });
}

async function downloadPhoto(photoId) {
  const blob = await getPhotoBlob(photoId).catch(() => null);
  if (!blob) {
    alert("No encontre esa foto en este navegador.");
    return;
  }

  const photo = state.classes.flatMap((item) => item.photos || []).find((item) => item.id === photoId);
  const extension = getImageExtension(photo && photo.mimeType ? photo.mimeType : blob.type);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foto-pizarron-${toDateInput(new Date(photo && photo.date ? photo.date : Date.now()))}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function deletePhoto(photoId) {
  const confirmed = await showConfirmDialog("Eliminar foto", "La foto del pizarrón se borrará de este dispositivo.");
  if (!confirmed) return;

  await deletePhotoBlob(photoId).catch(() => undefined);
  state.classes = state.classes.map((classItem) => ({
    ...classItem,
    photos: (classItem.photos || []).filter((photo) => photo.id !== photoId)
  }));
  saveState();
  renderPhotoGallery(getClassById($("#noteClassId").value));
}

function getImageExtension(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}
