const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "pwa", "env.js");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) return values;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      values[key] = value;
      return values;
    }, {});
}

const env = readEnvFile(envPath);
const publicEnv = {
  API_URL: env.API_URL || ""
};

const content = `window.APPHORARIO_ENV = ${JSON.stringify(publicEnv, null, 2)};\n`;
fs.writeFileSync(outputPath, content, "utf8");

console.log("Generated pwa/env.js");
