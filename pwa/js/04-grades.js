const GRADES_CREDS_KEY = "appHorario.sii.grades.creds.v1";

function loadSavedGradesCredentials() {
  try {
    const raw = localStorage.getItem(GRADES_CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveGradesCredentials(control, password) {
  try {
    localStorage.setItem(GRADES_CREDS_KEY, JSON.stringify({ control, password }));
  } catch { /* quota exceeded, ignore */ }
}

function clearGradesCredentials() {
  localStorage.removeItem(GRADES_CREDS_KEY);
}

function fillGradesForm() {
  const saved = loadSavedGradesCredentials();
  const controlEl = $("#gradesControl");
  const passwordEl = $("#gradesPassword");
  const rememberEl = $("#gradesRemember");
  const clearBtn = $("#gradesClearSaved");

  if (saved && saved.control) {
    if (controlEl) controlEl.value = saved.control;
    if (passwordEl) passwordEl.value = saved.password || "";
    if (rememberEl) rememberEl.checked = true;
    if (clearBtn) clearBtn.hidden = false;
  } else {
    if (rememberEl) rememberEl.checked = false;
    if (clearBtn) clearBtn.hidden = true;
  }
}

function bindGradesClearButton() {
  const btn = $("#gradesClearSaved");
  if (!btn) return;
  btn.addEventListener("click", () => {
    clearGradesCredentials();
    const controlEl = $("#gradesControl");
    const passwordEl = $("#gradesPassword");
    const rememberEl = $("#gradesRemember");
    if (controlEl) controlEl.value = "";
    if (passwordEl) passwordEl.value = "";
    if (rememberEl) rememberEl.checked = false;
    btn.hidden = true;
    showToast("Datos de acceso olvidados.");
  });
}

// Grades import from SII. The parser accepts tables, JSON-like responses and
// loose text because the school portal can return different shapes.
async function loadGrades(event) {
  event.preventDefault();

  const control = $("#gradesControl").value.trim();
  const password = $("#gradesPassword").value.trim();

  if (!control || !password) {
    setGradesMessage("Escribe tu número de control y NIP para consultar.", "error");
    return;
  }

  if (!/^\d{1,4}$/.test(password)) {
    setGradesMessage("El NIP debe ser numérico y de máximo 4 dígitos.", "error");
    return;
  }

  const remember = $("#gradesRemember") && $("#gradesRemember").checked;
  if (remember) {
    saveGradesCredentials(control, password);
    const clearBtn = $("#gradesClearSaved");
    if (clearBtn) clearBtn.hidden = false;
  } else {
    clearGradesCredentials();
    const clearBtn = $("#gradesClearSaved");
    if (clearBtn) clearBtn.hidden = true;
  }

  setGradesBusy(true);
  setGradesDialogExpanded(false);
  setGradesMessage("Consultando calificaciones...", "pending");
  elements.gradesList.innerHTML = [1, 2, 3].map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-pills">
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
        <div class="skeleton-pill"></div>
      </div>
    </div>
  `).join("");

  try {
    const response = await postSiiGrades(control, password);
    const grades = parseSiiGrades(response.data);

    if (response && (response.status < 200 || response.status >= 400)) {
      setGradesDialogExpanded(false);
      setGradesMessage(`La app llegó al endpoint, pero el servidor respondió con HTTP ${response.status}.`, "error");
      return;
    }

    if (!grades.length) {
      const rawStr = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
      const snippet = rawStr.length > 30 ? `\n\nInicio de respuesta (${rawStr.length} chars):\n${rawStr.slice(0, 250)}` : "";
      logSiiEvent("parseFailed", { url: response.url || "", data: response, note: "No grades parsed" });
      setGradesDialogExpanded(false);
      setGradesMessage(`Conectó con el SII pero no pude leer las calificaciones. Presiona "Exportar log SII" en Ajustes para diagnóstico.${snippet}`, "error");
      elements.gradesList.innerHTML = emptyState("Sin calificaciones detectadas.");
      return;
    }

    const zeroCount = countZeroGrades(grades);
    setGradesDialogExpanded(true);
    setGradesMessage(
      `Encontré ${grades.length} materia${grades.length === 1 ? "" : "s"} con calificaciones. ${zeroCount ? `${zeroCount} en rojo.` : "Sin calificaciones en cero."}`,
      "success"
    );
    renderGrades(grades);
  } catch (error) {
    setGradesDialogExpanded(false);
    setGradesMessage(getSiiLoginErrorMessage(error), "error");
    elements.gradesList.innerHTML = emptyState("No pude cargar calificaciones.");
  } finally {
    setGradesBusy(false);
  }
}

function parseSiiGrades(data) {
  if (!data) return [];

  if (typeof data !== "string") {
    return normalizeGradesData(data);
  }

  const trimmed = data.trim();
  if (!trimmed) return [];

  try {
    return normalizeGradesData(JSON.parse(trimmed));
  } catch {
    return parseGradesHtml(trimmed);
  }
}

function normalizeGradesData(data) {
  const rows = getGradeRows(data);
  const normalizedRows = normalizeGradeRows(rows);
  return dedupeGradeRows(normalizedRows.map(normalizeGradeRow).filter(isRenderableGradeRow));
}

function normalizeGradeRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (!Array.isArray(rows[0])) return rows;

  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.some((cell) => normalizeHeader(cell)));
  const headers = headerIndex >= 0 ? rows[headerIndex].map(normalizeHeader) : [];

  return rows
    .filter((row, index) => Array.isArray(row) && index !== headerIndex)
    .map((row) => {
      const mapped = {};
      headers.forEach((header, index) => {
        if (header) mapped[header] = row[index] || "";
      });

      if (pickFirst(mapped, GRADE_SUBJECT_KEYS)) return mapped;
      return mapGradeCells(row.map(cleanText));
    });
}

function getGradeRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const candidateKeys = [
    "calificaciones",
    "calificacion",
    "califs",
    "grades",
    "grade",
    "parciales",
    "evaluaciones",
    "evaluacion",
    "kardex",
    "boleta",
    "materias",
    "subjects",
    "data",
    "datos",
    "payload",
    "response",
    "respuesta",
    "result",
    "resultado",
    "rows",
    "items",
    "records"
  ];

  for (const [key, candidate] of Object.entries(data)) {
    if (!candidateKeys.includes(normalizeHeader(key))) continue;
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nestedRows = getGradeRows(candidate);
      if (nestedRows.length) return nestedRows;
    }
  }

  for (const candidate of Object.values(data)) {
    if (!candidate || typeof candidate !== "object") continue;
    const nestedRows = getGradeRows(candidate);
    if (nestedRows.length) return nestedRows;
  }

  return [];
}

function normalizeGradeRow(row) {
  if (!row || typeof row !== "object") return null;

  const flatRow = flattenGradeRow(row);
  const subject = cleanText(pickFirst(flatRow, GRADE_SUBJECT_KEYS)) || pickLikelySubject(flatRow);
  if (!subject) return null;

  const teacher = cleanText(pickFirst(flatRow, ["profesor", "docente", "maestro", "teacher", "catedratico", "catedrático"]));
  const average = cleanText(pickFirst(flatRow, ["promedio", "prom", "final", "calificacion_final", "calificacionFinal", "average"]));
  const status = cleanText(pickFirst(flatRow, ["estatus", "estado", "status", "observacion", "observación", "resultado"]));
  const grades = [];

  Object.entries(flatRow).forEach(([key, value]) => {
    const label = getGradeLabel(key);
    const grade = cleanText(value);
    if (!label || !grade) return;
    grades.push({ label, value: grade });
  });

  return {
    subject: splitSiiClassNameAndTeacher(subject, teacher).name,
    teacher,
    average,
    status,
    grades
  };
}

const GRADE_SUBJECT_KEYS = [
  "materia",
  "asignatura",
  "nombre",
  "nombre_materia",
  "nombreMateria",
  "materia_nombre",
  "nom_materia",
  "nombre_asignatura",
  "asignatura_nombre",
  "descripcion",
  "descripcion_materia",
  "materia_descripcion",
  "clase",
  "subject",
  "modulo",
  "curso"
];

function flattenGradeRow(row, prefix = "") {
  return Object.entries(row).reduce((values, [key, value]) => {
    const nextKey = prefix ? `${prefix}_${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...values, ...flattenGradeRow(value, nextKey) };
    }

    values[nextKey] = Array.isArray(value) ? value.join(" ") : value;
    return values;
  }, {});
}

