/* Driver portal routing only. Backend interactions are handled by backend-driver.js. */
(function () {
  "use strict";
  var routes = [
      "overview",
      "profile",
      "availability",
      "reservation",
      "active-booking",
      "history",
      "issues",
      "messages",
      "vehicles",
    ],
    key = "parkflow-driver-active-route";
  function valid(route) {
    return routes.indexOf(route) !== -1;
  }
  function show(route) {
    if (!valid(route)) route = "overview";
    var target = document.getElementById(route),
      content = document.querySelector(".driver-portal .dashboard-content");
    if (!target || !content) return;
    Array.prototype.forEach.call(content.children, function (section) {
      if (section.classList && section.classList.contains("driver-section")) {
        var current = section === target;
        section.classList.toggle("is-view-active", current);
        section.style.display = current ? "grid" : "none";
      }
    });
    document
      .querySelectorAll(".driver-portal .sidebar-nav__link")
      .forEach(function (link) {
        link.classList.toggle(
          "is-active",
          link.getAttribute("href") === "#" + route,
        );
      });
    content.scrollTop = 0;
    try {
      sessionStorage.setItem(key, route);
    } catch (ignore) {}
  }
  document.addEventListener(
    "click",
    function (event) {
      var link = event.target.closest('.driver-portal a[href^="#"]');
      if (!link || link.closest(".modal")) return;
      var route = (link.getAttribute("href") || "").slice(1);
      if (!valid(route)) return;
      event.preventDefault();
      show(route);
      var details = link.closest("details");
      if (details) details.removeAttribute("open");
    },
    true,
  );
  var initial = (location.hash || "").slice(1);
  if (!valid(initial)) {
    try {
      initial = sessionStorage.getItem(key);
    } catch (ignore) {}
  }
  show(valid(initial) ? initial : "overview");
  window.ParkFlowDriverNavigation = { show: show };
})();
