/* Small fetch client shared by the ParkFlow pages. */
(function () {
  "use strict";
  var csrf = window.sessionStorage.getItem("parkflow-csrf") || "";

  function saveToken(token) {
    csrf = token || "";
    if (csrf) window.sessionStorage.setItem("parkflow-csrf", csrf);
    else window.sessionStorage.removeItem("parkflow-csrf");
  }

  async function request(route, options) {
    options = options || {};
    var headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {},
    );
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    if (csrf) headers["X-CSRF-Token"] = csrf;
    var parts = String(route).split("?");
    var url = "api/index.php?route=" + encodeURIComponent(parts.shift());
    if (parts.length) url += "&" + parts.join("?");
    var response = await fetch(url, {
      method: options.method || "GET",
      headers: headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
    });
    var payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }
    if (payload.csrf) saveToken(payload.csrf);
    if (!response.ok || !payload.ok) {
      var problem = new Error(payload.message || "Request failed.");
      problem.status = response.status;
      throw problem;
    }
    return payload;
  }

  window.ParkFlowAPI = {
    request: request,
    me: function () {
      return request("auth/me");
    },
    setCsrf: saveToken,
    logout: function () {
      return request("auth/logout", { method: "POST", body: {} }).finally(
        function () {
          saveToken("");
        },
      );
    },
  };
})();
