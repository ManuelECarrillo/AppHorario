// Optional PIN-based AES-GCM encryption for app state.
// Uses Web Crypto API (PBKDF2 key derivation + AES-256-GCM).
// Encryption is opt-in. When disabled the app works exactly as before.

const STORAGE_ENC_KEY = "appHorario.state.enc.v1";
const STORAGE_ENC_META_KEY = "appHorario.enc.meta.v1";

let _sessionKey = null;

function isPinEnabled() {
  try {
    const meta = localStorage.getItem(STORAGE_ENC_META_KEY);
    return Boolean(meta && JSON.parse(meta).enabled);
  } catch {
    return false;
  }
}

function getEncMeta() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ENC_META_KEY) || "{}");
  } catch {
    return {};
  }
}

async function deriveKey(pin, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  const salt = hexToBytes(saltHex);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function encryptJson(json, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(json));
  return JSON.stringify({
    iv: bytesToHex(iv),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  });
}

async function decryptJson(blob, key) {
  const { iv, data } = JSON.parse(blob);
  const ciphertext = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexToBytes(iv) }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function encryptAndSave(json) {
  if (!_sessionKey) return;
  try {
    const blob = await encryptJson(json, _sessionKey);
    localStorage.setItem(STORAGE_ENC_KEY, blob);
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Encryption save failed:", error);
  }
}

async function tryLoadEncryptedState(pin) {
  const meta = getEncMeta();
  if (!meta.salt) return null;

  try {
    const key = await deriveKey(pin, meta.salt);
    const blob = localStorage.getItem(STORAGE_ENC_KEY);
    if (!blob) return null;
    const json = await decryptJson(blob, key);
    _sessionKey = key;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function enablePinEncryption(pin) {
  const json = JSON.stringify(state);
  const salt = randomHex(16);
  const key = await deriveKey(pin, salt);
  const blob = await encryptJson(json, key);
  localStorage.setItem(STORAGE_ENC_KEY, blob);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_ENC_META_KEY, JSON.stringify({ enabled: true, salt }));
  _sessionKey = key;
  showToast("Cifrado activado. Recuerda tu PIN.");
}

async function disablePinEncryption(pin) {
  const meta = getEncMeta();
  if (!meta.salt) return;
  try {
    const key = await deriveKey(pin, meta.salt);
    const blob = localStorage.getItem(STORAGE_ENC_KEY);
    if (blob) {
      const json = await decryptJson(blob, key);
      localStorage.setItem(STORAGE_KEY, json);
    }
    localStorage.removeItem(STORAGE_ENC_KEY);
    localStorage.removeItem(STORAGE_ENC_META_KEY);
    _sessionKey = null;
    showToast("Cifrado desactivado.");
  } catch {
    showToast("PIN incorrecto. No se pudo desactivar el cifrado.");
  }
}

function schedulePinEncryptedSave() {
  if (!_sessionKey) return;
  clearTimeout(_pinSaveTimer);
  _pinSaveTimer = setTimeout(() => encryptAndSave(JSON.stringify(state)), 200);
}

let _pinSaveTimer = null;

function showPinDialog(mode, onSuccess, onCancel) {
  let overlay = document.getElementById("pinOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "pinOverlay";
    overlay.className = "pin-overlay";
    overlay.innerHTML = `
      <div class="pin-card">
        <p class="eyebrow">AppHorario</p>
        <h2 id="pinTitle">Introduce tu PIN</h2>
        <p class="muted" id="pinSubtitle">Para desbloquear tus datos cifrados</p>
        <input class="pin-input" id="pinInput" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="current-password">
        <p class="pin-error" id="pinError" hidden></p>
        <button class="primary-button" type="button" id="pinConfirm">Confirmar</button>
        ${onCancel ? '<button class="text-button" type="button" id="pinCancel">Cancelar</button>' : ''}
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const titleEl = document.getElementById("pinTitle");
  const subtitleEl = document.getElementById("pinSubtitle");
  const input = document.getElementById("pinInput");
  const confirmBtn = document.getElementById("pinConfirm");
  const cancelBtn = document.getElementById("pinCancel");
  const errorEl = document.getElementById("pinError");

  if (mode === "setup") {
    titleEl.textContent = "Crear PIN de cifrado";
    subtitleEl.textContent = "4 dígitos. Si lo olvidas, perderás tus datos.";
  } else if (mode === "disable") {
    titleEl.textContent = "Desactivar cifrado";
    subtitleEl.textContent = "Introduce tu PIN actual para confirmar.";
  } else {
    titleEl.textContent = "Introduce tu PIN";
    subtitleEl.textContent = "Tus datos están cifrados.";
  }

  overlay.hidden = false;
  input.value = "";
  errorEl.hidden = true;
  setTimeout(() => input.focus(), 60);

  function handleConfirm() {
    const pin = input.value.trim();
    if (!/^\d{4}$/.test(pin)) {
      errorEl.textContent = "El PIN debe ser exactamente 4 dígitos.";
      errorEl.hidden = false;
      return;
    }
    overlay.hidden = true;
    onSuccess(pin);
  }

  confirmBtn.onclick = handleConfirm;
  input.onkeydown = (e) => { if (e.key === "Enter") handleConfirm(); };
  if (cancelBtn) cancelBtn.onclick = () => { overlay.hidden = true; if (onCancel) onCancel(); };
}

function bindPinSettings() {
  const enableBtn = document.getElementById("enablePinButton");
  const disableBtn = document.getElementById("disablePinButton");

  function updatePinButtons() {
    const enabled = isPinEnabled();
    if (enableBtn) enableBtn.hidden = enabled;
    if (disableBtn) disableBtn.hidden = !enabled;
  }

  if (enableBtn) {
    enableBtn.addEventListener("click", () => {
      showPinDialog("setup", async (pin) => {
        await enablePinEncryption(pin);
        updatePinButtons();
      }, () => {});
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener("click", () => {
      showPinDialog("disable", async (pin) => {
        await disablePinEncryption(pin);
        updatePinButtons();
      }, () => {});
    });
  }

  updatePinButtons();
}

async function checkEncryptedStartup() {
  const meta = getEncMeta();
  if (!meta.enabled || !meta.salt) return;

  const blob = localStorage.getItem(STORAGE_ENC_KEY);
  if (!blob) return;

  return new Promise((resolve) => {
    showPinDialog("unlock", async (pin) => {
      const decrypted = await tryLoadEncryptedState(pin);
      if (decrypted) {
        Object.assign(state, decrypted);
        saveState();
        render();
        resolve();
      } else {
        const overlay = document.getElementById("pinOverlay");
        const errorEl = document.getElementById("pinError");
        if (overlay) overlay.hidden = false;
        if (errorEl) { errorEl.textContent = "PIN incorrecto. Intenta de nuevo."; errorEl.hidden = false; }
        resolve();
      }
    });
  });
}
