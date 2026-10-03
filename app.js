(function () {
  'use strict';

  var body = document.body;
  var toastTimer;

  function showToast(message, tone) {
    var toast = document.querySelector('.app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'app-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.className = 'app-toast is-visible' + (tone ? ' app-toast--' + tone : '');
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3600);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    body.classList.remove('app-modal-open');
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal.is-open').forEach(closeModal);
  }

  function openModal(modal) {
    if (!modal) return;
    closeAllModals();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('app-modal-open');
    var focusTarget = modal.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (focusTarget) window.setTimeout(function () { focusTarget.focus(); }, 40);
  }

  function clearHash() {
    if (window.history && window.history.replaceState && window.location.hash) {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  }

  function scrollToTarget(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('app-focus-section');
    window.setTimeout(function () { target.classList.remove('app-focus-section'); }, 1200);
  }

  function activateDashboardView(target) {
    var section = target && target.closest('.admin-section, .manager-section, .driver-section');
    var content = section && section.parentElement;
    if (!section || !content || !content.classList.contains('dashboard-content')) return false;
    var views = Array.prototype.filter.call(content.children, function (child) {
      return child.matches('.admin-section, .manager-section, .driver-section');
    });
    if (!views.length) return false;
    content.classList.add('app-views');
    views.forEach(function (view) { view.classList.toggle('is-view-active', view === section); });
    document.querySelectorAll('.sidebar-nav__link').forEach(function (navLink) {
      var navTarget = document.getElementById((navLink.getAttribute('href') || '').slice(1));
      var navSection = navTarget && navTarget.closest('.admin-section, .manager-section, .driver-section');
      navLink.classList.toggle('is-active', navSection === section);
    });
    return true;
  }

  function focusDashboardTarget(target) {
    var section = target && target.closest('.admin-section, .manager-section, .driver-section');
    var content = section && section.parentElement;
    if (!section || !content || !content.classList.contains('dashboard-content')) return;
    var targetTop = target === section ? 0 : Math.max(0, target.offsetTop - 16);
    /* Portal links behave like app routes: switch views immediately, without scrolling animation. */
    content.scrollTop = targetTop;
  }

  function handleHashLink(event, link) {
    var raw = link.getAttribute('href');
    if (!raw || raw === '#' || raw.indexOf('#') !== 0) return;
    var id = raw.slice(1);
    var target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    clearHash();
    if (target.classList.contains('modal')) {
      openModal(target);
      return;
    }
    closeAllModals();
    if (activateDashboardView(target)) {
      /* Dashboard routes replace the current view immediately; they never smooth-scroll the document. */
      window.scrollTo(0, 0);
      focusDashboardTarget(target);
    } else {
      scrollToTarget(target);
    }
    var details = link.closest('details');
    if (details) details.removeAttribute('open');
  }

  function appendChatMessage(form) {
    var field = form.querySelector('textarea');
    var text = field && field.value.trim();
    if (!text) {
      showToast('Write a message before sending.', 'warning');
      if (field) field.focus();
      return;
    }
    var messages = form.closest('.chat-window') && form.closest('.chat-window').querySelector('.chat-messages');
    if (messages) {
      var item = document.createElement('div');
      item.className = 'chat-message chat-message--outgoing';
      item.innerHTML = '<p class="chat-message__bubble"></p><time>Just now · Delivered</time>';
      item.querySelector('p').textContent = text;
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
    }
    field.value = '';
    showToast('Message sent.');
  }

  function submitFeedback(form, message) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    showToast(message || 'Saved successfully.');
    form.reset();
  }

  document.addEventListener('click', function (event) {
    var mobileDismiss = event.target.closest('.mobile-sidebar__close, .mobile-sidebar__backdrop');
    if (mobileDismiss) {
      var mobileDetails = mobileDismiss.closest('details');
      if (mobileDetails) mobileDetails.removeAttribute('open');
      return;
    }

    var closeButton = event.target.closest('.modal__close');
    if (closeButton) {
      event.preventDefault();
      closeModal(closeButton.closest('.modal'));
      clearHash();
      return;
    }

    var link = event.target.closest('a[href^="#"]');
    if (link && link.closest('.modal')) {
      event.preventDefault();
      closeModal(link.closest('.modal'));
      clearHash();
      return;
    }
    if (link) handleHashLink(event, link);

    var modal = event.target.classList && event.target.classList.contains('modal') ? event.target : null;
    if (modal) closeModal(modal);

    var actionButton = event.target.closest('button');
    if (actionButton && actionButton.matches('[aria-label="Add funds"]')) {
      showToast('Wallet top-up is ready. Choose an amount to continue.');
      return;
    }
    if (actionButton && /^Mark all read$/i.test(actionButton.textContent.trim())) {
      var notificationDetails = actionButton.closest('.topbar-details');
      if (notificationDetails) {
        notificationDetails.querySelectorAll('.notification-item.is-unread').forEach(function (item) {
          item.classList.remove('is-unread');
        });
        notificationDetails.querySelector('.topbar-icon__dot')?.remove();
      }
      showToast('All notifications marked as read.');
      return;
    }
    if (actionButton && /^Open booking$/i.test(actionButton.textContent.trim())) {
      var booking = document.getElementById('active-booking');
      if (booking) {
        activateDashboardView(booking);
        focusDashboardTarget(booking);
      }
      return;
    }
    if (actionButton && /Add another vehicle/i.test(actionButton.textContent)) {
      openModal(document.getElementById('add-driver-vehicle'));
      return;
    }
    if (actionButton && actionButton.closest('.driver-map-controls')) {
      showToast(actionButton.getAttribute('aria-label') + ' applied to the map.');
      return;
    }
    if (actionButton && actionButton.matches('.driver-map-pin')) {
      actionButton.closest('.driver-live-map').querySelectorAll('.driver-map-pin').forEach(function (pin) {
        pin.classList.toggle('is-selected', pin === actionButton);
      });
      showToast('Parking location selected.');
      return;
    }
    if (actionButton && actionButton.matches('.chat-composer [aria-label="Attach a file"]')) {
      showToast('File attachment is ready.');
      return;
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAllModals();
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form.matches('.chat-composer')) {
      event.preventDefault();
      appendChatMessage(form);
    } else if (form.closest('.modal')) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      closeModal(form.closest('.modal'));
      showToast('Changes saved successfully.');
    } else if (form.matches('#find-parking, .location-filters')) {
      event.preventDefault();
      var results = document.getElementById('locations') || document.getElementById('location-results');
      if (results) scrollToTarget(results);
      showToast('Availability updated for your search.');
    } else if (form.matches('.support-form')) {
      event.preventDefault();
      submitFeedback(form, 'Support request sent. We will reply shortly.');
    } else if (form.matches('.topbar-search')) {
      event.preventDefault();
      showToast('Use the portal search to view live matching records.');
    }
  });

  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.setAttribute('aria-hidden', 'true');
  });

  /* A drawer that was open while resizing must never reappear as a broken overlay. */
  function closeResponsiveMenus() {
    document.querySelectorAll('.mobile-sidebar[open], .topbar-details[open]').forEach(function (menu) {
      menu.removeAttribute('open');
    });
  }

  function initialiseResponsiveDashboardShell() {
    if (!window.matchMedia) return;
    var compactLayout = window.matchMedia('(max-width: 1023px)');
    var closeOnBreakpointChange = function () { closeResponsiveMenus(); };
    if (compactLayout.addEventListener) {
      compactLayout.addEventListener('change', closeOnBreakpointChange);
    } else if (compactLayout.addListener) {
      compactLayout.addListener(closeOnBreakpointChange);
    }
  }

  initialiseResponsiveDashboardShell();

  /*
   * Shared browser-only helpers.
   * Role-specific interaction files use this small public surface instead of
   * duplicating modal, toast, and PDF code in every stakeholder module.
   */
  function openDashboardSection(sectionId) {
    var target = document.getElementById(sectionId);
    if (!target) return;
    closeAllModals();
    if (activateDashboardView(target)) {
      window.scrollTo(0, 0);
      focusDashboardTarget(target);
    } else {
      scrollToTarget(target);
    }
  }

  function escapePdfText(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' ');
  }

  function createPdf(title, lines, filename) {
    var textLines = [title].concat(lines || []).map(escapePdfText);
    var stream = 'BT\n/F1 18 Tf\n52 790 Td\n(' + textLines[0] + ') Tj\n' +
      '/F1 11 Tf\n0 -28 Td\n' + textLines.slice(1).map(function (line) {
        return '(' + line + ') Tj\n0 -18 Td';
      }).join('\n') + '\nET';
    var objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
      '4 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    ];
    var header = '%PDF-1.4\n';
    var offset = header.length;
    var offsets = [0];
    objects.forEach(function (object) {
      offsets.push(offset);
      offset += object.length;
    });
    var xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' +
      offsets.slice(1).map(function (item) {
        return String(item).padStart(10, '0') + ' 00000 n ';
      }).join('\n') + '\n';
    var pdf = header + objects.join('') + xref + 'trailer\n<< /Size ' +
      (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + offset + '\n%%EOF';
    var link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    link.download = filename || 'parkflow-report.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    showToast('PDF downloaded successfully.');
  }

  window.ParkFlowUI = {
    closeModal: closeModal,
    createPdf: createPdf,
    openModal: openModal,
    openSection: openDashboardSection,
    toast: showToast
  };

  if (window.location.hash) {
    var initialTarget = document.getElementById(window.location.hash.slice(1));
    if (initialTarget && initialTarget.classList.contains('modal')) {
      openModal(initialTarget);
      clearHash();
    }
  }
})();
