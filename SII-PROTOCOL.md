# SII Integration Protocol — AppHorario

> Tecnológico de Durango — Sistema Integral de Información (SII)
> Base URL: `https://siit.itdurango.edu.mx/sistema/`
> Last reviewed: 2026-06-17

---

## Overview

AppHorario integrates with the Tec Durango student portal (SII) to auto-import
class schedules and query partial grades. All communication happens from the
Android native HTTP plugin (`AppHorarioHttpPlugin.java`), never from a browser
context, so there are no CORS restrictions.

Authentication uses a form POST with the student's control number and a 4-digit
PIN. **Credentials are never stored** — the user enters them each time they
connect, and the app discards them after the request completes.

---

## Endpoints

All three URLs are injected at build time via `pwa/env.js`. The Java plugin
reads them through `AppHorarioHttp.getApiUrl(kind)`.

| Kind key           | `env.js` var              | URL path                                                   |
|--------------------|---------------------------|------------------------------------------------------------|
| `"access"`         | `API_URL_ACCESO`          | `/sistema/acceso.php`                                      |
| `"schedule"`       | `API_URL_HORARIO`         | `/sistema/modulos/cons/alumnos/horario_alumno.php`         |
| `"grades"`         | `API_URL_CALIFICACIONES`  | `/sistema/modulos/alu//cons/calif_parciales_adeudo.php`    |

> The double slash `alu//cons` in the grades URL is intentional — it is how the
> real portal constructs that path. Do NOT normalize it.

---

## Authentication Flow

### 1. Login check (`loginSii`)

```
POST /sistema/acceso.php
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

tipo=a&usuario=<control>&contrasena=<pin>
```

Expected: any HTTP 2xx with a non-empty body signals the session was accepted.
The app does not parse this response further; it only confirms the server is
reachable and accepting the PIN.

### 2. Schedule import (`postSiiSchedule`)

```
POST /sistema/modulos/cons/alumnos/horario_alumno.php
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

tipo=a&usuario=<control>&contrasena=<pin>
```

The schedule endpoint may return **JSON** or an **HTML table** depending on the
portal version. The parser (`parseSiiSchedule`) tries JSON first and falls back
to HTML table extraction.

### 3. Grades query (`postSiiGrades`)

The grades endpoint is tried with multiple `tipo` variants because different
portal versions require different form field values. The variants are defined in
`getSiiGradeRequestVariants()` in `03-sii-schedule.js`:

```
tipo=a    (primary)
tipo=b    (fallback)
tipo=c    (fallback)
```

If every variant returns an empty grades list and the response contains a
redirect or login-wall pattern, the app falls back to a **WebView session**
(`postSiiGradesWithWebViewSession`): a hidden WebView performs the full login
form submission and then navigates to the grades page.

---

## Response Formats

The SII portal can return data in three shapes. The parsers in `03-sii-schedule.js`
and `04-grades.js` handle all three.

### JSON (modern portal)

```json
{
  "horario": [
    {
      "materia": "CALCULO DIFERENCIAL",
      "dia":     "LUNES",
      "horaI":   "07:00",
      "horaF":   "09:00",
      "salon":   "A-101"
    }
  ]
}
```

Schedule field aliases the parser accepts: `materia`, `asignatura`, `nombre`,
`clase` (for subject); `dia`, `day` (for weekday); `horaI`/`hora_inicio`,
`horaF`/`hora_fin`; `salon`, `aula`, `lugar`.

### HTML table (legacy portal)

An HTML document or fragment containing a `<table>` with a `<thead>` and
`<tbody>`. The parser reads column headers from `<th>` cells and maps them
to subject, day, start/end times, and classroom.

### Redirect / login wall

If the response body is less than 200 characters but contains no parseable
data, the app treats it as "empty response, possible redirect". If the response
is over 200 characters but yields zero parsed records, the app treats it as
"data received but unreadable — portal structure may have changed."

---

