/* Auth submits directly to the same-origin PHP API and always shows a result. */
(function () {
  'use strict';
  var api = window.ParkFlowAPI, ui = window.ParkFlowUI;
  function notice(message, tone) { if (ui) ui.toast(message, tone); else window.alert(message); }
  function destination(role) { return role === 'admin' ? 'admin.html' : role === 'manager' ? 'manager.html' : 'driver.html'; }
  function withButton(button, label, action) { button.disabled = true; var original = button.innerHTML; button.textContent = label; return action().then(function (value) { button.disabled = false; button.innerHTML = original; return value; }, function (error) { button.disabled = false; button.innerHTML = original; throw error; }); }
  function attachLogin() {
    var form = document.getElementById('login-form'); if (!form || !api) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var button = form.querySelector('[type="submit"]');
      withButton(button, 'Signing in…', function () { return api.request('auth/login', { method: 'POST', body: { email: form.elements.email.value.trim(), password: form.elements.password.value } }); })
        .then(function (result) { api.setCsrf(result.csrf); notice('Signed in. Opening your portal…'); window.location.assign(destination(result.user.role)); })
        .catch(function (error) { notice(error.message || 'Unable to sign in. Please try again.', 'warning'); });
    }, true);
  }
  function attachRegistration() {
    var form = document.getElementById('registration-form'); if (!form || !api) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var button = form.querySelector('[type="submit"]');
      withButton(button, 'Creating account…', function () { return api.request('auth/register', { method: 'POST', body: { first_name: form.elements.first_name.value, last_name: form.elements.last_name.value, email: form.elements.email.value, phone: '+880' + form.elements.phone.value.replace(/^\+?880/, ''), password: form.elements.password.value, vehicle: form.elements.vehicle.value, year: form.elements.year.value, plate: form.elements.plate.value, type: form.elements.type.value, updates: form.querySelectorAll('input[type="checkbox"]')[1].checked } }); })
        .then(function (result) { api.setCsrf(result.csrf); notice('Account created. Opening your driver portal…'); window.location.assign('driver.html'); })
        .catch(function (error) { notice(error.message || 'Unable to create the account.', 'warning'); });
    }, true);
  }
  attachLogin(); attachRegistration();
})();
