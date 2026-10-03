/* Manager page routing only. Live operations are handled by backend-manager.js. */
(function () {
  "use strict";
  var routes = [
    "overview",
    "reservations",
    "spaces",
    "verification",
    "violations",
    "reports",
    "messages",
  ];
  var storageKey = "parkflow-manager-active-route";
  function valid(route) {
    return routes.indexOf(route) !== -1;
  }
  function show(route) {
    if (!valid(route)) route = "overview";
    var content = document.querySelector(".manager-portal .dashboard-content");
    var active = document.getElementById(route);
    if (!content || !active) return;
    Array.prototype.forEach.call(content.children, function (section) {
      if (section.classList && section.classList.contains("manager-section")) {
        var current = section === active;
        section.classList.toggle("is-view-active", current);
        section.style.display = current ? "grid" : "none";
      }
    });
    document
      .querySelectorAll(".manager-portal .sidebar-nav__link")
      .forEach(function (link) {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === "#" + route,
        );
      });
    content.scrollTop = 0;
    try {
      window.sessionStorage.setItem(storageKey, route);
    } catch (ignore) {}
  }
  document.addEventListener(
    "click",
    function (event) {
      var link = event.target.closest('.manager-portal a[href^="#"]');
      if (
        !link ||
        link.closest(".modal") ||
        link.hasAttribute("data-report-download")
      )
        return;
      var route = (link.getAttribute("href") || "").slice(1);
      if (!valid(route)) return;
      event.preventDefault();
      show(route);
      var details = link.closest("details");
      if (details) details.removeAttribute("open");
    },
    true,
  );
  var initial = (window.location.hash || "").slice(1);
  if (!valid(initial)) {
    try {
      initial = window.sessionStorage.getItem(storageKey);
    } catch (ignore) {}
  }
  show(valid(initial) ? initial : "overview");
  window.ParkFlowManagerNavigation = { show: show };
})();
