# Generar la app Android física

La app Android ya está creada en la carpeta `android`.

## 1. Aceptar licencias e instalar SDK

Ejecuta en PowerShell desde la carpeta del proyecto:

```powershell
$sdk=(Resolve-Path android-sdk).Path
$sdkmanager=(Resolve-Path android-sdk\cmdline-tools\cmdline-tools\bin\sdkmanager.bat).Path
& $sdkmanager --sdk_root=$sdk --licenses
```

Escribe `y` cuando pregunte.

Después instala los paquetes:

```powershell
& $sdkmanager --sdk_root=$sdk "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

## 2. Crear APK

```powershell
npm.cmd run build:android
```

El APK queda en:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## 3. Instalar en teléfono por cable USB

Activa depuración USB en Android y ejecuta:

```powershell
android-sdk\platform-tools\adb.exe install -r android\app\build\outputs\apk\debug\app-debug.apk
```
