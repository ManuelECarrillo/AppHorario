package app.horario.estudio;

import android.annotation.SuppressLint;
import android.net.http.SslError;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
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
                call.reject(error.getMessage(), error.getClass().getSimpleName(), error);
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
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
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

    private HttpURLConnection openConnection(String url) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();

        if (connection instanceof HttpsURLConnection) {
            HttpsURLConnection httpsConnection = (HttpsURLConnection) connection;
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllManagers(), new SecureRandom());
            httpsConnection.setSSLSocketFactory(sslContext.getSocketFactory());
            httpsConnection.setHostnameVerifier(trustAllHostnames());
        }

        return connection;
    }

    private TrustManager[] trustAllManagers() {
        return new TrustManager[] {
            new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] chain, String authType) {}

                @Override
                public void checkServerTrusted(X509Certificate[] chain, String authType) {}

                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            }
        };
    }

    private HostnameVerifier trustAllHostnames() {
        return new HostnameVerifier() {
            @Override
            public boolean verify(String hostname, SSLSession session) {
                return true;
            }
        };
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

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
            }
        }

        return builder.toString();
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
}