## Error Codes

| Code                       | Meaning                                                   |
|----------------------------|-----------------------------------------------------------|
| `missing_api_url`          | `API_URL_ACCESO` not set in `env.js`                      |
| `missing_schedule_url`     | `API_URL_HORARIO` not set in `env.js`                     |
| `missing_grades_url`       | `API_URL_CALIFICACIONES` not set in `env.js`              |
| `missing_http_client`      | Java plugin not loaded (`AppHorarioHttp` missing)         |
| `missing_webview_http_client` | Java WebView method not available                      |
| `http_status`              | Server returned a non-2xx HTTP status                     |
| `ssl_error`                | SSL handshake failed (wrong cert / MITM)                  |
| `timeout`                  | Network request timed out (default: 30 s, WebView: 50 s) |

---

## Certificate Security

TLS is enforced for the SII domain at the OS level via
`android/app/src/main/res/xml/network_security_config.xml`. The file:

- **Disables cleartext** (`cleartextTrafficPermitted="false"`) globally.
- Trusts only the bundled **Sectigo Public Server Authentication Root R46**
  certificate (stored at `android/app/src/main/res/raw/sectigo_root_r46.pem`)
  for `siit.itdurango.edu.mx`. This means a rogue CA installed on the device
  cannot intercept SII traffic.

To add true leaf-certificate pinning if the SII rotates its TLS cert, run:

```bash
openssl s_client -connect siit.itdurango.edu.mx:443 -showcerts 2>/dev/null \
  | openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary | base64
```

Then add to the `<domain-config>` block:

```xml
<pin-set expiration="2027-01-01">
  <pin digest="SHA-256">BASE64_HASH_HERE=</pin>
</pin-set>
```

---

## Updating the Parser

If the SII portal changes its response structure (most common cause of silent
import failures), follow these steps:

1. Enable the **SII diagnostic log** in Settings → "Exportar log de diagnóstico
   SII". This downloads a JSON file with the raw request/response of the last
   50 SII events.
2. Inspect the `data` field of the failed event to see what the portal now
   returns.
3. Update the relevant parser:
   - Schedule: `parseSiiSchedule()` in `pwa/js/03-sii-schedule.js`
   - Grades: `parseSiiGrades()` in `pwa/js/04-grades.js`
4. Add or update field name aliases in the `SCHEDULE_FIELD_MAP` / `GRADES_FIELD_MAP`
   objects at the top of those files.
5. Run the date/logic unit tests (`pwa/js/tests.js`) in the browser console to
   verify nothing else broke.

---

## WebView Fallback

Some portal versions require a full browser session (cookies, JavaScript
redirects) to retrieve grades. The Java plugin (`AppHorarioHttpPlugin.java`)
implements two WebView helpers:

- `postFormWithWebView(url, payload, opts)` — submits a form in a hidden
  WebView, waits `settleDelay` ms for JavaScript to run, then returns the
  final page source.
- `postFormThenLoadWithWebView(loginUrl, gradesUrl, payload, opts)` — submits
  the login form in the hidden WebView, then navigates to `gradesUrl` and
  returns that page's source.

The WebView has JavaScript disabled for `window.open`, mixed content blocked,
and SSL errors cancelled (not silently accepted) — configured in
`configureHiddenWebView()`.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `pwa/env.js` | Build-time endpoint URLs |
| `pwa/js/03-sii-schedule.js` | Login flow, schedule import, parser |
| `pwa/js/04-grades.js` | Grades query and parser |
| `pwa/js/05-sii-text-utils.js` | Shared text normalisation helpers |
| `pwa/lib/http.js` | JS-side HTTP bridge to Java plugin |
| `android/.../AppHorarioHttpPlugin.java` | Native HTTP + WebView implementation |
| `android/.../network_security_config.xml` | TLS policy for SII domain |
| `android/.../res/raw/sectigo_root_r46.pem` | Bundled CA certificate |
