/* Administrator portal: manager accounts, approvals, locations, pricing, violations, and revenue PDF. */
(function () {
  'use strict';

  var ui = window.ParkFlowUI;
  if (!ui) return;

  var managerToRemove = null;
  var adminRouteStorageKey = 'parkflow-admin-active-route';
  var adminRoutes = ['overview', 'analytics', 'managers', 'locations', 'drivers', 'pricing', 'violations', 'reports', 'settings'];

  function isAdminRoute(routeId) {
    return adminRoutes.indexOf(routeId) !== -1;
  }

  function saveAdminRoute(routeId) {
    try {
      window.sessionStorage.setItem(adminRouteStorageKey, routeId);
    } catch (error) {
      /* Navigation remains usable if browser storage is unavailable. */
    }
  }

  function getInitialAdminRoute() {
    var routeFromUrl = (window.location.hash || '').slice(1);
    if (isAdminRoute(routeFromUrl)) return routeFromUrl;
    try {
      var savedRoute = window.sessionStorage.getItem(adminRouteStorageKey);
      if (isAdminRoute(savedRoute)) return savedRoute;
    } catch (error) {
      /* Fall back to the administrator dashboard. */
    }
    return 'overview';
  }

  function openAdminSection(routeId) {
    if (!isAdminRoute(routeId)) return;
    var target = document.getElementById(routeId);
    var content = document.querySelector('.admin-portal .dashboard-content');
    if (!target || !content) return;

    Array.prototype.filter.call(content.children, function (item) {
      return item.classList && item.classList.contains('admin-section');
    }).forEach(function (section) {
      var isCurrent = section === target;
      section.classList.toggle('is-view-active', isCurrent);
      /* Show the requested portal view immediately; never animate a scroll. */
      section.style.display = isCurrent ? 'grid' : 'none';
    });
    document.querySelectorAll('.admin-portal .sidebar-nav__link').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + routeId);
    });
    content.scrollTop = 0;
    saveAdminRoute(routeId);
  }

  function initialiseAdminNavigation() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('.admin-portal a[href^="#"]');
      if (!link || link.closest('.modal') || link.hasAttribute('data-report-download')) return;
      var routeId = (link.getAttribute('href') || '').slice(1);
      if (!isAdminRoute(routeId)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openAdminSection(routeId);

      var mobileMenu = link.closest('details.mobile-sidebar');
      if (mobileMenu) mobileMenu.removeAttribute('open');
      var topbarMenu = link.closest('details.topbar-details');
      if (topbarMenu) topbarMenu.removeAttribute('open');
    }, true);

    openAdminSection(getInitialAdminRoute());
  }

  function initials(name) {
    return name.split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function appendManager(name, email, location, start, end) {
    var body = document.querySelector('#managers .dashboard-table tbody');
    if (!body) return;
    var row = document.createElement('tr');
    row.innerHTML = '<td><div class="table-identity"><span class="avatar"></span><span class="table-identity__text"><strong></strong><small></small></span></div></td><td></td><td></td><td><strong>0</strong></td><td><span class="badge badge--active badge--dot">Active</span></td><td><div class="table-actions"><button class="icon-btn" type="button" aria-label="Edit manager">✎</button><a class="icon-btn table-delete" href="#remove-manager" aria-label="Remove manager">⌫</a></div></td>';
    row.querySelector('.avatar').textContent = initials(name);
    row.querySelector('.table-identity strong').textContent = name;
    row.querySelector('.table-identity small').textContent = email;
    row.cells[1].textContent = location;
    row.cells[2].textContent = start + '–' + end;
    body.appendChild(row);
  }

  function appendLocation(name, address, capacity, rate, manager) {
    var grid = document.querySelector('.admin-location-grid');
    if (!grid) return;
    var card = document.createElement('article');
    card.className = 'admin-location-card';
    card.innerHTML = '<header><span class="admin-location-card__mark">P</span><span class="badge badge--active badge--dot">Operational</span></header><div><h3></h3><p></p></div><dl><div><dt>Total spaces</dt><dd></dd></div><div><dt>Occupied</dt><dd>0</dd></div><div><dt>Rate</dt><dd></dd></div></dl><div class="location-capacity"><span><strong>0%</strong> occupied</span><div class="progress progress--success"><div class="progress__bar" style="width:0%"></div></div></div><footer><div class="table-identity"><span class="avatar avatar--sm"></span><span class="table-identity__text"><small>Manager</small><strong></strong></span></div><button class="icon-btn" type="button" aria-label="Edit location">✎</button></footer>';
    card.querySelector('h3').textContent = name;
    card.querySelector('p').textContent = address;
    card.querySelectorAll('dd')[0].textContent = capacity;
    card.querySelectorAll('dd')[2].textContent = '৳' + rate + '/hr';
    card.querySelector('.avatar').textContent = manager === 'Assign later' ? '—' : initials(manager);
    card.querySelector('footer strong').textContent = manager;
    grid.appendChild(card);
  }

  function appendViolationCategory(name, description, severity, penalty) {
    var grid = document.querySelector('.violation-category-grid');
    if (!grid) return;
    var card = document.createElement('article');
    card.className = 'violation-category';
    card.innerHTML = '<header><span class="violation-category__icon">!</span><span class="badge"></span></header><h3></h3><p></p><footer><span>Default penalty <strong></strong></span><button class="icon-btn" type="button" aria-label="Edit category">✎</button></footer>';
    card.querySelector('.badge').className = 'badge badge--info';
    card.querySelector('.badge').textContent = severity;
    card.querySelector('h3').textContent = name;
    card.querySelector('p').textContent = description;
    card.querySelector('footer strong').textContent = '৳' + penalty;
    grid.appendChild(card);
  }

  function initialiseManagerModals() {
    var addForm = document.querySelector('#add-manager form');
    if (addForm) {
      addForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!addForm.checkValidity()) {
          addForm.reportValidity();
          return;
        }
        var name = document.getElementById('manager-first-name').value.trim() + ' ' + document.getElementById('manager-last-name').value.trim();
        appendManager(name, document.getElementById('manager-email').value.trim(), document.getElementById('manager-location').value, document.getElementById('manager-shift-start').value, document.getElementById('manager-shift-end').value);
        addForm.reset();
        ui.closeModal(document.getElementById('add-manager'));
        ui.toast(name + ' added as a parking manager.');
      });
    }
    document.addEventListener('click', function (event) {
      var removeLink = event.target.closest('.table-delete');
      if (removeLink) managerToRemove = removeLink.closest('tr');
    });
    var removeButton = document.querySelector('#remove-manager .btn--danger');
    if (removeButton) {
      removeButton.addEventListener('click', function () {
        if (managerToRemove) managerToRemove.remove();
        managerToRemove = null;
        ui.closeModal(document.getElementById('remove-manager'));
        ui.toast('Parking manager access removed from this demo.');
      });
    }
  }

  function initialiseLocationModal() {
    var form = document.querySelector('#add-location form');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      appendLocation(
        document.getElementById('new-location-name').value.trim(),
        document.getElementById('new-location-address').value.trim(),
        document.getElementById('new-location-capacity').value,
        document.getElementById('new-location-rate').value,
        document.getElementById('new-location-manager').value
      );
      form.reset();
      ui.closeModal(document.getElementById('add-location'));
      ui.toast('Parking location added to the frontend demo.');
    });
  }

  function initialiseDriverApprovals() {
    document.querySelectorAll('.approval-actions .btn--success').forEach(function (button) {
      button.addEventListener('click', function () {
        var row = button.closest('tr');
        var badge = row.querySelector('td:nth-child(5) .badge');
        if (badge) {
          badge.className = 'badge badge--success badge--dot';
          badge.textContent = 'Approved';
        }
        button.disabled = true;
        button.textContent = 'Approved';
        ui.toast('Driver account approved and ready to use.');
      });
    });
    document.querySelectorAll('.document-chips button, .approval-actions .btn--secondary').forEach(function (button) {
      button.addEventListener('click', function () { ui.toast('Document review opened in the frontend demo.'); });
    });
  }

  function initialisePricing() {
    var pricingForm = document.querySelector('#add-pricing-rule form');
    if (pricingForm) {
      pricingForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!pricingForm.checkValidity()) {
          pricingForm.reportValidity();
          return;
        }
        pricingForm.reset();
        ui.closeModal(document.getElementById('add-pricing-rule'));
        ui.toast('Dynamic pricing rule created for future reservations.');
      });
    }
    document.querySelectorAll('.pricing-rule .switch input').forEach(function (input) {
      input.addEventListener('change', function () { ui.toast('Pricing rule ' + (input.checked ? 'enabled' : 'paused') + '.'); });
    });
    document.querySelectorAll('.pricing-preview button').forEach(function (button) {
      button.addEventListener('click', function () {
        var clock = document.querySelector('.pricing-clock strong');
        if (clock) clock.textContent = '8:15 PM';
        ui.toast('Rate preview updated for 8:15 PM.');
      });
    });
  }

  function initialiseViolationControls() {
    var form = document.querySelector('#add-violation-category form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        appendViolationCategory(
          document.getElementById('violation-category-name').value.trim(),
          document.getElementById('violation-category-description').value.trim(),
          document.getElementById('violation-severity').value,
          document.getElementById('violation-penalty').value || '0'
        );
        form.reset();
        ui.closeModal(document.getElementById('add-violation-category'));
        ui.toast('Violation category added.');
      });
    }
    document.querySelectorAll('.violation-category .icon-btn').forEach(function (button) {
      button.addEventListener('click', function () { ui.toast('Category editing is ready in the demo.'); });
    });
  }

  function initialiseReportsAndSearch() {
    document.querySelectorAll('#reports a, #reports button, .page-header__actions a[href="#reports"]').forEach(function (control) {
      var label = control.textContent.trim();
      if (/export/i.test(label)) {
        control.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          ui.createPdf('ParkFlow Monthly Revenue Report', [
            'Report month: June 2026',
            'Gross revenue: BDT 7,842,600',
            'Net revenue: BDT 7,215,192',
            'Reservations: 11,684',
            'Average booking value: BDT 671',
            'Prepared for ParkFlow Administrator'
          ], 'parkflow-monthly-revenue-report.pdf');
        });
      }
      if (/print preview/i.test(label)) control.addEventListener('click', function () { window.print(); });
    });

    var search = document.getElementById('manager-search');
    if (search) {
      search.addEventListener('input', function () {
        var query = search.value.trim().toLowerCase();
        document.querySelectorAll('#managers tbody tr').forEach(function (row) {
          row.hidden = !!query && row.textContent.toLowerCase().indexOf(query) === -1;
        });
      });
    }
    document.querySelectorAll('.dashboard-table .icon-btn, .admin-location-card .icon-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!button.closest('.approval-table')) ui.toast((button.getAttribute('aria-label') || 'Details') + ' opened in the demo.');
      });
    });
  }

  function initialiseSystemSettings() {
    var form = document.getElementById('admin-settings-form');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      ui.toast('System settings saved in this frontend demo.');
    });
  }

  initialiseManagerModals();
  initialiseLocationModal();
  initialiseDriverApprovals();
  initialisePricing();
  initialiseViolationControls();
  initialiseReportsAndSearch();
  initialiseSystemSettings();
  initialiseAdminNavigation();
})();
