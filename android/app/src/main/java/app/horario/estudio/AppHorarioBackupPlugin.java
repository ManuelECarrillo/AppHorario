package app.horario.estudio;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "AppHorarioBackup")
public class AppHorarioBackupPlugin extends Plugin {

    @PluginMethod
    public void saveBackup(PluginCall call) {
        String filename = sanitizeFilename(call.getString("filename", "apphorario-respaldo.json"));
        String content = call.getString("content", "");

        try {
            String location = saveToDownloads(filename, content);
            JSObject result = new JSObject();
            result.put("location", location);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("No se pudo guardar el respaldo.", exception);
        }
    }

    private String saveToDownloads(String filename, String content) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Downloads insert returned null.");

            try (OutputStream output = resolver.openOutputStream(uri)) {
                if (output == null) throw new IllegalStateException("Downloads stream returned null.");
                output.write(content.getBytes(StandardCharsets.UTF_8));
            }

            return "Descargas/" + filename;
        }

        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloads.exists() && !downloads.mkdirs()) {
            throw new IllegalStateException("Downloads directory is not available.");
        }

        File file = new File(downloads, filename);
        try (OutputStream output = new FileOutputStream(file)) {
            output.write(content.getBytes(StandardCharsets.UTF_8));
        }
        return file.getAbsolutePath();
    }

    private String sanitizeFilename(String filename) {
        String safeName = filename == null ? "" : filename.replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        return safeName.isEmpty() ? "apphorario-respaldo.json" : safeName;
    }
}
