(function () {
  function getEnvValue(key) {
    return window.APPHORARIO_ENV && window.APPHORARIO_ENV[key]
      ? String(window.APPHORARIO_ENV[key]).trim()
      : "";
  }

  function getApiUrl(kind = "default") {
    const accessUrl = getEnvValue("API_URL_ACCESO");
    const scheduleUrl = getEnvValue("API_URL_HORARIO");
    const defaultUrl = getEnvValue("API_URL");

    if (kind === "access") return accessUrl || defaultUrl || scheduleUrl;
    if (kind === "schedule") return scheduleUrl || defaultUrl || accessUrl;

    return defaultUrl || accessUrl || scheduleUrl;
  }

  function getCapacitorHttpPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.CapacitorHttp;
    }

    return window.CapacitorHttp || window.CapacitorHttpPlugin || null;
  }

  function getAppHorarioHttpPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.AppHorarioHttp;
    }

    return null;
  }

  function isNativeHttpAvailable() {
    const capacitorHttp = getCapacitorHttpPlugin();
    return Boolean(capacitorHttp && typeof capacitorHttp.request === "function");
  }

  async function postForm(url, data, options = {}) {
    if (!url) {
      throw Object.assign(new Error("Missing request URL."), { code: "missing_url" });
    }

    const body = new URLSearchParams(data).toString();
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": options.accept || "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    };
    const requestOptions = {
      url,
      method: "POST",
      headers,
      data: body,
      responseType: "text",
      connectTimeout: options.connectTimeout || 20000,
      readTimeout: options.readTimeout || 30000
    };

    const appHorarioHttp = getAppHorarioHttpPlugin();
    if (appHorarioHttp && typeof appHorarioHttp.postForm === "function") {
      return appHorarioHttp.postForm({
        url,
        body,
        headers,
        connectTimeout: requestOptions.connectTimeout,
        readTimeout: requestOptions.readTimeout
      });
    }

    const capacitorHttp = getCapacitorHttpPlugin();
    if (capacitorHttp && typeof capacitorHttp.request === "function") {
      return capacitorHttp.request(requestOptions);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body
    });

    const responseData = await response.text();

    return {
      status: response.status,
      url: response.url,
      data: responseData,
      headers: {}
    };
  }

  window.AppHorarioHttp = {
    getApiUrl,
    getEnvValue,
    isNativeHttpAvailable,
    postForm
  };
})();