function pickLikelySubject(row) {
  const candidates = Object.entries(row)
    .filter(([key, value]) => !getGradeLabel(key) && !isGradeMetaKey(key))
    .map(([, value]) => cleanText(value))
    .filter((value) => value.length >= 5 && !isGradeLikeValue(value) && !looksLikeOnlyCode(value))
    .sort((a, b) => b.length - a.length);

  return candidates[0] || "";
}

function isGradeMetaKey(key) {
  const normalized = normalizeHeader(key);
  return [
    "profesor",
    "docente",
    "maestro",
    "teacher",
    "promedio",
    "prom",
    "final",
    "estatus",
    "estado",
    "status",
    "observacion",
    "resultado",
    "clave",
    "id",
    "grupo"
  ].includes(normalized);
}

function isGradeLikeValue(value) {
  const text = cleanText(value);
  return /^(\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd|aprobado|reprobado)$/i.test(text);
}

function looksLikeOnlyCode(value) {
  const text = cleanText(value);
  return /^[a-z0-9\-_.]+$/i.test(text) && /\d/.test(text) && text.length <= 14;
}

function getGradeLabel(key) {
  const normalized = normalizeHeader(key);
  const labels = {
    p1: "P1",
    p2: "P2",
    p3: "P3",
    p4: "P4",
    p5: "P5",
    p6: "P6",
    calificacion: "Calif.",
    calif: "Calif.",
    calif1: "P1",
    calif2: "P2",
    calif3: "P3",
    calif4: "P4",
    cal1: "P1",
    cal2: "P2",
    cal3: "P3",
    cal4: "P4",
    c1: "P1",
    c2: "P2",
    c3: "P3",
    c4: "P4",
    eval1: "P1",
    eval2: "P2",
    eval3: "P3",
    eval4: "P4",
    evaluacion1: "P1",
    evaluacion2: "P2",
    evaluacion3: "P3",
    evaluacion4: "P4",
    parcial1: "P1",
    parcial2: "P2",
    parcial3: "P3",
    parcial4: "P4",
    unidad1: "U1",
    unidad2: "U2",
    unidad3: "U3",
    unidad4: "U4",
    unidad5: "U5",
    unidad6: "U6",
    u1: "U1",
    u2: "U2",
    u3: "U3",
    u4: "U4",
    u5: "U5",
    u6: "U6",
    primer_parcial: "P1",
    segundo_parcial: "P2",
    tercer_parcial: "P3",
    cuarto_parcial: "P4"
  };

  if (labels[normalized]) return labels[normalized];

  const partialMatch = normalized.match(/(?:parcial|unidad|u|p)_?(\d+)/);
  if (partialMatch) {
    return normalized.includes("unidad") || normalized.startsWith("u") ? `U${partialMatch[1]}` : `P${partialMatch[1]}`;
  }

  const gradeMatch = normalized.match(/(?:calif|calificacion|cal|c|eval|evaluacion)_?(\d+)/);
  if (gradeMatch) return `P${gradeMatch[1]}`;

  return "";
}

function parseGradesHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [];

  const embeddedGrades = parseEmbeddedGradesFromHtml(doc);
  if (embeddedGrades.length) return embeddedGrades;

  Array.from(doc.querySelectorAll("table")).forEach((table) => {
    const headerRow = Array.from(table.querySelectorAll("tr")).find((tr) => tr.querySelectorAll("th,td").length >= 2);
    const headers = headerRow
      ? Array.from(headerRow.querySelectorAll("th,td")).map((cell) => normalizeHeader(getCellText(cell)))
      : [];

    Array.from(table.querySelectorAll("tr")).forEach((tr, rowIndex) => {
      const cells = Array.from(tr.querySelectorAll("td,th")).map(getCellText);
      if (cells.length < 2 || rowIndex === 0) return;

      const row = {};
      headers.forEach((header, index) => {
        if (header) row[header] = cells[index] || "";
      });

      if (!Object.keys(row).length || !pickFirst(row, GRADE_SUBJECT_KEYS)) {
        Object.assign(row, mapGradeCells(cells));
      }

      const normalized = normalizeGradeRow(row);
      if (isRenderableGradeRow(normalized)) rows.push(normalized);
    });
  });

  if (rows.length) return rows;
  return parseLooseGradesText(getHtmlTextLines(doc));
}

