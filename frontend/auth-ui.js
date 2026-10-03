/* Small non-network authentication UI helpers. Authentication itself is handled by backend-auth.js. */
(function () {
  "use strict";

  // Staff access links include ?account=manager or ?account=admin.  Keep these
  // credentials in sync with the local development seed so the selected portal
  // is authenticated as the intended role, rather than the default driver.
  var staffAccounts = {
    manager: {
      email: "manager@parkflow.local",
      password: "Manager2026!",
      label: "PARKING MANAGER PORTAL",
    },
    admin: {
      email: "admin@parkflow.local",
      password: "Admin2026!",
      label: "ADMINISTRATOR PORTAL",
    },
  };
  var loginForm = document.getElementById("login-form");
  var requestedAccount = new URLSearchParams(window.location.search).get(
    "account",
  );
  if (loginForm && staffAccounts[requestedAccount]) {
    var account = staffAccounts[requestedAccount];
    if (loginForm.elements.email)
      loginForm.elements.email.value = account.email;
    if (loginForm.elements.password)
      loginForm.elements.password.value = account.password;
    var portalTag = document.querySelector(".auth-form-header__tag");
    if (portalTag) portalTag.textContent = account.label;
  }
  document
    .querySelectorAll('.input-group__action[aria-label="Show password"]')
    .forEach(function (button) {
      button.addEventListener("click", function () {
        var input = button.closest(".input-group").querySelector("input");
        if (!input) return;
        var visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.setAttribute(
          "aria-label",
          visible ? "Show password" : "Hide password",
        );
      });
    });
  var password = document.getElementById("register-password");
  if (password)
    password.addEventListener("input", function () {
      var hint = password
        .closest(".form-field")
        .querySelector(".password-strength small");
      if (!hint) return;
      var strong =
        password.value.length >= 8 &&
        /\d/.test(password.value) &&
        /[^\w\s]/.test(password.value);
      hint.textContent = strong
        ? "Strong password."
        : "Use 8+ characters with a number and symbol.";
    });
  document.querySelectorAll(".social-login button").forEach(function (button) {
    button.addEventListener("click", function () {
      var message = document.querySelector(".auth-switch");
      if (message)
        message.textContent =
          "Use an email and password to sign in. Social and phone identity providers are not configured for this local installation.";
    });
  });
})();
