// Lightweight unit tests for AppHorario date/task logic.
// Run via browser console: loadTests() or by opening /?tests=1.
// Output goes to console (green=pass, red=fail) and returns a summary.
//
// These tests are self-contained: they re-implement tiny stubs of the helpers
// under test so they can run independently of the full app bundle.

(function () {
  "use strict";

  // ── Stubs ──────────────────────────────────────────────────────────────────

  function toDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

  function notificationIdFromKey(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2147483647 || 1;
  }

  // ── Harness ────────────────────────────────────────────────────────────────

  let passed = 0;
  let failed = 0;

  function assert(label, actual, expected) {
    const ok = actual === expected;
    if (ok) {
      console.log(`%c✔ ${label}`, "color:#22c55e");
      passed++;
    } else {
      console.error(`✘ ${label}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  // ── isTaskDueOn tests ──────────────────────────────────────────────────────

  console.group("isTaskDueOn — one-time tasks");
  {
    const task = { date: "2026-06-17", repeat: "none" };
    assert("exact match", isTaskDueOn(task, new Date(2026, 5, 17)), true);
    assert("day before", isTaskDueOn(task, new Date(2026, 5, 16)), false);
    assert("day after", isTaskDueOn(task, new Date(2026, 5, 18)), false);
    assert("month boundary (June 30)", isTaskDueOn({ date: "2026-06-30", repeat: "none" }, new Date(2026, 5, 30)), true);
    assert("year boundary (Dec 31)", isTaskDueOn({ date: "2026-12-31", repeat: "none" }, new Date(2026, 11, 31)), true);
    assert("leap day", isTaskDueOn({ date: "2028-02-29", repeat: "none" }, new Date(2028, 1, 29)), true);
    assert("non-leap day not in non-leap year", isTaskDueOn({ date: "2027-02-29", repeat: "none" }, new Date(2027, 1, 28)), false);
  }
  console.groupEnd();

  console.group("isTaskDueOn — daily repeat");
  {
    const task = { date: "2026-06-01", repeat: "daily" };
    assert("on start date", isTaskDueOn(task, new Date(2026, 5, 1)), true);
    assert("day after start", isTaskDueOn(task, new Date(2026, 5, 10)), true);
    assert("day before start", isTaskDueOn(task, new Date(2026, 4, 31)), false);
  }
  console.groupEnd();

  console.group("isTaskDueOn — weekly repeat");
  {
    // 2026-06-17 is a Wednesday
    const task = { date: "2026-06-17", repeat: "weekly" };
    assert("same Wednesday", isTaskDueOn(task, new Date(2026, 5, 17)), true);
    assert("next Wednesday (+7)", isTaskDueOn(task, new Date(2026, 5, 24)), true);
    assert("Wednesday +14 days", isTaskDueOn(task, new Date(2026, 6, 1)), true);
    assert("Thursday (wrong day)", isTaskDueOn(task, new Date(2026, 5, 18)), false);
    assert("Tuesday (wrong day)", isTaskDueOn(task, new Date(2026, 5, 16)), false);
    assert("before start date", isTaskDueOn(task, new Date(2026, 5, 10)), false);
    // UTC-6 boundary — midnight in Mexico is not midnight UTC
    // 2026-01-05 is a Monday; ensure T12:00 prevents off-by-one
    const mondayTask = { date: "2026-01-05", repeat: "weekly" };
    assert("Monday repeated — same day", isTaskDueOn(mondayTask, new Date(2026, 0, 5)), true);
    assert("Monday repeated — next week", isTaskDueOn(mondayTask, new Date(2026, 0, 12)), true);
    assert("Sunday before Monday task", isTaskDueOn(mondayTask, new Date(2026, 0, 4)), false);
  }
  console.groupEnd();

  console.group("isTaskComplete");
  {
    assert("one-time done=true", isTaskComplete({ repeat: "none", done: true }, "2026-06-17"), true);
    assert("one-time done=false", isTaskComplete({ repeat: "none", done: false }, "2026-06-17"), false);
    assert("one-time no done field", isTaskComplete({ repeat: "none" }, "2026-06-17"), false);
    assert("recurring in completedDates", isTaskComplete({ repeat: "weekly", completedDates: ["2026-06-17"] }, "2026-06-17"), true);
    assert("recurring not in completedDates", isTaskComplete({ repeat: "weekly", completedDates: ["2026-06-10"] }, "2026-06-17"), false);
    assert("recurring empty completedDates", isTaskComplete({ repeat: "daily", completedDates: [] }, "2026-06-17"), false);
    assert("recurring no completedDates field", isTaskComplete({ repeat: "daily" }, "2026-06-17"), false);
  }
  console.groupEnd();

  console.group("toDateInput");
  {
    assert("January 1", toDateInput(new Date(2026, 0, 1)), "2026-01-01");
    assert("December 31", toDateInput(new Date(2026, 11, 31)), "2026-12-31");
    assert("single-digit month/day", toDateInput(new Date(2026, 2, 5)), "2026-03-05");
    assert("leap day", toDateInput(new Date(2028, 1, 29)), "2028-02-29");
  }
  console.groupEnd();

  console.group("notificationIdFromKey");
  {
    const id1 = notificationIdFromKey("class-1-2026-06-17-start");
    const id2 = notificationIdFromKey("class-1-2026-06-17-start");
    const id3 = notificationIdFromKey("class-2-2026-06-17-start");
    assert("deterministic (same key → same id)", id1 === id2, true);
    assert("different keys → different ids", id1 === id3, false);
    assert("id is positive", id1 > 0, true);
    assert("id fits 32-bit signed int", id1 < 2147483647, true);
    assert("empty string does not return 0", notificationIdFromKey("") !== 0, true);
  }
  console.groupEnd();

  const total = passed + failed;
  const summary = `Tests: ${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ""}`;
  console.log(`%c${summary}`, `color:${failed > 0 ? "#ef4444" : "#22c55e"};font-weight:bold;font-size:14px`);

  window._testResults = { passed, failed, total };
  return { passed, failed, total };
})();
