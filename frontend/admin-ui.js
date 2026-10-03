/* Administrator page routing only. Data and all mutations live in backend-admin.js. */
(function () {
  'use strict';

  var routes = ['overview', 'profile', 'analytics', 'managers', 'locations', 'manager-approvals', 'pricing', 'violations', 'reports'];
  var storageKey = 'parkflow-admin-active-route';
  function valid(route) { return routes.indexOf(route) !== -1; }
  function show(route) {
    if (!valid(route)) route = 'overview';
    var content = document.querySelector('.admin-portal .dashboard-content');
    var active = document.getElementById(route);
    if (!content || !active) return;
    Array.prototype.forEach.call(content.children, function (section) {
      if (section.classList && section.classList.contains('admin-section')) {
        var current = section === active;
        section.classList.toggle('is-view-active', current);
        section.style.display = current ? 'grid' : 'none';
      }
    });
    document.querySelectorAll('.admin-portal .sidebar-nav__link').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + route);
    });
    content.scrollTop = 0;
    try { window.sessionStorage.setItem(storageKey, route); } catch (ignore) {}
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('.admin-portal a[href^="#"]');
    if (!link || link.closest('.modal') || link.hasAttribute('data-report-download')) return;
    var route = (link.getAttribute('href') || '').slice(1);
    if (!valid(route)) return;
    event.preventDefault();
    show(route);
    var details = link.closest('details');
    if (details) details.removeAttribute('open');
  }, true);

  var route = (window.location.hash || '').slice(1);
  if (!valid(route)) { try { route = window.sessionStorage.getItem(storageKey); } catch (ignore) {} }
  show(valid(route) ? route : 'overview');
  window.ParkFlowAdminNavigation = { show: show };
})();
