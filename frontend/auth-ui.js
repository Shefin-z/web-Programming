/* Frontend-only sign-in and registration routing for the three demo portals. */
(function () {
  'use strict';

  var ui = window.ParkFlowUI;
  if (!ui) return;

  var DEMO_ACCOUNTS = {
    admin: { email: 'admin@parkflow.local', password: 'Admin2026!', page: 'admin.html' },
    manager: { email: 'manager@parkflow.local', password: 'Manager2026!', page: 'manager.html' },
    driver: { email: 'nafis@example.com', password: 'ParkFlow2026', page: 'driver.html' }
  };

  function getAccountType(email) {
    var normalized = (email || '').toLowerCase();
    if (normalized.indexOf('admin') !== -1) return 'admin';
    if (normalized.indexOf('manager') !== -1) return 'manager';
    return 'driver';
  }

  function rememberDemoUser(type) {
    var account = DEMO_ACCOUNTS[type];
    window.localStorage.setItem('parkflow-demo-role', type);
    window.localStorage.setItem('parkflow-demo-email', account.email);
  }

  function initialiseLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;

    var requestedAccount = new URLSearchParams(window.location.search).get('account');
    if (DEMO_ACCOUNTS[requestedAccount]) {
      form.elements.email.value = DEMO_ACCOUNTS[requestedAccount].email;
      form.elements.password.value = DEMO_ACCOUNTS[requestedAccount].password;
      var tag = document.querySelector('.auth-form-header__tag');
      if (tag) tag.textContent = requestedAccount === 'admin' ? 'Administrator portal' : 'Parking manager portal';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var role = getAccountType(form.elements.email.value);
      rememberDemoUser(role);
      ui.toast('Demo sign-in complete. Opening the ' + role + ' portal.');
      window.setTimeout(function () { window.location.href = DEMO_ACCOUNTS[role].page; }, 350);
    });

    document.querySelectorAll('.social-login button').forEach(function (button) {
      button.addEventListener('click', function () {
        ui.toast('Social login is represented in this frontend demo. Use the demo credentials above.');
      });
    });
  }

  function initialiseRegistrationForm() {
    var form = document.getElementById('registration-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var firstName = form.elements.first_name.value.trim() || 'New';
      window.localStorage.setItem('parkflow-demo-role', 'driver');
      window.localStorage.setItem('parkflow-demo-driver-name', firstName);
      ui.toast('Driver account created for this frontend demo.');
      window.setTimeout(function () { window.location.href = 'driver.html'; }, 350);
    });

    var password = document.getElementById('register-password');
    if (password) {
      password.addEventListener('input', function () {
        var note = password.closest('.form-field').querySelector('.password-strength small');
        if (note && password.value.length >= 8) note.textContent = 'Password strength: ready for the demo.';
      });
    }
  }

  initialiseLoginForm();
  initialiseRegistrationForm();
})();
