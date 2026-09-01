/* Parking-manager portal: space operations, OTP validation, violations, reports, and chat. */
(function () {
  'use strict';

  var ui = window.ParkFlowUI;
  if (!ui) return;

  var selectedSpace = null;
  var managerRouteStorageKey = 'parkflow-manager-active-route';
  var managerRoutes = ['overview', 'reservations', 'spaces', 'verification', 'violations', 'reports', 'messages'];

  function isManagerRoute(routeId) {
    return managerRoutes.indexOf(routeId) !== -1;
  }

  function saveManagerRoute(routeId) {
    try {
      window.sessionStorage.setItem(managerRouteStorageKey, routeId);
    } catch (error) {
      /* Navigation stays available if browser storage is unavailable. */
    }
  }

  function getInitialManagerRoute() {
    var routeFromUrl = (window.location.hash || '').slice(1);
    if (isManagerRoute(routeFromUrl)) return routeFromUrl;
    try {
      var savedRoute = window.sessionStorage.getItem(managerRouteStorageKey);
      if (isManagerRoute(savedRoute)) return savedRoute;
    } catch (error) {
      /* Fall back to the operations overview. */
    }
    return 'overview';
  }

  function openManagerSection(routeId) {
    if (!isManagerRoute(routeId)) return;
    var target = document.getElementById(routeId);
    var content = document.querySelector('.manager-portal .dashboard-content');
    if (!target || !content) return;

    Array.prototype.filter.call(content.children, function (item) {
      return item.classList && item.classList.contains('manager-section');
    }).forEach(function (section) {
      var isCurrent = section === target;
      section.classList.toggle('is-view-active', isCurrent);
      /* Force the selected view to render immediately instead of scrolling to it. */
      section.style.display = isCurrent ? 'grid' : 'none';
    });
    document.querySelectorAll('.manager-portal .sidebar-nav__link').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + routeId);
    });
    content.scrollTop = 0;
    saveManagerRoute(routeId);
  }

  function initialiseManagerNavigation() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('.manager-portal a[href^="#"]');
      if (!link || link.closest('.modal')) return;
      if (link.hasAttribute('data-report-download')) return;

      var routeId = (link.getAttribute('href') || '').slice(1);
      if (!isManagerRoute(routeId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openManagerSection(routeId);

      var mobileMenu = link.closest('details.mobile-sidebar');
      if (mobileMenu) mobileMenu.removeAttribute('open');
      var topbarMenu = link.closest('details.topbar-details');
      if (topbarMenu) topbarMenu.removeAttribute('open');
    }, true);

    openManagerSection(getInitialManagerRoute());
  }

  function spaceLabel(space) {
    var label = space && space.querySelector('span');
    return label ? label.textContent.trim() : 'selected space';
  }

  function selectSpace(space) {
    selectedSpace = space;
    document.querySelectorAll('.parking-space').forEach(function (item) {
      item.classList.toggle('is-selected', item === space);
    });
    ui.toast('Space ' + spaceLabel(space) + ' selected. Choose Update selected space to change its status.');
  }

  function setSpaceStatus(space, status) {
    if (!space) return;
    var normalized = status.toLowerCase();
    ['free', 'occupied', 'reserved', 'blocked'].forEach(function (name) {
      space.classList.remove('parking-space--' + name);
    });
    space.classList.add('parking-space--' + normalized);
    var detail = space.querySelector('small');
    if (detail) detail.textContent = normalized === 'free' ? 'Free' : normalized === 'blocked' ? 'Blocked' : normalized === 'reserved' ? 'Reserved' : 'Occupied';
  }

  function connectOtpInputs(modal) {
    modal.querySelectorAll('.otp-inputs input').forEach(function (input, index, inputs) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
      });
    });
  }

  function completeOtp(modal, type) {
    var digits = Array.prototype.map.call(modal.querySelectorAll('.otp-inputs input'), function (input) {
      return input.value.trim();
    }).join('');
    if (digits.length !== 4) {
      ui.toast('Enter all four OTP digits.', 'warning');
      return;
    }
    if (type === 'check-in' && digits !== '8426') {
      ui.toast('OTP does not match this reservation. Demo code: 8426.', 'warning');
      return;
    }
    var card = document.querySelector(type === 'check-in' ? '.verification-card--urgent' : '.verification-card:nth-child(2)');
    if (card) {
      var badge = card.querySelector('.badge');
      if (badge) {
        badge.className = 'badge badge--success badge--dot';
        badge.textContent = type === 'check-in' ? 'Checked in' : 'Completed';
      }
      var action = card.querySelector('.btn');
      if (action) {
        action.className = 'btn btn--secondary btn--block';
        action.textContent = type === 'check-in' ? 'Checked in' : 'Check-out completed';
      }
    }
    ui.closeModal(modal);
    ui.toast(type === 'check-in' ? 'Check-in verified. Space A-18 is now occupied.' : 'Check-out completed. Space B-04 is now free.');
  }

  function initialiseSpaceOperations() {
    document.querySelectorAll('.parking-space').forEach(function (space) {
      space.addEventListener('click', function () { selectSpace(space); });
    });
    document.querySelectorAll('.parking-zone-tabs button').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('.parking-zone-tabs button').forEach(function (item) {
          var active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        ui.toast(button.textContent.trim() + ' map selected.');
      });
    });
    var updateLink = document.querySelector('a[href="#update-space"]');
    if (updateLink) {
      updateLink.addEventListener('click', function (event) {
        if (!selectedSpace) {
          event.preventDefault();
          event.stopPropagation();
          ui.toast('Select a parking space before updating it.', 'warning');
          return;
        }
        var title = document.getElementById('update-space-title');
        if (title) title.textContent = 'Update space ' + spaceLabel(selectedSpace);
      });
    }
    var form = document.querySelector('#update-space form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!selectedSpace) {
          ui.toast('Select a parking space first.', 'warning');
          return;
        }
        var selected = form.querySelector('input[name="space-status"]:checked');
        if (!selected) {
          ui.toast('Choose a new space status.', 'warning');
          return;
        }
        var status = selected.closest('label').querySelector('strong').textContent.trim();
        setSpaceStatus(selectedSpace, status);
        ui.closeModal(document.getElementById('update-space'));
        ui.toast('Space ' + spaceLabel(selectedSpace) + ' updated to ' + status.toLowerCase() + '.');
      });
    }
  }

  function initialiseOtpVerification() {
    [['otp-checkin', 'check-in'], ['otp-checkout', 'check-out']].forEach(function (setup) {
      var modal = document.getElementById(setup[0]);
      if (!modal) return;
      connectOtpInputs(modal);
      var form = modal.querySelector('form');
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        completeOtp(modal, setup[1]);
      });
    });
  }

  function initialiseViolations() {
    document.querySelectorAll('.violation-action-form').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    document.querySelectorAll('#violation-review .modal__footer button').forEach(function (button) {
      button.addEventListener('click', function () {
        var row = document.querySelector('.violation-table tbody tr');
        if (row) {
          var action = row.querySelector('.btn');
          if (action) {
            action.className = 'btn btn--secondary btn--sm';
            action.textContent = 'Resolved';
          }
        }
        ui.closeModal(document.getElementById('violation-review'));
        ui.toast('Violation #VL-1084 resolved and the driver was notified.');
      });
    });
    document.querySelectorAll('.segmented-control button').forEach(function (button) {
      button.addEventListener('click', function () {
        var group = button.closest('.segmented-control');
        group.querySelectorAll('button').forEach(function (item) { item.classList.toggle('is-active', item === button); });
        ui.toast(button.textContent.trim() + ' filter applied.');
      });
    });
  }

  function initialiseReportActions() {
    document.querySelectorAll('#reports a, #reports button').forEach(function (control) {
      var label = control.textContent.trim();
      if (/pdf/i.test(label)) {
        control.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          ui.createPdf('ParkFlow Area Operations Report', [
            'Location: Gulshan City Center',
            'Period: Current morning shift',
            'Reservations: 164',
            'Average occupancy: 82.5%',
            'Revenue processed: BDT 42,680',
            'Violations: 7 (2 open)',
            'Prepared by: Mahmudul Hasan, Area Manager'
          ], 'parkflow-gulshan-area-report.pdf');
        });
      }
      if (/print preview/i.test(label)) {
        control.addEventListener('click', function () { window.print(); });
      }
    });
  }

  function initialiseSearchAndReservations() {
    var search = document.getElementById('manager-search');
    if (search) {
      search.addEventListener('input', function () {
        var query = search.value.trim().toLowerCase();
        document.querySelectorAll('.reservation-table tbody tr').forEach(function (row) {
          row.hidden = !!query && row.textContent.toLowerCase().indexOf(query) === -1;
        });
      });
    }
    document.querySelectorAll('.reservation-table .btn--ghost').forEach(function (button) {
      button.addEventListener('click', function () { ui.toast('Reservation details are ready for review.'); });
    });
  }

  initialiseSpaceOperations();
  initialiseOtpVerification();
  initialiseViolations();
  initialiseReportActions();
  initialiseSearchAndReservations();
  initialiseManagerNavigation();
})();
