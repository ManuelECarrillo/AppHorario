package app.horario.estudio;

import android.annotation.SuppressLint;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;

@CapacitorPlugin(name = "AppHorarioHttp")
public class AppHorarioHttpPlugin extends Plugin {

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PluginMethod
    public void postForm(final PluginCall call) {
        executor.execute(() -> {
            HttpURLConnection connection = null;

            try {
                String url = call.getString("url", "");
                String body = call.getString("body", "");
                Integer connectTimeout = call.getInt("connectTimeout", 20000);
                Integer readTimeout = call.getInt("readTimeout", 30000);
                JSObject headers = call.getObject("headers", new JSObject());

                if (url == null || url.trim().isEmpty()) {
                    call.reject("Missing request URL", "MissingUrl");
                    return;
                }

                connection = openConnection(url.trim());
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(connectTimeout == null ? 20000 : connectTimeout);
                connection.setReadTimeout(readTimeout == null ? 30000 : readTimeout);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                connection.setRequestProperty("Accept", "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                applyHeaders(connection, headers);

                byte[] payload = body.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);

                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int status = connection.getResponseCode();
                String data = readResponse(connection, status);

                JSObject response = new JSObject();
                response.put("status", status);
                response.put("url", url);
                response.put("data", data);
                response.put("headers", readHeaders(connection));
                call.resolve(response);
            } catch (Exception error) {
                String msg = error.getMessage();
                if (msg == null) msg = error.getClass().getName();
                android.util.Log.e("AppHorarioHttp", "postForm error [" + error.getClass().getSimpleName() + "]: " + msg, error);
                call.reject(msg, error.getClass().getSimpleName(), error);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void postFormWithWebView(final PluginCall call) {
        String url = call.getString("url", "");
        String body = call.getString("body", "");
        Integer readTimeout = call.getInt("readTimeout", 45000);
        Integer settleDelay = call.getInt("settleDelay", 2500);

        if (url == null || url.trim().isEmpty()) {
            call.reject("Missing request URL", "MissingUrl");
            return;
        }

        if (getActivity() == null) {
            call.reject("Missing Android activity", "MissingActivity");
            return;
        }

        final String requestUrl = url.trim();
        final String requestBody = body == null ? "" : body;
        final int timeoutMs = readTimeout == null ? 45000 : readTimeout;
        final int delayMs = settleDelay == null ? 2500 : settleDelay;

        getActivity().runOnUiThread(() -> {
            final WebView webView = new WebView(getActivity());
            final Handler handler = new Handler(Looper.getMainLooper());
            final boolean[] completed = { false };

            Runnable cleanup = () -> {
                try {
                    ViewGroup parent = (ViewGroup) webView.getParent();
                    if (parent != null) {
                        parent.removeView(webView);
                    }
                    webView.stopLoading();
                    webView.loadUrl("about:blank");
                    webView.destroy();
                } catch (Exception ignored) {
                }
            };

            Runnable timeout = () -> {
                if (completed[0]) return;
                completed[0] = true;
                cleanup.run();
                call.reject("The WebView request took too long.", "WebViewTimeout");
            };

            handler.postDelayed(timeout, Math.max(timeoutMs, 10000));

            webView.setAlpha(0f);
            webView.setVisibility(View.VISIBLE);
            getActivity().addContentView(webView, new ViewGroup.LayoutParams(1, 1));

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                cookieManager.setAcceptThirdPartyCookies(webView, true);
            }

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(false);
            settings.setBlockNetworkImage(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    handler.proceed();
                }

                @Override
                public void onPageFinished(WebView view, String finishedUrl) {
                    handler.postDelayed(() -> {
                        if (completed[0]) return;

                        view.evaluateJavascript(
                            "(function(){return document.documentElement ? document.documentElement.outerHTML : document.body.innerHTML;})()",
                            value -> {
                                if (completed[0]) return;
                                completed[0] = true;
                                handler.removeCallbacks(timeout);

                                JSObject response = new JSObject();
                                response.put("status", 200);
                                response.put("url", view.getUrl() == null ? requestUrl : view.getUrl());
                                response.put("data", decodeJavaScriptString(value));
                                response.put("headers", new JSObject());

                                cleanup.run();
                                call.resolve(response);
                            }
                        );
                    }, Math.max(delayMs, 500));
                }
            });

            webView.postUrl(requestUrl, requestBody.getBytes(StandardCharsets.UTF_8));
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void postFormThenLoadWithWebView(final PluginCall call) {
        String loginUrl = call.getString("loginUrl", "");
        String targetUrl = call.getString("targetUrl", "");
        String body = call.getString("body", "");
        Integer readTimeout = call.getInt("readTimeout", 60000);
        Integer loginDelay = call.getInt("loginDelay", 3500);
        Integer settleDelay = call.getInt("settleDelay", 4500);

        if (loginUrl == null || loginUrl.trim().isEmpty() || targetUrl == null || targetUrl.trim().isEmpty()) {
            call.reject("Missing request URL", "MissingUrl");
            return;
        }

        if (getActivity() == null) {
            call.reject("Missing Android activity", "MissingActivity");
            return;
        }

        final String requestLoginUrl = loginUrl.trim();
        final String requestTargetUrl = targetUrl.trim();
        final String requestBody = body == null ? "" : body;
        final Map<String, String> formData = parseFormBody(requestBody);
        final int timeoutMs = readTimeout == null ? 60000 : readTimeout;
        final int loginDelayMs = loginDelay == null ? 3500 : loginDelay;
        final int settleDelayMs = settleDelay == null ? 4500 : settleDelay;

        getActivity().runOnUiThread(() -> {
            final WebView webView = new WebView(getActivity());
            final Handler handler = new Handler(Looper.getMainLooper());
            final boolean[] completed = { false };
            final int[] phase = { 0 };

            Runnable cleanup = () -> {
                try {
                    ViewGroup parent = (ViewGroup) webView.getParent();
                    if (parent != null) {
                        parent.removeView(webView);
                    }
                    webView.stopLoading();
                    webView.loadUrl("about:blank");
                    webView.destroy();
                } catch (Exception ignored) {
                }
            };

            Runnable timeout = () -> {
                if (completed[0]) return;
                completed[0] = true;
                cleanup.run();
                call.reject("The WebView request took too long.", "WebViewTimeout");
            };

            handler.postDelayed(timeout, Math.max(timeoutMs, 15000));
            configureHiddenWebView(webView);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (request == null || request.getUrl() == null) return false;
                    return shouldBlockSiiFallbackRedirect(phase[0], request.getUrl().toString(), requestTargetUrl);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    return shouldBlockSiiFallbackRedirect(phase[0], url, requestTargetUrl);
                }

                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    handler.proceed();
                }

                @Override
                public void onPageFinished(WebView view, String finishedUrl) {
                    if (completed[0]) return;

                    if (phase[0] == 0) {
                        phase[0] = 1;
                        submitSiiLoginForm(view, formData);
                        return;
                    }

                    if (phase[0] == 1) {
                        phase[0] = 2;
                        handler.postDelayed(() -> {
                            if (completed[0]) return;

                            Map<String, String> headers = new HashMap<>();
                            headers.put("Referer", view.getUrl() == null ? requestLoginUrl : view.getUrl());
                            view.loadUrl(requestTargetUrl, headers);
                        }, Math.max(loginDelayMs, 500));
                        return;
                    }

                    handler.postDelayed(() -> {
                        if (completed[0]) return;

                        view.evaluateJavascript(
                            "(function(){return document.documentElement ? document.documentElement.outerHTML : document.body.innerHTML;})()",
                            value -> {
                                if (completed[0]) return;
                                completed[0] = true;
                                handler.removeCallbacks(timeout);

                                JSObject response = new JSObject();
                                response.put("status", 200);
                                response.put("url", view.getUrl() == null ? requestTargetUrl : view.getUrl());
                                response.put("data", decodeJavaScriptString(value));
                                response.put("headers", new JSObject());

                                cleanup.run();
                                call.resolve(response);
                            }
                        );
                    }, Math.max(settleDelayMs, 500));
                }
            });

            webView.loadUrl(requestLoginUrl);
        });
    }

