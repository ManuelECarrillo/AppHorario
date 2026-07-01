// Dynamic click handlers for cards, lists and generated controls.
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

    const capturePhotoButton = event.target.closest("[data-capture-photo]");
    if (capturePhotoButton) {
      captureBoardPhoto(capturePhotoButton.dataset.capturePhoto);
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

    const editTaskButton = event.target.closest("[data-edit-task]");
    if (editTaskButton) {
      editTask(editTaskButton.dataset.editTask);
      return;
    }

    const toggleTaskButton = event.target.closest("[data-toggle-task]");
    if (toggleTaskButton) {
      const checkBtn = toggleTaskButton.closest(".check-button") || toggleTaskButton;
      checkBtn.classList.remove("just-checked");
      void checkBtn.offsetWidth;
      checkBtn.classList.add("just-checked");
      checkBtn.addEventListener("animationend", () => checkBtn.classList.remove("just-checked"), { once: true });
      haptic(50);
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

    const viewPhotoButton = event.target.closest("[data-view-photo]");
    if (viewPhotoButton) {
      openPhotoViewer(viewPhotoButton.dataset.viewPhoto);
      return;
    }

    const downloadPhotoButton = event.target.closest("[data-download-photo]");
    if (downloadPhotoButton) {
      downloadPhoto(downloadPhotoButton.dataset.downloadPhoto);
      return;
    }

    const deletePhotoButton = event.target.closest("[data-delete-photo]");
    if (deletePhotoButton) {
      deletePhoto(deletePhotoButton.dataset.deletePhoto);
      return;
    }

    const schoolAddressButton = event.target.closest("[data-school-address]");
    if (schoolAddressButton) {
      selectSchoolAddress(schoolAddressButton.dataset.schoolAddress);
      return;
    }

    const mapAddressButton = event.target.closest("[data-map-address]");
    if (mapAddressButton) {
      selectSchoolMapAddress(mapAddressButton.dataset.mapAddress);
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
  $("#classTeacher").value = "";
  setClassColor(DEFAULT_CLASS_COLOR);
  $("#classStart").value = "08:00";
  $("#classEnd").value = "09:00";
  $$('input[name="classDay"]').forEach((input) => input.checked = [1, 2, 3, 4, 5].includes(Number(input.value)));
}

// Class and task form persistence.
function saveClass(event) {
  event.preventDefault();
  const id = $("#classId").value || createId();
  const days = $$('input[name="classDay"]:checked').map((input) => Number(input.value));

  if (!days.length) {
    alert("Elige al menos un día.");
    return;
  }

  const existing = state.classes.find((item) => item.id === id);
  const room = $("#classPlace").value.trim();
  const teacher = $("#classTeacher").value.trim();
  const nextClass = {
    id,
    name: $("#className").value.trim(),
    place: formatClassPlace({ room, teacher }),
    room,
    teacher,
    source: existing && existing.source ? existing.source : undefined,
    externalId: existing && existing.externalId ? existing.externalId : undefined,
    color: $("#classColor").value || DEFAULT_CLASS_COLOR,
    start: $("#classStart").value,
    end: $("#classEnd").value,
    days,
    notes: existing && existing.notes ? existing.notes : [],
    recordings: existing && existing.recordings ? existing.recordings : [],
    photos: existing && existing.photos ? existing.photos : []
  };

  state.classes = existing
    ? state.classes.map((item) => item.id === id ? nextClass : item)
    : [...state.classes, nextClass];

  haptic(50);
  saveState();
  closeDialog("classDialog");
  render();
  tick();
  rescheduleNativeNotificationsSoon();
  showToast(existing ? "Clase actualizada" : "Clase guardada");
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
  $("#classPlace").value = getClassRoomText(item);
  $("#classTeacher").value = getClassTeacherText(item);
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
  if (!item) return;

  animateCardRemoval(`[data-delete-class="${id}"]`, () => {
    const snapshotClasses = [...state.classes];
    const snapshotTasks = [...state.tasks];
    const snapshotExams = [...state.exams];

    state.classes = state.classes.filter((classItem) => classItem.id !== id);
    state.tasks = state.tasks.map((task) => task.classId === id ? { ...task, classId: "" } : task);
    state.exams = state.exams.map((exam) => exam.classId === id ? { ...exam, classId: "" } : exam);
    saveState();
    render();
    tick();
    rescheduleNativeNotificationsSoon();
    showToast(`Clase eliminada`, {
      undo: () => {
        state.classes = snapshotClasses;
        state.tasks = snapshotTasks;
        state.exams = snapshotExams;
        saveState();
        render();
        tick();
        rescheduleNativeNotificationsSoon();
      }
    });
  });
}

function syncClassTrigger(selectId) {
  const triggerId = selectId === "taskClass" ? "taskClassTrigger" : "examClassTrigger";
  const trigger = document.getElementById(triggerId);
  if (!trigger) return;
  const val = document.getElementById(selectId)?.value || "";
  const item = val ? getClassById(val) : null;
  trigger.textContent = item ? getClassDisplayName(item) : "Sin clase";
  if (trigger.childElementCount === 0) trigger.insertAdjacentHTML("beforeend", "");
}

function resetTaskForm() {
  $("#taskForm").reset();
  $("#taskId").value = "";
  $("#taskDate").value = toDateInput(new Date());
  $("#taskDueTime").value = toTimeInput(new Date(Date.now() + 60 * 60 * 1000));
  $("#taskTime").value = toTimeInput(new Date(Date.now() + 30 * 60 * 1000));
  $("#taskPriority").value = "normal";
  $("#taskRepeat").value = "none";
  renderTaskClassOptions();
  syncClassTrigger("taskClass");
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
    dueTime: $("#taskDueTime").value,
    reminderTime: $("#taskTime").value,
    time: $("#taskTime").value,
    priority: $("#taskPriority").value,
    repeat: $("#taskRepeat").value,
    details: $("#taskDetails").value.trim(),
    done: existing && existing.done ? existing.done : false,
    completedDates: existing && existing.completedDates ? existing.completedDates : [],
    source: existing && existing.source ? existing.source : "",
    externalId: existing && existing.externalId ? existing.externalId : ""
  };

  const isNew = !state.tasks.find((item) => item.id === id);
  state.tasks = [...state.tasks.filter((item) => item.id !== id), task];
  haptic(50);
  saveState();
  closeDialog("taskDialog");
  render();
  rescheduleNativeNotificationsSoon();
  showToast(isNew ? "Tarea guardada" : "Tarea actualizada");
}

function deleteTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  animateCardRemoval(`[data-delete-task="${id}"]`, () => {
    const snapshot = [...state.tasks];
    state.tasks = state.tasks.filter((item) => item.id !== id);
    saveState();
    render();
    rescheduleNativeNotificationsSoon();
    showToast("Tarea eliminada", {
      undo: () => {
        state.tasks = snapshot;
        saveState();
        render();
        rescheduleNativeNotificationsSoon();
      }
    });
  });
}

function editTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;

  resetTaskForm();
  $("#taskId").value = task.id;
  $("#taskTitle").value = task.title;
  $("#taskDetails").value = task.details || "";
  $("#taskClass").value = task.classId || "";
  syncClassTrigger("taskClass");
  $("#taskDate").value = task.date;
  $("#taskDueTime").value = task.dueTime || task.time;
  $("#taskTime").value = task.reminderTime || task.time;
  $("#taskPriority").value = task.priority || "normal";
  $("#taskRepeat").value = task.repeat || "none";
  openDialog("taskDialog");
}

function toggleTask(id) {
  const today = toDateInput(new Date());
  const cutoff = toDateInput(addDays(new Date(), -90));
  let becomingDone = false;
  let becomingUndone = false;

  state.tasks = state.tasks.map((task) => {
    if (task.id !== id) return task;

    if ((task.repeat || "none") === "none") {
      becomingDone = !task.done;
      becomingUndone = task.done;
      return { ...task, done: !task.done };
    }

    const completedDates = new Set(task.completedDates || []);
    if (completedDates.has(today)) {
      completedDates.delete(today);
      becomingUndone = true;
    } else {
      completedDates.add(today);
      becomingDone = true;
    }

    return { ...task, completedDates: Array.from(completedDates).filter(d => d >= cutoff) };
  });

  const notifiedKey = `${today}:task:${id}`;
  if (becomingDone) {
    cancelTaskNotificationImmediate(id);
  } else if (becomingUndone) {
    delete state.notified[notifiedKey];
  }

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
  syncClassTrigger("examClass");
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

  const oldTaskIds = existing && existing.taskIds ? [...existing.taskIds] : [];
  state.tasks = state.tasks.filter((task) => !exam.taskIds.includes(task.id) && task.examId !== exam.id);
  const reminderTasks = createStudyReminderTasks(exam);
  exam.taskIds = reminderTasks.map((task) => task.id);
  state.tasks = [...state.tasks, ...reminderTasks];
  state.exams = existing
    ? state.exams.map((item) => item.id === id ? exam : item)
    : [...state.exams, exam];

  haptic(50);
  saveState();
  closeDialog("examDialog");
  render();
  if (oldTaskIds.length) cancelOldExamNotifications(oldTaskIds).catch(() => undefined);
  rescheduleNativeNotificationsSoon();
  showToast(existing ? "Examen actualizado" : "Examen guardado");
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
        dueTime: exam.studyTime,
        reminderTime: exam.studyTime,
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
  syncClassTrigger("examClass");
  $("#examDate").value = exam.date;
  $("#examTime").value = exam.time;
  $("#examStudyTime").value = exam.studyTime || "18:00";
  $$('input[name="studyDay"]').forEach((input) => input.checked = (exam.reminderDays || []).includes(Number(input.value)));
  openDialog("examDialog");
}

function deleteExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;

  animateCardRemoval(`[data-delete-exam="${id}"]`, () => {
    const snapshotExams = [...state.exams];
    const snapshotTasks = [...state.tasks];

    state.exams = state.exams.filter((item) => item.id !== id);
    state.tasks = state.tasks.filter((task) => task.examId !== id && !(exam.taskIds || []).includes(task.id));
    saveState();
    render();
    rescheduleNativeNotificationsSoon();
    showToast("Examen eliminado", {
      undo: () => {
        state.exams = snapshotExams;
        state.tasks = snapshotTasks;
        saveState();
        render();
        rescheduleNativeNotificationsSoon();
      }
    });
  });
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
  renderPhotoGallery(item);
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
  const detailLine = [
    room ? `Aula: ${escapeHtml(room)}` : "Sin aula registrada",
    teacher ? `Profesor: ${escapeHtml(teacher)}` : ""
  ].filter(Boolean).join(" · ");
  elements.classDetailMeta.innerHTML = `
    <div>
      <strong>${formatDisplayTimeRange(item.start, item.end)}</strong>
      <p class="muted">${detailLine}</p>
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
    syncClassTrigger("taskClass");
  });
}

function addExamFromDetail() {
  const classId = $("#noteClassId").value;
  replaceDialog("notesDialog", "examDialog", () => {
    resetExamForm();
    $("#examClass").value = classId;
    syncClassTrigger("examClass");
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
  syncClassTrigger("taskClass");
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
  renderPhotoGallery(item);
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
