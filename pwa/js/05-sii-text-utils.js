function normalizeHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Text cleanup for SII responses. Some endpoints send ISO-8859-1 data without
// declaring it, so Android can receive broken characters unless we repair them.
function cleanText(value) {
  return repairTextEncoding(String(value || "")).replace(/\s+/g, " ").trim();
}

function repairTextEncoding(value) {
  let text = String(value || "");
  if (!/[\u00c3\u00c2\u00e2\uFFFD]/.test(text)) return text;

  const repaired = decodeLatin1AsUtf8(text);
  if (repaired && getEncodingIssueScore(repaired) < getEncodingIssueScore(text)) {
    text = repaired;
  }

  text = text
    .replace(/\u00c3\u2018/g, "\u00d1")
    .replace(/\u00c3\u00b1/g, "\u00f1")
    .replace(/\u00c3\u00a1/g, "\u00e1")
    .replace(/\u00c3\u00a9/g, "\u00e9")
    .replace(/\u00c3\u00ad/g, "\u00ed")
    .replace(/\u00c3\u00b3/g, "\u00f3")
    .replace(/\u00c3\u00ba/g, "\u00fa")
    .replace(/\u00c3\u0081/g, "\u00c1")
    .replace(/\u00c3\u2030/g, "\u00c9")
    .replace(/\u00c3\u008d/g, "\u00cd")
    .replace(/\u00c3\u201c/g, "\u00d3")
    .replace(/\u00c3\u0160/g, "\u00da")
    .replace(/\u00c3\u00bc/g, "\u00fc")
    .replace(/\u00c3\u0152/g, "\u00dc")
    .replace(/\u00c2\u00b7/g, "\u00b7")
    .replace(/\u00c2\u00bf/g, "\u00bf")
    .replace(/\u00c2\u00a1/g, "\u00a1")
    .replace(/\u00e2\u20ac\u201c|\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u0153|\u00e2\u20ac/g, '"');

  return repairCommonSpanishReplacementCharacters(text);
}

function repairCommonSpanishReplacementCharacters(value) {
  return String(value || "")
    .replace(/ZU\uFFFDIGA/gi, (match) => keepCase(match, "ZU\u00d1IGA", "Zu\u00f1iga"))
    .replace(/DISE\uFFFDO/gi, (match) => keepCase(match, "DISE\u00d1O", "Dise\u00f1o"))
    .replace(/ESPA\uFFFDOL/gi, (match) => keepCase(match, "ESPA\u00d1OL", "Espa\u00f1ol"))
    .replace(/SE\uFFFDALES/gi, (match) => keepCase(match, "SE\u00d1ALES", "Se\u00f1ales"))
    .replace(/PE\uFFFDA/gi, (match) => keepCase(match, "PE\u00d1A", "Pe\u00f1a"))
    .replace(/MU\uFFFDOZ/gi, (match) => keepCase(match, "MU\u00d1OZ", "Mu\u00f1oz"))
    .replace(/ACU\uFFFDA/gi, (match) => keepCase(match, "ACU\u00d1A", "Acu\u00f1a"))
    .replace(/CA\uFFFDEDO/gi, (match) => keepCase(match, "CA\u00d1EDO", "Ca\u00f1edo"))
    .replace(/A\uFFFDO/gi, (match) => keepCase(match, "A\u00d1O", "A\u00f1o"));
}

function keepCase(source, upperValue, titleValue) {
  return source === source.toUpperCase() ? upperValue : titleValue;
}