function getCellText(cell) {
  if (!cell) return "";
  return cleanText(cell.innerText || cell.textContent || "");
}

function mapGradeCells(cells) {
  const row = {};
  const subjectIndex = cells.findIndex((cell) => cell.length >= 5 && !isGradeLikeValue(cell) && !looksLikeOnlyCode(cell));
  row.materia = subjectIndex >= 0 ? cells[subjectIndex] : cells[0] || "";

  cells.forEach((cell, index) => {
    if (index === subjectIndex) return;
    if (isGradeLikeValue(cell)) row[`parcial_${Object.keys(row).filter((key) => key.startsWith("parcial_")).length + 1}`] = cell;
  });

  return row;
}

function parseEmbeddedGradesFromHtml(doc) {
  const textCandidates = Array.from(doc.querySelectorAll("script, pre, code"))
    .map((node) => node.textContent || "")
    .concat([doc.body ? doc.body.textContent || "" : ""]);

  for (const text of textCandidates) {
    const parsed = parseFirstJsonGradeCandidate(text);
    if (parsed.length) return parsed;
  }

  return [];
}

function parseFirstJsonGradeCandidate(text) {
  const source = cleanText(text);
  if (!source || !/(calif|materia|asignatura|parcial|unidad)/i.test(source)) return [];

  const candidates = [];
  const objectMatches = source.match(/\{[\s\S]*\}/g) || [];
  const arrayMatches = source.match(/\[[\s\S]*\]/g) || [];
  candidates.push(...arrayMatches, ...objectMatches);

  for (const candidate of candidates) {
    try {
      const grades = normalizeGradesData(JSON.parse(candidate));
      if (grades.length) return grades;
    } catch {
      // Keep looking for another embedded JSON candidate.
    }
  }

  return [];
}

function getHtmlTextLines(doc) {
  const blockSelector = "li, p, div, section, article, tr, label, span";
  const blocks = Array.from(doc.querySelectorAll(blockSelector))
    .map((node) => cleanText(node.textContent))
    .filter(Boolean);

  const bodyText = doc.body ? doc.body.textContent || "" : "";
  const bodyLines = bodyText
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);

  return Array.from(new Set([...blocks, ...bodyLines]))
    .filter((line) => line.length >= 2);
}

function parseLooseGradesText(lines) {
  const rows = [];
  let current = null;

  lines.forEach((line) => {
    const row = parseLooseGradeLine(line);
    if (row) {
      const normalized = normalizeGradeRow(row);
      if (isRenderableGradeRow(normalized)) rows.push(normalized);
      current = row;
      return;
    }

    if (!current) {
      const subject = extractSubjectFromLine(line);
      if (subject) current = { materia: subject };
      return;
    }

    const gradeParts = extractGradesFromText(line);
    if (gradeParts.length) {
      gradeParts.forEach((grade, index) => {
        current[`parcial_${index + 1}`] = grade.value;
      });

      const normalized = normalizeGradeRow(current);
      if (isRenderableGradeRow(normalized)) rows.push(normalized);
      current = null;
      return;
    }

    const average = extractAverageFromText(line);
    if (average) {
      current.promedio = average;
      const normalized = normalizeGradeRow(current);
      if (isRenderableGradeRow(normalized)) rows.push(normalized);
      current = null;
    }
  });

  return dedupeGradeRows(rows);
}

function parseLooseGradeLine(line) {
  const subject = extractSubjectFromLine(line);
  const grades = extractGradesFromText(line);
  const average = extractAverageFromText(line);

  if (!subject || (!grades.length && !average)) return null;

  const row = { materia: subject };
  grades.forEach((grade, index) => {
    row[grade.key || `parcial_${index + 1}`] = grade.value;
  });
  if (average) row.promedio = average;

  return row;
}

