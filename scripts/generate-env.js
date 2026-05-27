const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "pwa", "env.js");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath);
  const content = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString("utf16le")
    : raw.toString("utf8");

  return content
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.replace(/^\uFEFF/, "").trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) return values;

      const key = trimmed.slice(0, separatorIndex).replace(/^\uFEFF/, "").trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      values[key] = value;
      return values;
    }, {});
}

const env = readEnvFile(envPath);
const existingPublicEnv = readExistingPublicEnv(outputPath);

function readExistingPublicEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/window\.APPHORARIO_ENV\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) return {};

  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function pickEnvValue(values, keys) {
  const entries = Object.entries(values);

  for (const key of keys) {
    if (values[key]) return values[key];

    const normalizedKey = normalizeEnvKey(key);
    const match = entries.find(([entryKey, entryValue]) => (
      normalizeEnvKey(entryKey) === normalizedKey && entryValue
    ));

    if (match) return match[1];
  }

  return "";
}

function pickPublicEnvValue(keys) {
  return pickEnvValue(env, keys) || pickEnvValue(existingPublicEnv, keys);
}

function normalizeEnvKey(key) {
  return String(key || "").replace(/^\uFEFF/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

const publicEnv = {
  API_URL: pickPublicEnvValue([
    "API_URL",
    "api_url",
    "ApiUrl",
    "apiUrl",
    "SII_API_URL",
    "SII_URL",
    "HORARIO_API_URL",
    "SCHEDULE_API_URL"
  ]),
  API_URL_ACCESO: pickPublicEnvValue([
    "API_URL_ACCESO",
    "ACCESO_API_URL",
    "SII_API_URL_ACCESO",
    "SII_ACCESO_URL",
    "ACCESS_API_URL"
  ]),
  API_URL_HORARIO: pickPublicEnvValue([
    "API_URL_HORARIO",
    "HORARIO_API_URL",
    "SII_API_URL_HORARIO",
    "SII_HORARIO_URL",
    "SCHEDULE_API_URL"
  ]),
  API_URL_CALIFICACIONES: pickPublicEnvValue([
    "API_URL_CALIFICACIONES",
    "CALIFICACIONES_API_URL",
    "SII_API_URL_CALIFICACIONES",
    "SII_CALIFICACIONES_URL",
    "GRADES_API_URL",
    "API_URL_GRADES"
  ])
};

const content = `window.APPHORARIO_ENV = ${JSON.stringify(publicEnv, null, 2)};\n`;
fs.writeFileSync(outputPath, content, "utf8");

console.log("Generated pwa/env.js");