function decodeLatin1AsUtf8(value) {
  if (typeof TextDecoder !== "function") return "";

  try {
    const bytes = Uint8Array.from(String(value), (char) => char.charCodeAt(0) & 255);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function getEncodingIssueScore(value) {
  const matches = String(value || "").match(/[\u00c3\u00c2\u00e2\uFFFD]/g);
  return matches ? matches.length : 0;
}

function splitSiiClassNameAndTeacher(value, knownTeacher = "") {
  const originalName = stripLeadingSiiNoise(cleanText(value));
  let name = originalName;
  let teacher = cleanText(knownTeacher).replace(/^prof\.?\s*/i, "");

  if (!name) {
    return { name: "", teacher };
  }

  if (teacher) {
    const teacherPattern = escapeRegExp(teacher).replace(/\s+/g, "\\s+");
    const withoutTeacher = cleanText(name
      .replace(new RegExp(`(?:[\\s·|,;:/\\-–—]+)?(?:prof(?:esor|esora)?\\.?|docente|maestr[oa]|catedr[aá]tico|instructor)?\\s*:?\\s*${teacherPattern}`, "i"), "")
      .replace(/[·|,;:/\-–—]+$/g, ""));

    if (withoutTeacher && withoutTeacher.length >= 3) {
      name = withoutTeacher;
    }
  }

  const labeledTeacher = name.match(/(?:^|[\s·|,;:/\-–—]+)(?:prof(?:esor|esora)?\.?|docente|maestr[oa]|catedr[aá]tico|instructor)\s*:?\s+(.+)$/i);
  if (labeledTeacher) {
    const beforeLabel = cleanText(name
      .slice(0, labeledTeacher.index)
      .replace(/[·|,;:/\-–—]+$/g, ""));
    const teacherCandidate = cleanTeacherName(labeledTeacher[1]);

    if (beforeLabel && teacherCandidate) {
      name = beforeLabel;
      teacher = teacher || teacherCandidate;
    }
  }

  return {
    name: cleanText(name) || originalName,
    teacher
  };
}

function stripLeadingSiiNoise(value) {
  const tokens = cleanText(value).split(" ").filter(Boolean);
  let index = 0;
  let removedNumericTokens = 0;

  while (index < tokens.length && removedNumericTokens < 7 && /\d/.test(tokens[index])) {
    index += 1;
    removedNumericTokens += 1;
  }

  return removedNumericTokens ? tokens.slice(index).join(" ") : cleanText(value);
}

function cleanTeacherName(value) {
  const text = cleanText(value)
    .replace(/\b(?:aula|sal[oó]n|salon|room|classroom|grupo|edificio|horario)\b.*$/i, "")
    .replace(/[·|,;:/\-–—]+$/g, "")
    .trim();

  return text.length >= 3 ? text : "";
}

function normalizeTime(value) {
  const text = cleanText(value);
  const match = text.match(/(\d{1,2}):?(\d{2})/);
  if (!match) return "";

  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeRange(value) {
  const text = cleanText(value);
  const matches = Array.from(text.matchAll(/(\d{1,2}):?(\d{2})/g));
  if (matches.length < 2) return { start: "", end: "" };

  return {
    start: normalizeTime(matches[0][0]),
    end: normalizeTime(matches[1][0])
  };
}

function getScheduleFromDayColumns(row) {
  const schedule = { days: [], start: "", end: "", place: "" };
  const dayColumns = [
    { day: 0, keys: ["domingo", "dom", "sunday", "sun"] },
    { day: 1, keys: ["lunes", "lun", "monday", "mon", "l"] },
    { day: 2, keys: ["martes", "mar", "tuesday", "tue", "m"] },
    { day: 3, keys: ["miercoles", "mie", "wednesday", "wed", "x"] },
    { day: 4, keys: ["jueves", "jue", "thursday", "thu", "j"] },
    { day: 5, keys: ["viernes", "vie", "friday", "fri", "v"] },
    { day: 6, keys: ["sabado", "sab", "saturday", "sat", "s"] }
  ];

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    const column = dayColumns.find((item) => item.keys.includes(normalizedKey));
    if (!column || !isActiveScheduleCell(value)) return;

    schedule.days.push(column.day);
    const range = parseTimeRange(value);
    if (!schedule.start && range.start) schedule.start = range.start;
    if (!schedule.end && range.end) schedule.end = range.end;
    if (!schedule.place) schedule.place = extractPlaceFromScheduleCell(value);
  });

  schedule.days = Array.from(new Set(schedule.days)).sort((a, b) => a - b);
  return schedule;
}

function extractPlaceFromScheduleCell(value) {
  const text = cleanText(value);
  if (!text) return "";

  const withoutTimes = text
    .replace(/\d{1,2}:?\d{2}\s*(?:-|a|A|–|—|\/)?\s*/g, " ")
    .replace(/\bhrs?\.?\b/gi, " ")
    .replace(/\bhoras?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutTimes || parseScheduleDays(withoutTimes).length) return "";
  if (/^(si|yes|true|x)$/i.test(withoutTimes)) return "";

  return withoutTimes;
}

function formatClassPlace({ room = "", teacher = "" } = {}) {
  const parts = [
    room ? String(room).trim() : "",
    teacher ? `Prof. ${String(teacher).trim().replace(/^prof\.?\s*/i, "")}` : ""
  ].filter(Boolean);

  return Array.from(new Set(parts)).join(" · ");
}

function isActiveScheduleCell(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;

  const text = cleanText(value).toLowerCase();
  if (!text) return false;

  return !["0", "no", "false", "-", "n/a", "na", "null"].includes(text);
}

function parseScheduleDays(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap(parseScheduleDays))).sort((a, b) => a - b);
  }

  const text = cleanText(value).toLowerCase();
  if (!text) return [];

  const dayMap = [
    ["domingo", "dom", "sunday", "sun"],
    ["lunes", "lun", "monday", "mon", "l"],
    ["martes", "mar", "tuesday", "tue", "m"],
    ["miercoles", "miércoles", "mie", "mié", "wednesday", "wed", "x"],
    ["jueves", "jue", "thursday", "thu", "j"],
    ["viernes", "vie", "friday", "fri", "v"],
    ["sabado", "sábado", "sab", "sáb", "saturday", "sat", "s"]
  ];
  const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const days = new Set();

  dayMap.forEach((names, day) => {
    if (names.some((name) => new RegExp(`(^|[^a-z])${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}([^a-z]|$)`).test(normalizedText))) {
      days.add(day);
    }
  });

  if (/lunes\s*a\s*viernes|lun\s*a\s*vie|l-v|lv/.test(normalizedText)) {
    [1, 2, 3, 4, 5].forEach((day) => days.add(day));
  }

  return Array.from(days).sort((a, b) => a - b);
}

function pickClassColor(index) {
  const colors = ["#216869", "#c7503d", "#c7972b", "#3563a9", "#7a4f9f", "#0f766e", "#db2777", "#65a30d"];
  return colors[index % colors.length];
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setSiiBusy(isBusy) {
  if (elements.siiSubmitButton) elements.siiSubmitButton.disabled = isBusy;
}

function setSiiLoginMessage(message, tone = "") {
  if (!elements.siiLoginMessage) return;
  elements.siiLoginMessage.textContent = message;
  elements.siiLoginMessage.dataset.tone = tone;
}

function setSiiStatus(message) {
  if (elements.siiStatus) elements.siiStatus.textContent = message;
}