function extractSubjectFromLine(line) {
  const text = cleanText(line);
  if (!text || isLikelyNonGradeText(text)) return "";

  const labeled = text.match(/(?:materia|asignatura|clase|curso|modulo|m[oó]dulo)\s*:?\s*(.+?)(?=\s+(?:parcial|unidad|calif|calificaci[oó]n|eval|evaluaci[oó]n|promedio|prom|final|u\d|p\d|c\d)\b|$)/i);
  if (labeled) return cleanLooseSubject(labeled[1]);

  const tokens = text.split(/\s+/);
  const firstGradeIndex = tokens.findIndex(isGradeLikeValue);
  if (firstGradeIndex > 0) {
    return cleanLooseSubject(tokens.slice(0, firstGradeIndex).join(" "));
  }

  return "";
}

function extractGradesFromText(line) {
  const grades = [];
  const text = cleanText(line);
  const labeledPattern = /(?:parcial|unidad|calif(?:icaci[oó]n)?|eval(?:uaci[oó]n)?|p|u|c)\s*\.?\s*(\d{0,2})\s*:?\s*(\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd)/gi;
  let match;

  while ((match = labeledPattern.exec(text))) {
    const number = match[1] || String(grades.length + 1);
    grades.push({ key: `parcial_${number}`, value: match[2] });
  }

  if (grades.length) return grades;

  const numberMatches = text.match(/\b(?:\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd)\b/gi) || [];
  return numberMatches
    .filter((value) => isGradeLikeValue(value))
    .map((value, index) => ({ key: `parcial_${index + 1}`, value }));
}

function extractAverageFromText(line) {
  const match = cleanText(line).match(/(?:promedio|prom|final)\s*:?\s*(\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd)/i);
  return match ? match[1] : "";
}

function cleanLooseSubject(value) {
  const subject = cleanText(value)
    .replace(/\b(?:parcial|unidad|calif(?:icaci[oó]n)?|eval(?:uaci[oó]n)?|promedio|prom|final)\b.*$/i, "")
    .replace(/\b(?:\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd)\b.*$/i, "")
    .replace(/[·|,;:/\-–—]+$/g, "")
    .trim();

  return subject.length >= 4 && !looksLikeOnlyCode(subject) ? splitSiiClassNameAndTeacher(subject).name : "";
}

function isLikelyNonGradeText(text) {
  const normalized = normalizeHeader(text).replace(/_/g, " ");
  return /^(iniciar sesion|acceso|usuario|contrasena|password|nip|numero de control|entrar|consultar|sistema)$/i.test(normalized)
    || normalized.includes("no de control")
    || normalized.includes("introduce los datos");
}

function hasVisibleGrade(item) {
  return Boolean((item.grades && item.grades.length) || item.average);
}

function isRenderableGradeRow(item) {
  return Boolean(item && hasVisibleGrade(item) && isValidGradeSubject(item.subject));
}

function isValidGradeSubject(subject) {
  const text = cleanText(subject);
  return text.length >= 3 && !/^[A-Z]$/i.test(text) && !isLikelyNonGradeText(text);
}