    private void configureHiddenWebView(WebView webView) {
        webView.setAlpha(0f);
        webView.setVisibility(View.VISIBLE);
        getActivity().addContentView(webView, new ViewGroup.LayoutParams(1, 1));

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(false);
        settings.setBlockNetworkImage(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
    }

    private void submitSiiLoginForm(WebView webView, Map<String, String> formData) {
        // Build a generic form-fill script: works for SII (usuario/contrasena/tipo)
        // and for Moodle (username/password) by iterating formData keys directly.
        StringBuilder sb = new StringBuilder();
        sb.append("(function(){");
        sb.append("var form=document.querySelector('form#login')")
          .append("||document.forms['acceso']")
          .append("||document.querySelector('form[name=\"acceso\"]')")
          .append("||document.querySelector('form');");
        sb.append("if(!form){return 'missing-form';}");

        // SII-specific: call mostrar() to reveal the student login panel
        if (formData.containsKey("tipo")) {
            sb.append("if(window.mostrar){try{window.mostrar(")
              .append(jsString(formData.get("tipo")))
              .append(");}catch(e){}}");
        }

        // Fill each field by name using JSON.stringify for safe CSS selector building
        for (Map.Entry<String, String> entry : formData.entrySet()) {
            sb.append("(function(k,v){")
              .append("var el=form.elements[k]")
              .append("||document.querySelector('[name='+JSON.stringify(k)+']');")
              .append("if(el){el.value=v;}})(")
              .append(jsString(entry.getKey())).append(",")
              .append(jsString(entry.getValue())).append(");");
        }

        // Click the submit button (triggers Moodle/YUI3 JS handlers) rather than
        // calling form.submit() directly which bypasses those handlers.
        sb.append("var btn=document.getElementById('loginbtn')")
          .append("||form.querySelector('button[type=\"submit\"]')")
          .append("||form.querySelector('input[type=\"submit\"]');")
          .append("if(btn){btn.click();}else{form.submit();}")
          .append("return 'submitted';})()");
        webView.evaluateJavascript(sb.toString(), ignored -> {});
    }

    private boolean shouldBlockSiiFallbackRedirect(int phase, String nextUrl, String targetUrl) {
        if (phase < 2 || nextUrl == null || targetUrl == null) return false;

        try {
            URL next = new URL(nextUrl);
            URL target = new URL(targetUrl);
            String path = next.getPath() == null ? "" : next.getPath().replaceAll("/+$", "");

            return next.getHost().equalsIgnoreCase(target.getHost()) && "/sistema".equals(path);
        } catch (Exception ignored) {
            return false;
        }
    }

    private Map<String, String> parseFormBody(String body) {
        Map<String, String> data = new HashMap<>();
        if (body == null || body.trim().isEmpty()) return data;

        String[] pairs = body.split("&");
        for (String pair : pairs) {
            String[] parts = pair.split("=", 2);
            String key = decodeFormValue(parts.length > 0 ? parts[0] : "");
            String value = decodeFormValue(parts.length > 1 ? parts[1] : "");
            if (!key.isEmpty()) {
                data.put(key, value);
            }
        }

        return data;
    }

    private String decodeFormValue(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8.name());
        } catch (Exception ignored) {
            return "";
        }
    }

    private String jsString(String value) {
        if (value == null) return "''";
        return "'" + value
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r") + "'";
    }

    private HttpURLConnection openConnection(String url) throws Exception {
        return (HttpURLConnection) new URL(url).openConnection();
    }

    private void applyHeaders(HttpURLConnection connection, JSObject headers) {
        if (headers == null) return;

        Iterator<String> keys = headers.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            String value = headers.getString(key, "");
            if (key != null && !key.trim().isEmpty() && value != null) {
                connection.setRequestProperty(key, value);
            }
        }
    }

    private String readResponse(HttpURLConnection connection, int status) throws Exception {
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) return "";

        byte[] bytes = readAllBytes(stream);
        Charset charset = getResponseCharset(connection.getContentType());
        String text = new String(bytes, charset);

        if (StandardCharsets.UTF_8.equals(charset) && hasBrokenEncoding(text)) {
            String latinText = new String(bytes, StandardCharsets.ISO_8859_1);
            if (countBrokenCharacters(latinText) < countBrokenCharacters(text)) {
                text = latinText;
            }
        }

        return text;
    }

    private byte[] readAllBytes(InputStream stream) throws Exception {
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private Charset getResponseCharset(String contentType) {
        if (contentType == null) return StandardCharsets.UTF_8;

        String[] parts = contentType.split(";");
        for (String part : parts) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length != 2 || !"charset".equalsIgnoreCase(pair[0].trim())) continue;

            try {
                return Charset.forName(pair[1].trim().replace("\"", ""));
            } catch (Exception ignored) {
                return StandardCharsets.UTF_8;
            }
        }

        return StandardCharsets.UTF_8;
    }

    private boolean hasBrokenEncoding(String value) {
        return value != null && value.indexOf('\uFFFD') >= 0;
    }

    private int countBrokenCharacters(String value) {
        if (value == null || value.isEmpty()) return 0;

        int count = 0;
        for (int index = 0; index < value.length(); index++) {
            if (value.charAt(index) == '\uFFFD') count++;
        }

        return count;
    }

    private JSObject readHeaders(HttpURLConnection connection) {
        JSObject headers = new JSObject();

        for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
            String key = entry.getKey();
            if (key == null || entry.getValue() == null) continue;
            headers.put(key, String.join(",", entry.getValue()));
        }

        return headers;
    }

    private String decodeJavaScriptString(String value) {
        if (value == null || "null".equals(value)) return "";

        try {
            return new JSONArray("[" + value + "]").getString(0);
        } catch (Exception ignored) {
            return value;
        }
    }

    @PluginMethod
    public void saveImageToGallery(final PluginCall call) {
        executor.execute(() -> {
            try {
                String base64 = call.getString("base64", "");
                String filename = call.getString("filename", "horario.png");

                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bitmap == null) { call.reject("Invalid image data"); return; }

                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.Images.Media.RELATIVE_PATH,
                            Environment.DIRECTORY_PICTURES + "/AppHorario");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                }

                Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) { call.reject("Could not create gallery entry"); return; }

                try (OutputStream out = resolver.openOutputStream(uri)) {
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                }

                JSObject result = new JSObject();
                result.put("uri", uri.toString());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("saveImageToGallery failed: " + e.getMessage());
            }
        });
    }
}
