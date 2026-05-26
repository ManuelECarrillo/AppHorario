(function () {
  function getApiUrl() {
    return window.APPHORARIO_ENV && window.APPHORARIO_ENV.API_URL
      ? window.APPHORARIO_ENV.API_URL
      : "";
  }

  function getCapacitorHttpPlugin() {
    if (window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.CapacitorHttp;
    }

    return window.CapacitorHttp || null;
  }

  async function postForm(url, data, options = {}) {
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
      connectTimeout: options.connectTimeout || 15000,
      readTimeout: options.readTimeout || 20000
    };

    const capacitorHttp = getCapacitorHttpPlugin();
    if (capacitorHttp && typeof capacitorHttp.request === "function") {
      return capacitorHttp.request(requestOptions);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body
    });

    return {
      status: response.status,
      url: response.url,
      data: await response.text(),
      headers: {}
    };
  }

  window.AppHorarioHttp = {
    getApiUrl,
    postForm
  };
})();
