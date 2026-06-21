function bindTabs() {
  const tabBar = document.querySelector(".tabs");
  if (!tabBar || tabBar.dataset.bound) return;
  tabBar.dataset.bound = "true";
  tabBar.addEventListener("click", (event) => {
    const button = event.target.closest(".tab-button");
    if (!button) return;
    const tab = button.dataset.tab;
    $$(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
    $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${tab}Panel`));
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

function bindTaskFilters() {
  if (!elements.taskClassFilter) return;
  elements.taskClassFilter.addEventListener("change", renderTasks);

  const searchInput = document.getElementById("taskSearch");
  if (searchInput) {
    searchInput.addEventListener("input", renderTasks);
  }
}

function bindDialogs() {
  $$("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.openDialog === "classDialog") resetClassForm();
      if (button.dataset.openDialog === "taskDialog") resetTaskForm();
      if (button.dataset.openDialog === "examDialog") resetExamForm();
      if (button.dataset.openDialog === "gradesDialog") resetGradesDialog();
      if (button.dataset.openDialog === "moodleDialog" && typeof resetMoodleDialog === "function") resetMoodleDialog();
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

// Dialog navigation helpers. Android back closes the active dialog instead of
// leaving the app.
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
  $("#gradesForm").addEventListener("submit", loadGrades);
  $("#detailAddTask").addEventListener("click", addTaskFromDetail);
  $("#detailAddExam").addEventListener("click", addExamFromDetail);
  $("#detailEditClass").addEventListener("click", editClassFromDetail);
  $("#detailTakePhoto").addEventListener("click", () => captureBoardPhoto($("#noteClassId").value));
  elements.photoInput.addEventListener("change", handleBoardPhotoSelected);
  elements.photoViewerDownloadButton.addEventListener("click", async () => {
    if (pendingScheduleDownload) {
      const { blob, filename } = pendingScheduleDownload;
      closeDialog("photoViewerDialog");
      await saveScheduleImage(blob, filename);
    } else {
      downloadPhoto(elements.photoViewerDownloadButton.dataset.photoId);
    }
  });
  $("#photoViewerDialog").addEventListener("close", clearPhotoViewer);

  elements.recordAudioButton.addEventListener("click", startAudioRecording);
  elements.stopAudioButton.addEventListener("click", stopAudioRecording);
}

function bindOfflineBanner() {
  const banner = document.getElementById("offlineBanner");
  if (!banner) return;

  function update() {
    banner.hidden = navigator.onLine !== false;
    if (!banner.hidden) renderIcons();
  }

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function bindMoodleTaskView() {
  const tabs = $$(".task-view-tab");
  if (!tabs.length || tabs[0].dataset.bound) return;
  tabs.forEach((t) => (t.dataset.bound = "true"));

  function switchView(view) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.taskView === view));
    const isManual = view === "manual";
    const toggle = (id, show) => {
      const el = document.getElementById(id);
      if (el) el.hidden = !show;
    };
    toggle("taskManualToolbar", isManual);
    toggle("moodleSubToolbar", !isManual);
    toggle("taskList", isManual);
    toggle("examList", isManual);
    toggle("moodleImportedList", !isManual);
    const searchRow = document.querySelector(".task-search-row");
    if (searchRow) searchRow.hidden = !isManual;
    if (!isManual && typeof renderMoodleImportedTasks === "function") renderMoodleImportedTasks();
  }

  tabs.forEach((tab) =>
    tab.addEventListener("click", () => switchView(tab.dataset.taskView))
  );

  $$("[data-moodle-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window._moodleImportedSort = btn.dataset.moodleSort;
      $$("[data-moodle-sort]").forEach((b) => b.classList.toggle("active", b === btn));
      if (typeof renderMoodleImportedTasks === "function") renderMoodleImportedTasks();
    });
  });
}
