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

## Instalar en Android

Con el teléfono conectado por USB y depuración USB activada:

```bash
android-sdk\platform-tools\adb.exe install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Para compartir con amigos, puedes enviar el APK generado. En Android deberán permitir la instalación de apps desde archivos externos.
