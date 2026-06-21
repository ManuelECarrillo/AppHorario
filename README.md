# AppHorario

AppHorario es una app móvil para organizar clases, tareas, notas, audios de clase, exámenes y recordatorios de estudio.

## Funciones

- Horario diario y semanal de clases.
- Estado de clase actual con indicador "En clase".
- Notificaciones de clases, tareas y recordatorios de estudio.
- Recordatorios configurables antes de clase y antes de terminar una clase.
- Tareas por clase con prioridad, repetición y completado.
- Historial de notas por fecha.
- Grabación, reproducción y descarga de audios de clase.
- Exámenes con recordatorios automáticos para estudiar.
- Tema claro/oscuro y personalización de colores.
- App Android generada con Capacitor.

## Desarrollo

Instala dependencias:

```bash
npm install
```

Sincroniza Android:

```bash
npm run sync:android
```

Compila el APK debug:

```bash
npm run build:android
```

El APK generado queda en:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

La copia lista para compartir se guarda como:

```text
AppHorario-Actualizacion.apk
```

## Mapa del proyecto

- `pwa/index.html`: estructura principal de la app.
- `pwa/styles.css`: diseño visual, modo oscuro, modales y layout móvil.
- `pwa/app.js`: archivo guía que explica que la lógica vive en `pwa/js/`.
- `pwa/js/`: lógica principal separada por dominio.
- `pwa/lib/http.js`: puente HTTP usado por la app web y por Capacitor.
- `pwa/assets/`: iconos usados por la PWA y la pantalla de carga.
- `android/app/src/main/java/app/horario/estudio/`: plugins nativos de Android para HTTP y respaldos.
- `android/app/src/main/res/`: iconos, splash screen, sonidos de notificación y configuración Android.
- `scripts/generate-env.js`: genera `pwa/env.js` desde variables locales.

## Guía rápida para leer `pwa/js/`

Los archivos están numerados para cargarse en orden y para que sea fácil encontrar cada parte:

- `01-core.js`: constantes, estado, referencias del DOM y arranque.
- `02-events.js`: pestañas, modales, formularios y navegación nativa.
- `03-sii-schedule.js`: conexión al SII e importación de horario.
- `04-grades.js`: lectura y render de calificaciones parciales.
- `05-sii-text-utils.js`: limpieza de texto, nombres, horarios y datos del SII.
- `06-settings-location.js`: ajustes, mapa y tiempos de llegada.
- `07-platform-notifications.js`: permisos, canales nativos, service worker e instalación.
- `08-render.js`: render de vistas, tarjetas y paneles principales.
- `09-actions-notes.js`: acciones de clases, tareas, exámenes y notas.
- `10-media.js`: audio de clase y fotos del pizarrón.
- `11-notification-runtime.js`: detección de clase actual y envío de recordatorios.
- `12-storage-helpers.js`: respaldos, IndexedDB, fechas, formato y utilidades.

## Instalar en Android

Con el teléfono conectado por USB y depuración USB activada:

```bash
android-sdk\platform-tools\adb.exe install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Para compartir con amigos, puedes enviar el APK generado. En Android deberán permitir la instalación de apps desde archivos externos.