function dedupeGradeRows(rows) {
  const seen = new Set();
  return rows.filter((item) => {
    const key = `${item.subject}|${item.grades.map((grade) => `${grade.label}:${grade.value}`).join("|")}|${item.average}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function describeGradesResponse(data) {
  if (!data) return "Respuesta vacía.";

  if (typeof data !== "string") {
    return describeGradeObject(data);
  }

  const trimmed = data.trim();
  if (!trimmed) return "Respuesta vacía.";

  try {
    return describeGradeObject(JSON.parse(trimmed));
  } catch {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    const firstHeaders = tables[0]
      ? Array.from(tables[0].querySelectorAll("tr:first-child th, tr:first-child td")).map((cell) => normalizeHeader(cell.textContent)).filter(Boolean).slice(0, 8)
      : [];
    const lines = getHtmlTextLines(doc);
    const gradeLikeLines = lines.filter((line) => /\b(?:\d{1,3}(?:\.\d+)?|np|na|ac|nc|sd)\b/i.test(line)).length;
    const preview = getSafeResponsePreview(trimmed, lines);

    return `Formato HTML, ${tables.length} tabla${tables.length === 1 ? "" : "s"} detectada${tables.length === 1 ? "" : "s"}, ${lines.length} bloque${lines.length === 1 ? "" : "s"} de texto, ${gradeLikeLines} con números${firstHeaders.length ? `, columnas: ${firstHeaders.join(", ")}` : ""}${preview ? `, texto: "${preview}"` : ""}.`;
  }
}

function getSafeResponsePreview(rawText, lines = []) {
  const source = lines.length
    ? lines.join(" ")
    : cleanText(rawText.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  const preview = sanitizeResponsePreview(source);
  return preview.length > 120 ? `${preview.slice(0, 120)}...` : preview;
}

function sanitizeResponsePreview(value) {
  return cleanText(value)
    .replace(/\b\d{4,}\b/g, "####")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo]")
    .replace(/(contrasena|contrase\u00f1a|password|nip)\s*[:=]\s*\S+/gi, "$1=[oculto]")
    .replace(/(usuario|control)\s*[:=]\s*\S+/gi, "$1=[oculto]");
}

function describeGradeObject(data) {
  if (Array.isArray(data)) {
    const first = data.find(Boolean);
    if (Array.isArray(first)) return `Formato JSON con filas tipo lista, ${data.length} fila${data.length === 1 ? "" : "s"}.`;
    if (first && typeof first === "object") {
      return `Formato JSON con ${data.length} fila${data.length === 1 ? "" : "s"}, claves: ${Object.keys(first).map(normalizeHeader).filter(Boolean).slice(0, 8).join(", ")}.`;
    }
    return `Formato JSON con lista de ${data.length} elemento${data.length === 1 ? "" : "s"}.`;
  }

  if (data && typeof data === "object") {
    return `Formato JSON, claves: ${Object.keys(data).map(normalizeHeader).filter(Boolean).slice(0, 10).join(", ")}.`;
  }

  return `Formato ${typeof data}.`;
}

function renderGrades(grades) {
  elements.gradesList.innerHTML = grades.map((item) => `
    <article class="grade-card">
      <div>
        <h3>${escapeHtml(item.subject)}</h3>
        ${item.teacher ? `<p class="muted">Profesor: ${escapeHtml(item.teacher)}</p>` : ""}
      </div>
      <div class="grade-values">
        ${item.grades.length ? item.grades.map((grade) => `
          <span class="grade-pill${isZeroGradeValue(grade.value) ? " danger" : ""}">
            <small>${escapeHtml(grade.label)}</small>
            <strong>${escapeHtml(grade.value)}</strong>
          </span>
        `).join("") : `<span class="muted">Sin parciales visibles</span>`}
        ${item.average ? `
          <span class="grade-pill average${isZeroGradeValue(item.average) ? " danger" : ""}">
            <small>Promedio</small>
            <strong>${escapeHtml(item.average)}</strong>
          </span>
        ` : ""}
      </div>
      ${item.status ? `<p class="muted">${escapeHtml(item.status)}</p>` : ""}
    </article>
  `).join("");
}

function resetGradesDialog() {
  setGradesDialogExpanded(false);
  if (elements.gradesList) elements.gradesList.innerHTML = emptyState("Inicia sesión para consultar tus parciales.");
  setGradesMessage("Consulta tus parciales. Tus datos se guardan cifrados si tienes PIN activo.");
  setGradesBusy(false);
  fillGradesForm();
  bindGradesClearButton();
}

function countZeroGrades(grades) {
  return grades.reduce((total, item) => {
    const zeroPartials = (item.grades || []).filter((grade) => isZeroGradeValue(grade.value)).length;
    const zeroAverage = isZeroGradeValue(item.average) ? 1 : 0;
    return total + zeroPartials + zeroAverage;
  }, 0);
}

function isZeroGradeValue(value) {
  const text = cleanText(value).replace(",", ".");
  if (!text) return false;
  return /^0(?:\.0+)?$/.test(text);
}

function setGradesDialogExpanded(isExpanded) {
  const dialog = $("#gradesDialog");
  if (!dialog) return;
  dialog.classList.toggle("grades-loaded", Boolean(isExpanded));
}

function setGradesBusy(isBusy) {
  if (elements.gradesSubmitButton) elements.gradesSubmitButton.disabled = isBusy;
}

function setGradesMessage(message, tone = "") {
  if (!elements.gradesMessage) return;
  elements.gradesMessage.textContent = message;
  elements.gradesMessage.dataset.tone = tone;
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
