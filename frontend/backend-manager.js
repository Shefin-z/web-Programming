/* Live parking-manager portal. All displayed records and mutations use the PHP API. */
(function () {
  "use strict";
  var api = window.ParkFlowAPI,
    ui = window.ParkFlowUI;
  if (!api || !ui || !document.body.classList.contains("manager-portal"))
    return;
  var state = {
    metrics: {},
    reservations: [],
    spaces: [],
    queue: [],
    violations: [],
    issues: [],
    report: null,
    conversations: [],
    profile: null,
    reservationFilter: "all",
    reservationQuery: "",
    violationFilter: "all",
    selectedSpace: null,
    selectedQueue: null,
    selectedViolation: null,
    selectedIssue: null,
    recipient: null,
  };
  var esc = function (value) {
    var node = document.createElement("span");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  };
  var initials = function (name) {
    return String(name || "?")
      .split(/\s+/)
      .map(function (item) {
        return item[0] || "";
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };
  var money = function (value) {
    return (
      "BDT " +
      Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
    );
  };
  var time = function (value) {
    var d = new Date(String(value || "").replace(" ", "T"));
    return isNaN(d)
      ? "—"
      : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  var badge = function (value) {
    var text = String(value || "unknown").replace(/_/g, " ");
    var style = /active|completed|available|paid/i.test(text)
      ? "success"
      : /waiting|reserved|open|under review|overstayed/i.test(text)
        ? "warning"
        : /blocked|cancelled|failed/i.test(text)
          ? "danger"
          : "info";
    return (
      '<span class="badge badge--' +
      style +
      ' badge--dot">' +
      esc(text) +
      "</span>"
    );
  };
  function renderProfile(profile) {
    state.profile = profile || {};
    document
      .querySelectorAll(".topbar-profile strong, .sidebar-profile strong")
      .forEach(function (item) {
        item.textContent = state.profile.full_name || item.textContent;
      });
    var name = document.getElementById("manager-profile-name"),
      phone = document.getElementById("manager-profile-phone"),
      email = document.getElementById("manager-profile-email"),
      assignment = document.getElementById("manager-profile-assignment");
    if (name) name.value = state.profile.full_name || "";
    if (phone) phone.value = state.profile.phone || "";
    if (email) email.value = state.profile.email || "";
    if (assignment)
      assignment.value =
        (state.profile.location_name || "No location assigned") +
        (state.profile.shift_name ? " · " + state.profile.shift_name : "");
  }
  function guard() {
    return api
      .me()
      .then(function (data) {
        if (!data.user || data.user.role !== "manager") {
          window.location.href = "login.html?account=manager";
          throw new Error("Sign in required.");
        }
        return api.request("manager/profile");
      })
      .then(function (data) {
        renderProfile(data.profile);
      });
  }
  var dateTime = function (value) {
    var d = new Date(String(value || "").replace(" ", "T"));
    return isNaN(d) ? "—" : d.toLocaleString();
  };
  function detailItem(label, value, note, wide) {
    return (
      "<div" +
      (wide ? ' class="reservation-detail-grid__wide"' : "") +
      "><dt>" +
      esc(label) +
      "</dt><dd>" +
      esc(value || "—") +
      (note ? "<small>" + esc(note) + "</small>" : "") +
      "</dd></div>"
    );
  }
  function openReservationDetails(id) {
    api
      .request("manager/reservations/" + id)
      .then(function (data) {
        var reservation = data.reservation || {},
          modal = document.getElementById("manager-reservation-details");
        if (!modal) return;
        var title = document.getElementById(
            "manager-reservation-details-title",
          ),
          subtitle = document.getElementById(
            "manager-reservation-details-subtitle",
          ),
          code = document.getElementById("manager-reservation-details-code"),
          status = document.getElementById(
            "manager-reservation-details-status",
          ),
          list = document.getElementById("manager-reservation-details-list");
        if (title)
          title.textContent =
            "Reservation #" + (reservation.reservation_code || "—");
        if (subtitle)
          subtitle.textContent =
            (reservation.location_name || "Assigned location") +
            " · Live booking details";
        if (code)
          code.textContent = "Created " + dateTime(reservation.created_at);
        if (status) status.innerHTML = badge(reservation.status);
        if (list)
          list.innerHTML = [
            detailItem(
              "Reservation window",
              dateTime(reservation.starts_at) +
                " – " +
                dateTime(reservation.ends_at),
            ),
            detailItem(
              "Parking space",
              reservation.space_code || "Not assigned",
              reservation.zone_code ? "Zone " + reservation.zone_code : "",
            ),
            detailItem(
              "Driver",
              reservation.driver_name,
              [reservation.driver_email, reservation.driver_phone]
                .filter(Boolean)
                .join(" · "),
            ),
            detailItem(
              "Vehicle",
              reservation.registration_number,
              [
                reservation.make_model,
                reservation.color,
                reservation.vehicle_type,
              ]
                .filter(Boolean)
                .join(" · "),
            ),
            detailItem(
              "Parking location",
              reservation.location_name,
              reservation.location_address,
            ),
            detailItem(
              "Payment",
              String(reservation.payment_status || "Not recorded").replace(
                /_/g,
                " ",
              ),
              [reservation.payment_method, reservation.payment_reference]
                .filter(Boolean)
                .join(" · "),
            ),
            detailItem(
              "Reservation total",
              money(reservation.total_amount),
              "Paid " +
                money(reservation.payment_amount || reservation.total_amount),
            ),
            detailItem(
              "Rate breakdown",
              money(reservation.hourly_rate) + "/hour",
              "Service fee " +
                money(reservation.service_fee) +
                " · Discount " +
                money(reservation.discount_amount),
            ),
            detailItem(
              "Actual check-in",
              dateTime(reservation.actual_check_in_at),
            ),
            detailItem(
              "Actual check-out",
              dateTime(reservation.actual_check_out_at),
            ),
            detailItem(
              "Driver note",
              reservation.notes || "No note supplied.",
              "",
              true,
            ),
          ].join("");
        ui.openModal(modal);
      })
      .catch(function (error) {
        ui.toast(error.message, "warning");
      });
  }

  function renderDashboard(data) {
    state.metrics = data.metrics || {};
    var metrics = state.metrics;
    document.querySelectorAll("#overview .kpi-card").forEach(function (card) {
      var label = card.querySelector(".kpi-card__value span"),
        output = card.querySelector(".kpi-card__value strong");
      if (!label || !output) return;
      var key = label.textContent.toLowerCase();
      if (key.indexOf("free") >= 0)
        output.textContent = metrics.free_spaces || 0;
      else if (key.indexOf("reservation") >= 0)
        output.textContent = metrics.reservations_today || 0;
      else if (key.indexOf("awaiting") >= 0)
        output.textContent = metrics.awaiting_verification || 0;
      else if (key.indexOf("violation") >= 0)
        output.textContent = metrics.open_violations || 0;
    });
    var title = document.getElementById("manager-overview-title");
    if (title)
      title.textContent = metrics.location
        ? metrics.location.name
        : "Assigned location";
    var summary = document.querySelector("#overview .page-header__copy p");
    if (summary)
      summary.textContent =
        new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }) + " · Live operational data";
    var stats = document.querySelectorAll(".manager-chart-stats strong");
    var occupied = Number(metrics.occupied || 0),
      spaces = Number(metrics.spaces || 0),
      percent = spaces ? Math.round((occupied * 100) / spaces) : 0;
    if (stats.length >= 3) {
      stats[0].textContent = percent + "%";
      stats[1].textContent = percent + "%";
      stats[2].textContent = "Live";
    }
  }
  function renderReservations(rows) {
    state.reservations = rows;
    rows = rows.filter(function (row) {
      var matchesFilter =
        state.reservationFilter === "all" ||
        (state.reservationFilter === "upcoming" &&
          /confirmed|pending/.test(row.status)) ||
        (state.reservationFilter === "active" &&
          /active|waiting_check_in/.test(row.status));
      var query = state.reservationQuery.toLowerCase();
      return (
        matchesFilter &&
        (!query ||
          [
            row.reservation_code,
            row.full_name,
            row.registration_number,
            row.space_code,
            row.status,
          ]
            .join(" ")
            .toLowerCase()
            .indexOf(query) >= 0)
      );
    });
    var body = document.querySelector(".reservation-table tbody");
    if (!body) return;
    body.innerHTML =
      rows
        .map(function (row) {
          var action =
            row.status === "waiting_check_in"
              ? '<a class="btn btn--primary btn--sm" data-action="queue-reservation" data-purpose="check_in" href="#otp-checkin">Check in</a>'
              : row.status === "active"
                ? '<a class="btn btn--secondary btn--sm" data-action="queue-reservation" data-purpose="check_out" href="#otp-checkout">Check out</a>'
                : row.status === "overstayed"
                  ? '<a class="btn btn--danger btn--sm" data-action="review-reservation" href="#violations">Review</a>'
                  : '<button class="btn btn--ghost btn--sm" data-action="reservation-details" type="button">View</button>';
          return (
            '<tr data-reservation-id="' +
            row.id +
            '"><td><strong>#' +
            esc(row.reservation_code) +
            "</strong><br><small>" +
            esc(row.status.replace(/_/g, " ")) +
            '</small></td><td><div class="table-identity"><span class="avatar">' +
            esc(initials(row.full_name)) +
            '</span><span class="table-identity__text"><strong>' +
            esc(row.full_name) +
            "</strong><small>" +
            esc(row.registration_number) +
            '</small></span></div></td><td><span class="space-code">' +
            esc(row.space_code || "—") +
            "</span></td><td><strong>" +
            esc(time(row.starts_at)) +
            "–" +
            esc(time(row.ends_at)) +
            "</strong></td><td>" +
            badge(row.status) +
            '</td><td><span class="text-success font-semibold">' +
            money(row.total_amount) +
            "</span></td><td>" +
            action +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="7">No reservations found for this location.</td></tr>';
    var footer = document.querySelector("#reservations .table-pagination");
    if (footer) {
      var text = footer.querySelector("span");
      if (text)
        text.textContent =
          "Showing " + rows.length + " of " + rows.length + " reservations";
      var nav = footer.querySelector("nav");
      if (nav) nav.hidden = true;
    }
  }
  function renderSpaces(rows) {
    state.spaces = rows;
    var floor = document.querySelector(".parking-floor");
    if (!floor) return;
    var zones = {};
    rows.forEach(function (row) {
      (zones[row.zone_code] || (zones[row.zone_code] = [])).push(row);
    });
    var codes = Object.keys(zones);
    floor.innerHTML =
      codes
        .map(function (code) {
          return (
            '<div class="parking-lane"><span class="parking-row-label">' +
            esc(code) +
            "</span>" +
            zones[code]
              .map(function (row) {
                var display =
                  row.status === "available"
                    ? "Free"
                    : row.status.replace(/_/g, " ");
                return (
                  '<button class="parking-space parking-space--' +
                  (row.status === "available" ? "free" : esc(row.status)) +
                  '" data-space-id="' +
                  row.id +
                  '" type="button"><span>' +
                  esc(row.space_code) +
                  "</span><small>" +
                  esc(display) +
                  "</small></button>"
                );
              })
              .join("") +
            "</div>"
          );
        })
        .join("") || "<p>No parking spaces are assigned to this location.</p>";
    var legend = document.querySelector(".space-legend");
    if (legend) {
      var counts = {
        available: 0,
        occupied: 0,
        reserved: 0,
        blocked: 0,
        maintenance: 0,
      };
      rows.forEach(function (row) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });
      legend.innerHTML =
        "<li>Free <strong>" +
        counts.available +
        "</strong></li><li>Occupied <strong>" +
        counts.occupied +
        "</strong></li><li>Reserved <strong>" +
        counts.reserved +
        "</strong></li><li>Blocked / maintenance <strong>" +
        (counts.blocked + counts.maintenance) +
        "</strong></li>";
    }
  }
  function renderQueue(rows) {
    state.queue = rows;
    var grid = document.querySelector(".verification-grid");
    if (!grid) return;
    grid.innerHTML =
      rows
        .map(function (row) {
          var incoming = row.purpose === "check_in";
          return (
            '<article class="verification-card" data-queue-id="' +
            row.id +
            '"><header><span class="verification-card__type">' +
            (incoming ? "Check-in" : "Check-out") +
            "</span>" +
            badge(row.status) +
            '</header><div class="verification-card__driver"><span class="avatar avatar--lg">' +
            esc(initials(row.full_name)) +
            "</span><span><h3>" +
            esc(row.full_name) +
            "</h3><p>" +
            esc(row.registration_number) +
            "</p></span></div><dl><div><dt>Reservation</dt><dd>#" +
            esc(row.reservation_code) +
            "</dd></div><div><dt>Space</dt><dd>" +
            esc(row.space_code || "—") +
            "</dd></div><div><dt>Time</dt><dd>" +
            esc(incoming ? time(row.starts_at) : time(row.ends_at)) +
            '</dd></div></dl><footer><a class="btn btn--' +
            (incoming ? "primary" : "secondary") +
            ' btn--block" data-action="queue-reservation" data-purpose="' +
            row.purpose +
            '" href="#otp-' +
            (incoming ? "checkin" : "checkout") +
            '">Verify ' +
            (incoming ? "check-in" : "check-out") +
            " OTP</a></footer></article>"
          );
        })
        .join("") || "<p>No arrivals or departures await OTP verification.</p>";
  }
  function renderViolations(rows) {
    state.violations = rows;
    rows = rows.filter(function (row) {
      return (
        state.violationFilter === "all" ||
        (state.violationFilter === "open" &&
          !/resolved|dismissed/.test(row.status)) ||
        (state.violationFilter === "resolved" &&
          /resolved|dismissed/.test(row.status))
      );
    });
    var body = document.querySelector(".violation-table tbody");
    if (!body) return;
    body.innerHTML =
      rows
        .map(function (row) {
          return (
            '<tr data-violation-id="' +
            row.id +
            '"><td><strong>#' +
            esc(row.violation_code) +
            "</strong><br><small>" +
            esc(row.status) +
            "</small></td><td><strong>" +
            esc(row.category) +
            "</strong><br><small>" +
            esc(row.description) +
            '</small></td><td><div class="table-identity"><span class="avatar">' +
            esc(initials(row.full_name)) +
            '</span><span class="table-identity__text"><strong>' +
            esc(row.full_name || "Unknown driver") +
            "</strong><small>" +
            esc(row.registration_number || "Unknown vehicle") +
            "</small></span></div></td><td>" +
            esc(row.space_code || "—") +
            "</td><td>" +
            esc(time(row.reported_at)) +
            "</td><td>" +
            badge(row.severity) +
            "</td><td>" +
            (/(resolved|dismissed)/.test(row.status)
              ? badge(row.status)
              : '<a class="btn btn--primary btn--sm" data-action="review-violation" href="#violation-review">Review</a>') +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="7">No violation reports found.</td></tr>';
  }
  function renderDriverIssues(rows) {
    state.issues = rows || [];
    var body = document.querySelector(".driver-issue-table tbody");
    if (!body) return;
    body.innerHTML =
      state.issues
        .map(function (row) {
          var closed = /resolved|closed/.test(row.status);
          return (
            '<tr data-issue-id="' +
            row.id +
            '"><td><strong>#' +
            esc(row.ticket_code) +
            "</strong><br><small>" +
            esc(row.category.replace(/_/g, " ")) +
            '</small></td><td><div class="table-identity"><span class="avatar">' +
            esc(initials(row.driver_name)) +
            '</span><span class="table-identity__text"><strong>' +
            esc(row.driver_name) +
            "</strong><small>" +
            esc(row.registration_number || row.driver_email) +
            "</small></span></div></td><td><strong>" +
            esc(row.description) +
            "</strong></td><td>" +
            esc(
              row.reservation_code ? "#" + row.reservation_code : "Not linked",
            ) +
            "<br><small>" +
            esc(row.space_code ? "Space " + row.space_code : "") +
            "</small></td><td>" +
            esc(time(row.reported_at)) +
            "</td><td>" +
            badge(row.status) +
            "</td><td>" +
            (closed
              ? badge(row.status)
              : '<button class="btn btn--primary btn--sm" data-action="review-driver-issue" type="button">Review</button>') +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="7">No driver issue reports are waiting for this area.</td></tr>';
  }
  function renderNotifications(data) {
    var items = data.notifications || [],
      list = document.querySelector(
        '.topbar-popover[aria-label="Manager notifications"] .notification-list',
      );
    if (!list) return;
    list.innerHTML =
      items
        .map(function (item) {
          return (
            '<a class="notification-item' +
            (item.read_at ? "" : " is-unread") +
            '" data-action="notification-read" data-notification-id="' +
            item.id +
            '" data-link="' +
            esc(item.link || "#overview") +
            '" href="' +
            esc(item.link || "#overview") +
            '"><span class="notification-item__icon">!</span><span class="notification-item__body"><strong>' +
            esc(item.title) +
            "</strong><p>" +
            esc(item.body) +
            "</p><time>" +
            esc(time(item.created_at)) +
            "</time></span>" +
            (item.read_at
              ? ""
              : '<span class="notification-item__unread"></span>') +
            "</a>"
          );
        })
        .join("") || '<p class="text-muted">No notifications yet.</p>';
    document.querySelectorAll(".topbar-icon__dot").forEach(function (dot) {
      dot.hidden = !data.unread_count;
    });
  }
  function loadNotifications() {
    return api
      .request("notifications")
      .then(renderNotifications)
      .catch(function () {
        /* Notifications do not block parking operations. */
      });
  }
  function renderReport(data) {
    state.report = data;
    if (!data) return;
    var location = data.location || {},
      summary = data.summary || {},
      violations = data.violations || {};
    var title = document.querySelector(".area-report-preview__title h3");
    if (title) title.textContent = location.name || "Assigned location";
    var metrics = document.querySelectorAll(".area-report-metrics dd");
    if (metrics.length >= 4) {
      metrics[0].textContent = summary.reservations || 0;
      metrics[1].textContent = state.metrics.spaces
        ? Math.round(
            (Number(state.metrics.occupied || 0) * 100) /
              Number(state.metrics.spaces),
          ) + "%"
        : "0%";
      metrics[2].textContent = money(summary.revenue);
      metrics[3].textContent = violations.total || 0;
    }
    var body = document.querySelector(".area-report-table tbody");
    if (body)
      body.innerHTML =
        (data.zones || [])
          .map(function (zone) {
            return (
              '<tr><th scope="row">Zone ' +
              esc(zone.code) +
              "</th><td>" +
              Number(zone.available || 0) +
              "</td><td>" +
              Number(zone.occupied || 0) +
              "</td><td>" +
              Number(zone.total || 0) +
              "</td><td><strong>" +
              Number(zone.total || 0) +
              "</strong></td></tr>"
            );
          })
          .join("") || '<tr><td colspan="5">No zone data available.</td></tr>';
  }
  function renderConversations(rows) {
    state.conversations = rows;
    var list = document.querySelector(".conversation-list");
    if (!list) return;
    list.innerHTML =
      rows
        .map(function (row, index) {
          return (
            '<li><a class="conversation-item' +
            (index === 0 ? " is-active" : "") +
            '" data-action="conversation" data-user-id="' +
            row.id +
            '" href="#messages"><span class="conversation-item__avatar"><span class="avatar">' +
            esc(initials(row.full_name)) +
            '</span></span><span class="conversation-item__body"><span class="conversation-item__name"><strong>' +
            esc(row.full_name) +
            "</strong><time>" +
            esc(time(row.last_at)) +
            "</time></span><p>" +
            esc(row.last_body || "") +
            "</p></span>" +
            (Number(row.unread)
              ? '<span class="conversation-item__unread">' +
                row.unread +
                "</span>"
              : "") +
            "</a></li>"
          );
        })
        .join("") || "<li>No driver conversations yet.</li>";
    if (rows.length) selectConversation(rows[0]);
  }
  function selectConversation(person) {
    state.recipient = person;
    document.querySelectorAll(".conversation-item").forEach(function (item) {
      item.classList.toggle(
        "is-active",
        String(item.dataset.userId) === String(person.id),
      );
    });
    var heading = document.querySelector(".chat-person__text strong");
    if (heading) heading.textContent = person.full_name;
    var input = document.getElementById("manager-message");
    if (input)
      input.placeholder = "Message " + person.full_name.split(/\s+/)[0] + "…";
    api
      .request("manager/messages?other_user_id=" + person.id)
      .then(renderMessages)
      .catch(function (error) {
        ui.toast(error.message, "warning");
      });
  }
  function renderMessages(data) {
    var area = document.querySelector(".chat-messages");
    if (!area) return;
    area.innerHTML =
      (data.messages || [])
        .map(function (row) {
          var outgoing =
            state.recipient &&
            String(row.recipient_user_id) === String(state.recipient.id);
          return (
            '<div class="chat-message' +
            (outgoing ? " chat-message--outgoing" : "") +
            '"><p class="chat-message__bubble">' +
            esc(row.body) +
            "</p><time>" +
            esc(time(row.created_at)) +
            "</time></div>"
          );
        })
        .join("") || '<span class="chat-date">Start the conversation</span>';
    area.scrollTop = area.scrollHeight;
  }
  function prepareOtp(reservation, purpose) {
    var modal = document.getElementById(
      purpose === "check_in" ? "otp-checkin" : "otp-checkout",
    );
    if (!modal) return;
    state.selectedQueue = reservation || null;
    var title = modal.querySelector(".modal__title-group p"),
      codeInput = modal.querySelector('[name="reservation-code"]');
    if (reservation) {
      if (title)
        title.textContent =
          "Reservation #" +
          reservation.reservation_code +
          " · Space " +
          (reservation.space_code || "—");
      if (codeInput) codeInput.value = reservation.reservation_code;
      var driver = modal.querySelector(".otp-driver-summary");
      if (driver)
        driver.querySelector("strong").textContent = reservation.full_name;
    } else {
      if (title)
        title.textContent =
          "Enter the reservation code and OTP from the driver.";
      if (codeInput) codeInput.value = "";
    }
    modal.querySelectorAll(".otp-inputs input").forEach(function (input) {
      input.value = "";
    });
    ui.openModal(modal);
  }
  function load() {
    return Promise.all([
      api.request("manager/dashboard"),
      api.request("manager/reservations"),
      api.request("manager/spaces"),
      api.request("manager/verification"),
      api.request("manager/violations"),
      api.request("manager/issues"),
      api.request("manager/report"),
      api.request("manager/conversations"),
    ]).then(function (data) {
      renderDashboard(data[0]);
      renderReservations(data[1].reservations);
      renderSpaces(data[2].spaces);
      renderQueue(data[3].queue);
      renderViolations(data[4].violations);
      renderDriverIssues(data[5].issues);
      renderReport(data[6]);
      renderConversations(data[7].conversations);
    });
  }
  function refresh(message) {
    return load().then(function () {
      if (message) ui.toast(message);
    });
  }

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target.closest(
        "[data-action], [data-report-download]",
      );
      if (!target) return;
      var action = target.dataset.action;
      if (target.hasAttribute("data-report-download")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var report = state.report || {},
          summary = report.summary || {};
        ui.createPdf(
          "ParkFlow Area Operations Report",
          [
            "Location: " +
              ((report.location || {}).name || "Assigned location"),
            "Reservations: " + (summary.reservations || 0),
            "Revenue processed: " + money(summary.revenue),
            "Violations: " + ((report.violations || {}).total || 0),
            "Open violations: " + ((report.violations || {}).open_total || 0),
          ],
          "parkflow-area-operations-report.pdf",
        );
        return;
      }
      if (!action) return;
      if (action === "reservation-details") {
        event.preventDefault();
        event.stopImmediatePropagation();
        var reservationRow = target.closest("tr");
        if (reservationRow && reservationRow.dataset.reservationId)
          openReservationDetails(reservationRow.dataset.reservationId);
        return;
      }
      if (action === "queue-reservation") {
        event.preventDefault();
        event.stopImmediatePropagation();
        var id =
          target.closest("[data-queue-id], tr")?.dataset.queueId ||
          target.closest("tr")?.dataset.reservationId;
        var reservation =
          state.queue.filter(function (row) {
            return String(row.id) === String(id);
          })[0] ||
          state.reservations.filter(function (row) {
            return String(row.id) === String(id);
          })[0];
        prepareOtp(reservation, target.dataset.purpose);
        return;
      }
      if (action === "manual-otp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        prepareOtp(null, target.dataset.purpose || "check_in");
        return;
      }
      if (action === "open-space-update") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!state.selectedSpace)
          return ui.toast("Select a live space before updating it.", "warning");
        openSpaceUpdate();
        return;
      }
      if (action === "manager-profile") {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderProfile(state.profile);
        ui.openModal(document.getElementById("manager-profile"));
        return;
      }
      if (action === "signout") {
        event.preventDefault();
        event.stopImmediatePropagation();
        api.logout().finally(function () {
          window.location.href = "login.html?account=manager";
        });
        return;
      }
      if (action === "notifications-read") {
        event.preventDefault();
        api
          .request("notifications/read", { method: "POST", body: {} })
          .then(function () {
            return loadNotifications();
          })
          .then(function () {
            ui.toast("Notifications marked as read.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
        return;
      }
      if (action === "notification-read") {
        event.preventDefault();
        var notificationLink = target.dataset.link || "#overview";
        api
          .request("notifications/" + target.dataset.notificationId + "/read", {
            method: "POST",
            body: {},
          })
          .then(function () {
            window.location.hash = notificationLink;
            return loadNotifications();
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
        return;
      }
      if (action === "review-driver-issue") {
        event.preventDefault();
        state.selectedIssue = state.issues.filter(function (row) {
          return (
            String(row.id) === String(target.closest("tr").dataset.issueId)
          );
        })[0];
        openDriverIssue();
        return;
      }
      if (action === "review-violation") {
        event.preventDefault();
        state.selectedViolation = state.violations.filter(function (row) {
          return (
            String(row.id) === String(target.closest("tr").dataset.violationId)
          );
        })[0];
        openViolation();
        return;
      }
      if (action === "review-reservation") {
        event.preventDefault();
        var record = state.reservations.filter(function (row) {
          return (
            String(row.id) ===
            String(target.closest("tr").dataset.reservationId)
          );
        })[0];
        state.selectedViolation = state.violations.filter(function (row) {
          return (
            String(row.registration_number) ===
            String(record && record.registration_number)
          );
        })[0];
        if (state.selectedViolation) openViolation();
        else ui.toast("No violation report is attached to this reservation.");
        return;
      }
      if (action === "conversation") {
        event.preventDefault();
        var person = state.conversations.filter(function (row) {
          return String(row.id) === String(target.dataset.userId);
        })[0];
        if (person) selectConversation(person);
        return;
      }
      if (action === "reservation-details") {
        var row = target.closest("tr");
        ui.toast(
          "Reservation " +
            row.cells[0].textContent.trim() +
            " · " +
            row.cells[1].innerText.replace(/\s+/g, " "),
        );
      }
    },
    true,
  );
  function openViolation() {
    var item = state.selectedViolation;
    if (!item) return;
    var modal = document.getElementById("violation-review");
    var title = modal.querySelector(".modal__title-group h2");
    if (title) title.textContent = "Review violation #" + item.violation_code;
    var details = modal.querySelector(".violation-evidence dl");
    if (details)
      details.innerHTML =
        "<div><dt>Driver</dt><dd>" +
        esc(item.full_name || "Unknown") +
        "</dd></div><div><dt>Vehicle</dt><dd>" +
        esc(item.registration_number || "Unknown") +
        "</dd></div><div><dt>Space</dt><dd>" +
        esc(item.space_code || "—") +
        "</dd></div><div><dt>Penalty</dt><dd>" +
        esc(money(item.penalty_amount)) +
        "</dd></div>";
    ui.openModal(modal);
  }
  function openDriverIssue() {
    var item = state.selectedIssue,
      modal = document.getElementById("driver-issue-review");
    if (!item || !modal) return;
    var title = document.getElementById("driver-issue-review-title"),
      details = document.getElementById("driver-issue-details"),
      note = document.getElementById("driver-issue-note");
    if (title) title.textContent = "Review driver report #" + item.ticket_code;
    if (details)
      details.innerHTML =
        "<dl><div><dt>Driver</dt><dd>" +
        esc(item.driver_name) +
        "</dd></div><div><dt>Vehicle</dt><dd>" +
        esc(item.registration_number || "Not provided") +
        "</dd></div><div><dt>Reservation</dt><dd>" +
        esc(
          item.reservation_code ? "#" + item.reservation_code : "Not linked",
        ) +
        "</dd></div><div><dt>Issue</dt><dd>" +
        esc(item.description) +
        "</dd></div></dl>";
    if (note) note.value = "";
    ui.openModal(modal);
  }
  function openSpaceUpdate() {
    var modal = document.getElementById("update-space");
    if (!modal || !state.selectedSpace) return;
    var title = document.getElementById("update-space-title"),
      description = modal.querySelector(".modal__title-group p"),
      current =
        state.selectedSpace.status === "available"
          ? "free"
          : state.selectedSpace.status;
    if (title)
      title.textContent = "Update space " + state.selectedSpace.space_code;
    if (description)
      description.textContent =
        "Current status: " +
        current.replace(/_/g, " ") +
        " · Zone " +
        state.selectedSpace.zone_code;
    Array.prototype.forEach.call(
      modal.querySelectorAll('input[name="space-status"]'),
      function (input) {
        input.checked =
          input
            .closest("label")
            .querySelector("strong")
            .textContent.trim()
            .toLowerCase() === current;
      },
    );
    ui.openModal(modal);
  }
  document.addEventListener(
    "click",
    function (event) {
      var space = event.target.closest(".parking-space");
      if (!space) return;
      state.selectedSpace = state.spaces.filter(function (row) {
        return String(row.id) === String(space.dataset.spaceId);
      })[0];
      document.querySelectorAll(".parking-space").forEach(function (item) {
        item.classList.toggle("is-selected", item === space);
      });
    },
    true,
  );
  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (form.closest("#update-space")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!state.selectedSpace)
          return ui.toast("Select a live space first.", "warning");
        var chosen = form.querySelector('input[name="space-status"]:checked');
        var status = chosen
          ? chosen
              .closest("label")
              .querySelector("strong")
              .textContent.trim()
              .toLowerCase()
          : "";
        api
          .request("manager/spaces/" + state.selectedSpace.id, {
            method: "PATCH",
            body: {
              status: status,
              note: document.getElementById("space-note").value.trim(),
            },
          })
          .then(function () {
            ui.closeModal(document.getElementById("update-space"));
            return refresh("Space status saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (
        form.closest("#otp-checkin") ||
        form.closest("#otp-checkout")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var modal = form.closest(".modal"),
          purpose = modal.id === "otp-checkin" ? "check_in" : "check_out",
          otp = Array.prototype.map
            .call(form.querySelectorAll(".otp-inputs input"), function (input) {
              return input.value;
            })
            .join(""),
          codeInput = form.querySelector('[name="reservation-code"]'),
          reservationCode = (
            (codeInput && codeInput.value) ||
            (state.selectedQueue || {}).reservation_code ||
            ""
          )
            .trim()
            .replace(/^#/, "")
            .toUpperCase();
        if (!reservationCode)
          return ui.toast("Enter the reservation code first.", "warning");
        api
          .request(
            purpose === "check_in" ? "manager/check-in" : "manager/check-out",
            {
              method: "POST",
              body: { reservation_code: reservationCode, otp: otp },
            },
          )
          .then(function () {
            ui.closeModal(modal);
            state.selectedQueue = null;
            return refresh(
              purpose === "check_in"
                ? "Check-in recorded."
                : "Check-out completed.",
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.matches("#driver-issue-review-form")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!state.selectedIssue || !form.checkValidity())
          return form.reportValidity();
        var decision = document.getElementById("driver-issue-decision").value,
          note = document.getElementById("driver-issue-note").value.trim();
        api
          .request("manager/issues/" + state.selectedIssue.id + "/review", {
            method: "POST",
            body: { action: decision, note: note },
          })
          .then(function (result) {
            ui.closeModal(document.getElementById("driver-issue-review"));
            state.selectedIssue = null;
            return refresh(
              decision === "forward"
                ? "Report forwarded to the administrator as " +
                    result.violation_code +
                    "."
                : "Driver report review saved.",
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.matches("#manager-profile-form")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        api
          .request("manager/profile", {
            method: "PUT",
            body: {
              full_name: document
                .getElementById("manager-profile-name")
                .value.trim(),
              phone: document
                .getElementById("manager-profile-phone")
                .value.trim(),
            },
          })
          .then(function () {
            return api.request("manager/profile");
          })
          .then(function (data) {
            renderProfile(data.profile);
            ui.closeModal(document.getElementById("manager-profile"));
            ui.toast("Profile saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.matches(".chat-composer")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var message = document.getElementById("manager-message");
        if (!state.recipient)
          return ui.toast("Select a driver conversation first.", "warning");
        if (!message.value.trim())
          return ui.toast("Write a message before sending.", "warning");
        api
          .request("manager/messages", {
            method: "POST",
            body: {
              recipient_user_id: state.recipient.id,
              body: message.value.trim(),
            },
          })
          .then(function () {
            message.value = "";
            return selectConversation(state.recipient);
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      }
    },
    true,
  );
  document.addEventListener(
    "click",
    function (event) {
      var resolve = event.target.closest(
        "#violation-review .modal__footer button",
      );
      if (!resolve) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!state.selectedViolation) return;
      var decision = document.getElementById("violation-action").value,
        note = document.getElementById("violation-note").value.trim();
      api
        .request(
          "manager/violations/" + state.selectedViolation.id + "/resolve",
          {
            method: "POST",
            body: {
              status: /^Dismiss/i.test(decision) ? "dismissed" : "resolved",
              note: note || decision,
            },
          },
        )
        .then(function () {
          ui.closeModal(document.getElementById("violation-review"));
          return refresh("Violation resolution saved.");
        })
        .catch(function (error) {
          ui.toast(error.message, "warning");
        });
    },
    true,
  );
  document.querySelectorAll("#reports button").forEach(function (button) {
    if (/print/i.test(button.textContent))
      button.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.print();
        },
        true,
      );
  });
  document
    .querySelectorAll('a[href="#otp-checkin"], a[href="#otp-checkout"]')
    .forEach(function (link) {
      if (link.dataset.action) return;
      link.addEventListener(
        "click",
        function () {
          var purpose =
            link.getAttribute("href") === "#otp-checkin"
              ? "check_in"
              : "check_out";
          prepareOtp(
            state.queue.filter(function (row) {
              return row.purpose === purpose;
            })[0],
            purpose,
          );
        },
        true,
      );
    });
  document.querySelectorAll('a[href="#update-space"]').forEach(function (link) {
    link.addEventListener(
      "click",
      function (event) {
        if (!state.selectedSpace) {
          event.preventDefault();
          event.stopImmediatePropagation();
          ui.toast("Select a live space before updating it.", "warning");
          return;
        }
        var title = document.getElementById("update-space-title");
        if (title)
          title.textContent = "Update space " + state.selectedSpace.space_code;
        var selected = document.querySelector(
          '#update-space input[name="space-status"]:checked',
        );
        if (selected) selected.checked = false;
        var option = Array.prototype.find.call(
          document.querySelectorAll('#update-space input[name="space-status"]'),
          function (input) {
            return (
              input
                .closest("label")
                .querySelector("strong")
                .textContent.trim()
                .toLowerCase() ===
              (state.selectedSpace.status === "available"
                ? "free"
                : state.selectedSpace.status)
            );
          },
        );
        if (option) option.checked = true;
      },
      true,
    );
  });
  document.querySelectorAll("#reports a").forEach(function (link) {
    if (
      /generate pdf report/i.test(link.textContent) &&
      !link.hasAttribute("data-report-download")
    )
      link.setAttribute("data-report-download", "");
  });
  document
    .querySelectorAll('.profile-popover a[href="index.html"]')
    .forEach(function (link) {
      link.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          api.logout().finally(function () {
            window.location.href = "index.html";
          });
        },
        true,
      );
    });
  document.addEventListener(
    "click",
    function (event) {
      var reservationTab = event.target.closest(
        "#reservations .segmented-control button",
      );
      if (reservationTab) {
        event.preventDefault();
        state.reservationFilter = /^upcoming/i.test(reservationTab.textContent)
          ? "upcoming"
          : /^active/i.test(reservationTab.textContent)
            ? "active"
            : "all";
        reservationTab.parentElement
          .querySelectorAll("button")
          .forEach(function (button) {
            button.classList.toggle("is-active", button === reservationTab);
          });
        renderReservations(state.reservations);
        return;
      }
      var violationTab = event.target.closest(
        "#violations .segmented-control button",
      );
      if (violationTab) {
        event.preventDefault();
        state.violationFilter = /^resolved/i.test(violationTab.textContent)
          ? "resolved"
          : "open";
        violationTab.parentElement
          .querySelectorAll("button")
          .forEach(function (button) {
            button.classList.toggle("is-active", button === violationTab);
          });
        renderViolations(state.violations);
        return;
      }
      var zoneTab = event.target.closest(".parking-zone-tabs button");
      if (zoneTab) {
        event.preventDefault();
        var label = zoneTab.textContent.trim(),
          code = /^EV/i.test(label)
            ? "EV"
            : (label.match(/Zone\s+([^\s]+)/i) || [
                null,
                label.split(/\s+/)[0],
              ])[1];
        zoneTab.parentElement
          .querySelectorAll("button")
          .forEach(function (button) {
            button.classList.toggle("is-active", button === zoneTab);
          });
        document
          .querySelectorAll(".parking-floor .parking-lane")
          .forEach(function (lane) {
            lane.hidden =
              lane.querySelector(".parking-row-label").textContent.trim() !==
              code;
          });
        return;
      }
    },
    true,
  );
  var managerSearch = document.getElementById("manager-search");
  if (managerSearch)
    managerSearch.addEventListener("input", function () {
      state.reservationQuery = managerSearch.value.trim();
      renderReservations(state.reservations);
      if (window.ParkFlowManagerNavigation)
        window.ParkFlowManagerNavigation.show("reservations");
    });
  var conversationSearch = document.getElementById("conversation-search");
  if (conversationSearch)
    conversationSearch.addEventListener("input", function () {
      var query = conversationSearch.value.toLowerCase();
      document.querySelectorAll(".conversation-item").forEach(function (item) {
        item.closest("li").hidden =
          item.textContent.toLowerCase().indexOf(query) < 0;
      });
    });
  guard()
    .then(load)
    .then(loadNotifications)
    .catch(function (error) {
      if (error && error.message !== "Sign in required.")
        ui.toast(error.message, "warning");
    });
})();
