/* Live driver portal backed by the signed-in PHP session. */
(function () {
  "use strict";
  var api = window.ParkFlowAPI,
    ui = window.ParkFlowUI;
  if (!api || !ui || !document.body.classList.contains("driver-portal")) return;
  var state = {
    profile: null,
    vehicles: [],
    locations: [],
    zones: [],
    reservations: [],
    spaces: [],
    selectedSpace: null,
    recipient: null,
    receipt: null,
    quote: null,
    quoteRequest: 0,
    historyPage: 1,
  };
  var esc = function (value) {
    var node = document.createElement("span");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  };
  var money = function (value) {
    return (
      "BDT " +
      Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
    );
  };
  var asDate = function (value) {
    return new Date(String(value || "").replace(" ", "T"));
  };
  var time = function (value) {
    var date = asDate(value);
    return isNaN(date)
      ? "—"
      : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  var date = function (value) {
    var parsed = asDate(value);
    return isNaN(parsed) ? "—" : parsed.toLocaleDateString();
  };
  var badge = function (value) {
    var text = String(value || "unknown").replace(/_/g, " ");
    var style = /completed|confirmed|active|available/i.test(text)
      ? "success"
      : /waiting|pending|review/i.test(text)
        ? "warning"
        : /cancel|failed|expired/i.test(text)
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
  var locationSelect = function () {
    return document.getElementById("reservation-location");
  };
  var zoneSelect = function () {
    return document.getElementById("reservation-zone");
  };
  var reservationForm = function () {
    return document.querySelector(".reservation-form");
  };
  var show = function (route) {
    if (window.ParkFlowDriverNavigation)
      window.ParkFlowDriverNavigation.show(route);
  };
  var today = function () {
    var now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0")
    );
  };
  var duration = function (row) {
    var ms = asDate(row.ends_at) - asDate(row.starts_at);
    return isNaN(ms) ? "—" : Math.max(1, Math.round(ms / 3600000)) + "h 00m";
  };

  function guard() {
    return api.me().then(function (result) {
      if (!result.user || result.user.role !== "driver") {
        window.location.href = "login.html";
        throw new Error("Sign in required.");
      }
      document.querySelectorAll(".driver-name").forEach(function (item) {
        item.textContent = result.user.full_name;
      });
      var greeting = document.getElementById("driver-overview-title");
      if (greeting)
        greeting.textContent =
          "Welcome, " + result.user.full_name.split(/\s+/)[0];
    });
  }
  function setProfile(profile) {
    state.profile = profile;
    var form = document.getElementById("driver-profile-form");
    if (!form) return;
    form.elements.name.value = profile.full_name || "";
    form.elements.email.value = profile.email || "";
    form.elements.phone.value = profile.phone || "";
    form.elements.city.value = profile.city || "";
    form.elements.emergencyContact.value = profile.emergency_contact || "";
    form.elements.language.value = profile.preferred_language || "English";
    form.elements.updates.checked = Number(profile.receive_updates) === 1;
    document.querySelectorAll(".driver-name").forEach(function (item) {
      item.textContent = profile.full_name || "";
    });
  }
  function renderVehicles(rows) {
    state.vehicles = rows;
    var choices =
      reservationForm() && reservationForm().querySelector(".vehicle-options");
    if (choices) {
      var add = choices.querySelector('[data-action="add-vehicle"]');
      choices.querySelectorAll("label").forEach(function (item) {
        item.remove();
      });
      rows.forEach(function (vehicle, index) {
        var label = document.createElement("label");
        label.innerHTML =
          '<input type="radio" name="vehicle" value="' +
          vehicle.id +
          '" ' +
          (Number(vehicle.is_primary) || index === 0 ? "checked" : "") +
          '><span class="vehicle-option"><i>Car</i><span><strong>' +
          esc(vehicle.make_model) +
          "</strong><small>" +
          esc(vehicle.registration_number) +
          "</small></span><em>✓</em></span>";
        choices.insertBefore(label, add);
      });
    }
    var grid = document.querySelector(".driver-vehicle-grid");
    if (!grid) return;
    var addCard = grid.querySelector(".driver-vehicle-add");
    grid.querySelectorAll(".driver-vehicle-card").forEach(function (item) {
      item.remove();
    });
    rows.forEach(function (vehicle) {
      var card = document.createElement("article");
      card.className =
        "driver-vehicle-card" +
        (Number(vehicle.is_primary) ? " driver-vehicle-card--primary" : "");
      card.dataset.vehicleId = vehicle.id;
      card.innerHTML =
        '<header><span class="driver-vehicle-card__icon">Car</span>' +
        badge(Number(vehicle.is_primary) ? "Primary" : "Vehicle") +
        "</header><div><h3>" +
        esc(vehicle.make_model) +
        "</h3><p>" +
        esc(vehicle.vehicle_year) +
        " · " +
        esc(vehicle.color || "Color not set") +
        " · " +
        esc(String(vehicle.vehicle_type).replace(/_/g, " ")) +
        '</p></div><strong class="driver-vehicle-card__plate">' +
        esc(vehicle.registration_number) +
        "</strong><dl><div><dt>Powertrain</dt><dd>" +
        esc(vehicle.powertrain || "petrol") +
        "</dd></div><div><dt>Type</dt><dd>" +
        esc(String(vehicle.vehicle_type).replace(/_/g, " ")) +
        '</dd></div><div><dt>Status</dt><dd class="text-success">Verified</dd></div></dl><footer><span>Available for reservations</span><span><button class="btn btn--secondary btn--sm" data-action="vehicle-edit" type="button">Edit</button>' +
        (Number(vehicle.is_primary)
          ? ""
          : '<button class="btn btn--outline btn--sm" data-action="vehicle-primary" type="button">Set primary</button>') +
        "</span></footer>";
      grid.insertBefore(card, addCard);
    });
  }
  function renderLocations(rows) {
    state.locations = rows;
    var select = locationSelect(),
      selected = select && select.value;
    if (select) {
      var available = rows.filter(function (row) {
          return Number(row.available_spaces || 0) > 0;
        }),
        current = rows.filter(function (row) {
          return (
            String(row.id) === String(selected) &&
            Number(row.available_spaces || 0) > 0
          );
        })[0],
        preferred = current || available[0] || rows[0];
      select.innerHTML = rows
        .map(function (row) {
          return (
            '<option value="' +
            row.id +
            '">' +
            esc(row.name) +
            " — " +
            money(row.base_hourly_rate) +
            "/hr (" +
            Number(row.available_spaces || 0) +
            " free)</option>"
          );
        })
        .join("");
      select.value = preferred ? preferred.id : "";
    }
    var results = document.querySelector(".driver-map-results");
    if (results) {
      results.querySelectorAll(".map-result").forEach(function (item) {
        item.remove();
      });
      rows.forEach(function (row, index) {
        var item = document.createElement("article");
        item.className = "map-result" + (index === 0 ? " is-selected" : "");
        item.dataset.locationId = row.id;
        item.innerHTML =
          '<span class="map-result__mark">P</span><div><h3>' +
          esc(row.name) +
          "</h3><p>" +
          esc(row.address) +
          "</p>" +
          badge(Number(row.available_spaces || 0) + " available") +
          "</div><div><strong>" +
          money(row.base_hourly_rate) +
          '</strong><small>/hr</small><a data-action="choose-location" href="#reservation">Select</a></div>';
        results.appendChild(item);
      });
      var total = results.querySelector("header strong");
      if (total) total.textContent = rows.length + " locations";
    }
    var nearby = document.querySelector(".nearby-list");
    if (nearby)
      nearby.innerHTML = rows
        .slice(0, 3)
        .map(function (row) {
          return (
            '<article class="nearby-item"><span class="nearby-item__visual">P</span><div class="nearby-item__body"><h3>' +
            esc(row.name) +
            "</h3><p>" +
            esc(row.address) +
            "</p>" +
            badge(Number(row.available_spaces || 0) + " spaces") +
            '</div><div class="nearby-item__price"><strong>' +
            money(row.base_hourly_rate) +
            '</strong><span>/hour</span><a class="btn btn--outline btn--sm" data-action="choose-location" data-location-id="' +
            row.id +
            '" href="#reservation">Reserve</a></div></article>'
          );
        })
        .join("");
    document
      .querySelectorAll(".driver-map-pin[data-location-index]")
      .forEach(function (pin) {
        var row = rows[Number(pin.dataset.locationIndex)];
        pin.hidden = !row;
        if (row) {
          pin.dataset.locationId = row.id;
          pin.querySelector("strong").textContent = money(row.base_hourly_rate);
          pin.querySelector("small").textContent =
            Number(row.available_spaces || 0) + " free";
        }
      });
    updateReservationSummary();
  }
  function renderSpaces(rows) {
    state.spaces = rows;
    state.selectedSpace = null;
    var grid =
      reservationForm() && reservationForm().querySelector(".slot-grid");
    if (!grid) return;
    grid.innerHTML =
      rows
        .map(function (space) {
          return (
            '<button class="slot-button slot-button--free" data-space-id="' +
            space.id +
            '" data-slot="' +
            esc(space.space_code) +
            '" type="button" aria-pressed="false"><strong>' +
            esc(space.space_code) +
            "</strong><small>Free</small></button>"
          );
        })
        .join("") ||
      "<p>No free spaces are currently available at this location.</p>";
    updateReservationSummary();
  }
  function renderZones(rows) {
    state.zones = rows;
    var select = zoneSelect();
    if (!select) return;
    var current = select.value;
    select.innerHTML =
      '<option value="">Select a parking zone</option>' +
      rows
        .map(function (zone) {
          var title = zone.name || "Zone " + zone.code;
          if (zone.floor_label) title += " · " + zone.floor_label;
          return (
            '<option value="' +
            zone.id +
            '">' +
            esc(title) +
            " — " +
            Number(zone.available_spaces || 0) +
            " free</option>"
          );
        })
        .join("");
    var selected = rows.filter(function (zone) {
      return String(zone.id) === String(current);
    })[0];
    selected = selected || rows[0];
    select.value = selected ? selected.id : "";
    var label = document.querySelector(
      ".slot-picker__header > div:first-child > strong",
    );
    if (label) {
      label.textContent = selected
        ? selected.name +
          (selected.floor_label ? " · " + selected.floor_label : "")
        : "Select a parking zone";
    }
  }
  function loadZones() {
    var select = locationSelect();
    if (!select || !select.value) {
      renderZones([]);
      return Promise.resolve();
    }
    return api
      .request("driver/zones?location_id=" + select.value)
      .then(function (result) {
        renderZones(result.zones);
      });
  }
  function renderActiveBooking(row) {
    document
      .querySelectorAll("[data-active-booking-card]")
      .forEach(function (card) {
        card.hidden = !row;
        if (!row) return;
        card.dataset.reservationId = row.id;
        card.dataset.reservationStatus = row.status;
        var status = card.querySelector(".active-booking-card__status");
        if (status)
          status.innerHTML =
            '<span class="live-dot"></span>' +
            esc(String(row.status).replace(/_/g, " "));
        var booking = card.querySelector(
          ".active-booking-card__header > span:last-child",
        );
        if (booking) booking.textContent = "Booking #" + row.reservation_code;
        card.querySelector(".booking-location h2").textContent =
          row.location_name;
        var details = card.querySelectorAll(".booking-details dd");
        if (details.length >= 4) {
          details[0].textContent = date(row.starts_at);
          details[1].textContent =
            time(row.starts_at) + "–" + time(row.ends_at);
          details[2].textContent = row.space_code || "—";
          details[3].textContent = row.registration_number;
        }
        var checkout = row.status === "active",
          otp = card.querySelector(".booking-otp strong"),
          otpLabel = card.querySelector(".booking-otp__label"),
          otpHint = card.querySelector(".booking-otp small"),
          otpButton = card.querySelector('[data-action="refresh-otp"]'),
          cancelButton = card.querySelector('[data-action="cancel-booking"]');
        if (otp)
          otp.innerHTML =
            "<span>•</span><span>•</span><span>•</span><span>•</span>";
        if (otpLabel)
          otpLabel.lastChild.textContent = checkout
            ? "Check-out OTP"
            : "Check-in OTP";
        if (otpHint)
          otpHint.textContent = checkout
            ? "Show this code to the parking manager when you leave."
            : "Show this code to the parking manager or enter it at Gate 1.";
        if (otpButton)
          otpButton.textContent = checkout
            ? "Get check-out OTP"
            : "Get a new OTP";
        if (cancelButton) cancelButton.hidden = checkout;
        var countdown = card.querySelector(".arrival-countdown strong");
        if (countdown)
          countdown.textContent = String(row.status).replace(/_/g, " ");
      });
    document
      .querySelectorAll(
        '.sidebar-nav__link[href="#active-booking"] .sidebar-nav__count',
      )
      .forEach(function (count) {
        count.textContent = row ? "1" : "0";
      });
  }
  function historyRows() {
    var filter = document.getElementById("history-filter"),
      days = Number((filter && filter.value) || 30),
      cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return state.reservations
      .filter(function (row) {
        return asDate(row.starts_at) >= cutoff;
      })
      .sort(function (left, right) {
        var rightUpdated = asDate(
            right.updated_at || right.created_at || right.starts_at,
          ).getTime(),
          leftUpdated = asDate(
            left.updated_at || left.created_at || left.starts_at,
          ).getTime();
        if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;
        return (
          asDate(right.starts_at).getTime() - asDate(left.starts_at).getTime()
        );
      });
  }
  function renderHistory() {
    var rows = historyRows(),
      pageSize = 8,
      totalPages = Math.max(1, Math.ceil(rows.length / pageSize)),
      body = document.querySelector("#history .dashboard-table tbody");
    if (!body) return;
    state.historyPage = Math.min(Math.max(1, state.historyPage), totalPages);
    var first = (state.historyPage - 1) * pageSize,
      visibleRows = rows.slice(first, first + pageSize);
    body.innerHTML =
      visibleRows
        .map(function (row) {
          return (
            '<tr data-reservation-id="' +
            row.id +
            '"><td><strong>#' +
            esc(row.reservation_code) +
            "</strong><br>" +
            badge(row.status) +
            '</td><td><div class="history-location"><span>P</span><div><strong>' +
            esc(row.location_name) +
            "</strong><small>Space " +
            esc(row.space_code || "—") +
            "</small></div></div></td><td><strong>" +
            date(row.starts_at) +
            "</strong><br><small>" +
            time(row.starts_at) +
            "–" +
            time(row.ends_at) +
            "</small></td><td>" +
            duration(row) +
            "</td><td>" +
            esc(row.registration_number) +
            "</td><td><strong>" +
            money(row.total_amount) +
            '</strong></td><td><button class="btn btn--outline btn--sm" data-action="receipt" type="button">Receipt PDF</button></td></tr>'
          );
        })
        .join("") ||
      '<tr><td colspan="7">No reservations match this period.</td></tr>';
    var stats = document.querySelectorAll(".history-summary strong");
    if (stats.length >= 3) {
      stats[0].textContent = rows.length;
      stats[1].textContent =
        rows.reduce(function (total, row) {
          return (
            total + Math.max(0, asDate(row.ends_at) - asDate(row.starts_at))
          );
        }, 0) /
          3600000 +
        "h";
      stats[2].textContent = money(
        rows.reduce(function (total, row) {
          return total + Number(row.total_amount || 0);
        }, 0),
      );
    }
    var page = document.querySelector("#history .table-pagination > span");
    if (page)
      page.textContent = rows.length
        ? "Showing " +
          (first + 1) +
          "–" +
          Math.min(first + pageSize, rows.length) +
          " of " +
          rows.length +
          " live reservations"
        : "No reservations in this period";
    var pager = document.querySelector("#history .pagination");
    if (pager) {
      var links =
        '<a class="pagination__item' +
        (state.historyPage === 1 ? " is-disabled" : "") +
        '" data-action="history-page" data-page="' +
        (state.historyPage - 1) +
        '" href="#history" aria-label="Previous page">‹</a>';
      for (var number = 1; number <= totalPages; number += 1)
        links +=
          '<a class="pagination__item" data-action="history-page" data-page="' +
          number +
          '" href="#history"' +
          (number === state.historyPage ? ' aria-current="page"' : "") +
          ">" +
          number +
          "</a>";
      pager.innerHTML =
        links +
        '<a class="pagination__item' +
        (state.historyPage === totalPages ? " is-disabled" : "") +
        '" data-action="history-page" data-page="' +
        (state.historyPage + 1) +
        '" href="#history" aria-label="Next page">›</a>';
    }
  }
  function renderReservations(rows) {
    state.reservations = rows;
    renderActiveBooking(
      rows.filter(function (row) {
        return (
          ["confirmed", "waiting_check_in", "active"].indexOf(row.status) >= 0
        );
      })[0],
    );
    renderHistory();
    updateIssueReservations();
  }
  function updateIssueReservations() {
    var select = document.getElementById("issue-reservation");
    if (!select) return;
    select.innerHTML =
      '<option value="">Not related to a reservation</option>' +
      state.reservations
        .map(function (row) {
          return (
            '<option value="' +
            row.id +
            '">#' +
            esc(row.reservation_code) +
            " · " +
            esc(row.location_name) +
            "</option>"
          );
        })
        .join("");
  }
  function renderIssues(rows) {
    var box = document.querySelector(".issue-tracker");
    if (box)
      box.innerHTML =
        rows
          .map(function (row) {
            return (
              '<article class="issue-ticket" data-issue-id="' +
              row.id +
              '"><header><span><strong>#' +
              esc(row.ticket_code) +
              "</strong><small>" +
              esc(row.location_name || "ParkFlow") +
              "</small></span>" +
              badge(row.status) +
              "</header><h4>" +
              esc(String(row.category).replace(/_/g, " ")) +
              "</h4><p>" +
              esc(row.description) +
              "</p><footer><span>Submitted " +
              date(row.reported_at) +
              '</span><button data-action="issue-details" type="button">View details</button></footer></article>'
            );
          })
          .join("") || "<p>No issues reported.</p>";
  }
  function renderNotifications(data) {
    var items = data.notifications || [],
      list = document.querySelector(
        '.topbar-popover[aria-label="Driver notifications"] .notification-list',
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
            esc(
              new Date(
                String(item.created_at).replace(" ", "T"),
              ).toLocaleString(),
            ) +
            "</time></span>" +
            (item.read_at
              ? ""
              : '<span class="notification-item__unread"></span>') +
            "</a>"
          );
        })
        .join("") || '<p class="text-muted">No notifications yet.</p>';
    document
      .querySelectorAll(".topbar-icon__dot, .dashboard-fab__dot")
      .forEach(function (dot) {
        dot.hidden = !data.unread_count;
      });
  }
  function loadNotifications() {
    return api
      .request("notifications")
      .then(renderNotifications)
      .catch(function () {
        /* A notification failure must not block the portal. */
      });
  }
  function setChatHeader(person) {
    var name = document.querySelector(".chat-person__text strong"),
      subtitle = document.querySelector(".chat-person__text small");
    if (name) name.textContent = person.full_name;
    if (subtitle) subtitle.textContent = "Live support conversation";
  }
  function loadMessages(person) {
    state.recipient = person;
    setChatHeader(person);
    document.querySelectorAll(".conversation-item").forEach(function (item) {
      item.classList.toggle(
        "is-active",
        String(item.dataset.userId) === String(person.id),
      );
    });
    return api
      .request("driver/messages?other_user_id=" + person.id)
      .then(function (data) {
        var box = document.querySelector(".chat-messages");
        if (box)
          box.innerHTML =
            (data.messages || [])
              .map(function (message) {
                return (
                  '<div class="chat-message' +
                  (String(message.sender_user_id) !== String(person.id)
                    ? " chat-message--outgoing"
                    : "") +
                  '"><p class="chat-message__bubble">' +
                  esc(message.body) +
                  "</p><time>" +
                  time(message.created_at) +
                  "</time></div>"
                );
              })
              .join("") ||
            '<span class="chat-date">Start the conversation</span>';
      });
  }
  function mergeConversationContacts(conversations, managers) {
    var known = {};
    (conversations || []).forEach(function (row) {
      known[String(row.id)] = true;
    });
    return (conversations || []).concat(
      (managers || [])
        .filter(function (manager) {
          return !known[String(manager.id)];
        })
        .map(function (manager) {
          return {
            id: manager.id,
            full_name: manager.full_name,
            last_at: null,
            last_body: manager.locations
              ? "Parking manager · " + manager.locations
              : "Available parking manager",
            unread: 0,
          };
        }),
    );
  }
  function renderConversations(rows) {
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
            '" data-user-name="' +
            esc(row.full_name) +
            '" href="#messages"><span class="conversation-item__avatar"><span class="avatar">' +
            esc(
              row.full_name
                .split(/\s+/)
                .map(function (part) {
                  return part[0];
                })
                .join("")
                .slice(0, 2),
            ) +
            '</span></span><span class="conversation-item__body"><span class="conversation-item__name"><strong>' +
            esc(row.full_name) +
            "</strong><time>" +
            time(row.last_at) +
            "</time></span><p>" +
            esc(row.last_body || "") +
            "</p></span></a></li>"
          );
        })
        .join("") || "<li>No conversations yet.</li>";
    if (rows[0]) loadMessages(rows[0]);
  }
  function loadSpaces() {
    var select = locationSelect(),
      zone = zoneSelect();
    if (!select || !select.value) return Promise.resolve();
    var query =
      "driver/spaces?location_id=" +
      encodeURIComponent(select.value) +
      (zone && zone.value ? "&zone_id=" + encodeURIComponent(zone.value) : "");
    return api
      .request(query)
      .then(function (result) {
        renderSpaces(result.spaces);
      });
  }
  function updateReservationSummary() {
    var select = locationSelect(),
      selected = state.locations.filter(function (row) {
        return select && String(row.id) === String(select.value);
      })[0],
      form = reservationForm();
    if (!selected || !form) return;
    var hours =
      Array.prototype.indexOf.call(
        form.querySelectorAll('input[name="duration"]'),
        form.querySelector('input[name="duration"]:checked'),
      ) + 1;
    if (hours < 1) hours = 1;
    var start =
        document.getElementById("reservation-date").value +
        "T" +
        document.getElementById("reservation-time").value +
        ":00",
      ends = new Date(new Date(start).getTime() + hours * 3600000);
    var summary = document.querySelector(".booking-summary");
    if (!summary) return;
    state.quote = null;
    summary.querySelector("h3").textContent = selected.name;
    summary.querySelector("header p").textContent = state.selectedSpace
      ? "Selected space " + state.selectedSpace.code
      : "Select a free parking slot below.";
    var times = summary.querySelectorAll(".booking-summary__timeline strong"),
      dates = summary.querySelectorAll(".booking-summary__timeline p"),
      costs = summary.querySelectorAll(".booking-summary__cost dd");
    if (times.length >= 2) {
      times[0].textContent = time(start);
      times[1].textContent = time(ends);
    }
    if (dates.length >= 2) {
      dates[0].textContent = date(start);
      dates[1].textContent = date(ends);
    }
    var parkingLabel = summary.querySelector(
      ".booking-summary__cost div:first-child dt",
    );
    if (parkingLabel)
      parkingLabel.textContent =
        "Parking · " + hours + (hours === 1 ? " hour" : " hours");
    if (costs.length >= 4) {
      costs[0].textContent = "Calculating…";
      costs[1].textContent = "Calculating…";
      costs[2].textContent = "Included";
      costs[3].textContent = "Calculating…";
    }
    document
      .querySelectorAll(".duration-options label")
      .forEach(function (label) {
        var price = label.querySelector("small");
        if (price) price.textContent = "Calculating…";
      });
    var timelineDuration = summary.querySelector(
      ".booking-summary__timeline em",
    );
    if (timelineDuration)
      timelineDuration.textContent = hours + (hours === 1 ? " hour" : " hours");
    var button = document.getElementById("create-reservation");
    if (button) {
      button.disabled = true;
      button.textContent = "Calculating price…";
    }
    var requestId = ++state.quoteRequest;
    api
      .request(
        "driver/quote?location_id=" +
          encodeURIComponent(selected.id) +
          "&starts_at=" +
          encodeURIComponent(start) +
          "&duration_hours=" +
          hours,
      )
      .then(function (quote) {
        if (requestId !== state.quoteRequest) return;
        state.quote = quote;
        if (costs.length >= 4) {
          costs[0].textContent = money(quote.parking_subtotal);
          costs[1].textContent = money(quote.service_fee);
          costs[3].textContent = money(quote.total_amount);
        }
        document
          .querySelectorAll(".duration-options label")
          .forEach(function (label, index) {
            var price = label.querySelector("small");
            if (price)
              price.textContent = money(Number(quote.hourly_rate) * (index + 1));
          });
        if (button) {
          button.disabled = false;
          button.textContent = "Reserve for " + money(quote.total_amount);
        }
      })
      .catch(function () {
        if (requestId !== state.quoteRequest) return;
        state.quote = null;
        if (costs.length >= 4) {
          costs[0].textContent = "Unavailable";
          costs[1].textContent = "Unavailable";
          costs[3].textContent = "Unavailable";
        }
        if (button) button.textContent = "Price unavailable";
      });
  }
  function showReceipt(row) {
    state.receipt = row;
    var modal = document.getElementById("receipt-preview");
    if (!modal) return;
    modal.querySelector(".modal__title-group p").textContent =
      "Reservation #" + row.reservation_code;
    var fields = modal.querySelectorAll(".receipt-sheet dl dd");
    if (fields.length >= 6) {
      fields[0].textContent = row.location_name;
      fields[1].textContent = row.registration_number;
      fields[2].textContent = row.space_code || "—";
      fields[3].textContent = time(row.starts_at);
      fields[4].textContent = time(row.ends_at);
      fields[5].textContent = duration(row);
    }
    var costs = modal.querySelectorAll(".receipt-sheet__cost strong");
    if (costs.length >= 3) {
      costs[0].textContent = money(
        Number(row.hourly_rate) *
          Math.max(1, Math.round((asDate(row.ends_at) - asDate(row.starts_at)) / 3600000)),
      );
      costs[1].textContent = money(row.service_fee);
      costs[2].textContent = money(row.total_amount);
    }
    ui.openModal(modal);
  }
  function showConfirmation(result) {
    var modal = document.getElementById("reservation-confirmed");
    if (!modal) return;
    var row = state.reservations.filter(function (item) {
        return String(item.id) === String(result.reservation_id);
      })[0],
      ticket = modal.querySelector(".reservation-success__ticket");
    if (row && ticket) {
      modal.querySelector(".reservation-success > p").textContent =
        "Your reservation at " + row.location_name + " is confirmed.";
      var heading = ticket.querySelectorAll("header strong");
      if (heading.length >= 2) {
        heading[0].textContent = "#" + row.reservation_code;
        heading[1].textContent = row.space_code || "—";
      }
      var values = ticket.querySelectorAll("div strong");
      if (values.length >= 3) {
        values[0].textContent = time(row.starts_at);
        values[1].textContent = duration(row);
        values[2].textContent = money(row.total_amount);
      }
      ticket.querySelector("footer strong").textContent = String(
        result.check_in_otp,
      )
        .split("")
        .join(" ");
    }
    ui.openModal(modal);
  }
  function load() {
    return Promise.all([
      api.request("driver/profile"),
      api.request("driver/vehicles"),
      api.request("driver/locations"),
      api.request("driver/reservations"),
      api.request("driver/issues"),
      api.request("driver/conversations"),
      api.request("driver/managers"),
    ]).then(function (data) {
      setProfile(data[0].profile);
      renderVehicles(data[1].vehicles);
      renderLocations(data[2].locations);
      renderReservations(data[3].reservations);
      renderIssues(data[4].issues);
      renderConversations(
        mergeConversationContacts(data[5].conversations, data[6].managers),
      );
      return loadZones().then(loadSpaces);
    });
  }
  function refreshAvailability() {
    return api
      .request("driver/locations")
      .then(function (data) {
        renderLocations(data.locations);
        return state.selectedSpace
          ? null
          : loadZones().then(loadSpaces);
      })
      .catch(function () {
        /* Availability refresh will retry on the next interval. */
      });
  }
  function openDirections() {
    var row = state.reservations.filter(function (item) {
        return (
          ["confirmed", "waiting_check_in", "active"].indexOf(item.status) >= 0
        );
      })[0],
      location =
        row &&
        state.locations.filter(function (item) {
          return String(item.id) === String(row.location_id);
        })[0];
    if (!location) location = state.locations[0];
    if (!location)
      return ui.toast(
        "No parking location is available for directions.",
        "warning",
      );
    window.open(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(location.address + ", Dhaka"),
      "_blank",
      "noopener",
    );
  }
  function editVehicle(id) {
    var vehicle = state.vehicles.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!vehicle) return;
    document.getElementById("edit-vehicle-id").value = vehicle.id;
    document.getElementById("edit-vehicle-make").value =
      vehicle.make_model || "";
    document.getElementById("edit-vehicle-year").value =
      vehicle.vehicle_year || "";
    document.getElementById("edit-vehicle-plate").value =
      vehicle.registration_number || "";
    document.getElementById("edit-vehicle-type").value =
      vehicle.vehicle_type || "sedan";
    document.getElementById("edit-vehicle-color").value = vehicle.color || "";
    document.getElementById("edit-vehicle-fuel").value =
      vehicle.powertrain || "petrol";
    document.getElementById("edit-vehicle-primary").checked =
      Number(vehicle.is_primary) === 1;
    ui.openModal(document.getElementById("edit-driver-vehicle"));
  }

  document.addEventListener(
    "change",
    function (event) {
      if (event.target === locationSelect())
        loadZones()
          .then(loadSpaces)
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      if (event.target === zoneSelect())
        loadSpaces().catch(function (error) {
          ui.toast(error.message, "warning");
        });
      if (event.target.closest(".reservation-form")) updateReservationSummary();
      if (event.target.id === "history-filter") {
        state.historyPage = 1;
        renderHistory();
      }
    },
    true,
  );
  document.addEventListener(
    "click",
    function (event) {
      var slot = event.target.closest(".slot-button[data-space-id]");
      if (slot) {
        event.preventDefault();
        var space = state.spaces.filter(function (item) {
          return String(item.id) === String(slot.dataset.spaceId);
        })[0];
        if (!space) return;
        state.selectedSpace = { id: space.id, code: space.space_code };
        document
          .querySelectorAll(".slot-button[data-space-id]")
          .forEach(function (item) {
            var selected = String(item.dataset.spaceId) === String(space.id);
            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-pressed", String(selected));
          });
        updateReservationSummary();
        return;
      }
      var reserveButton = event.target.closest("#create-reservation");
      if (reserveButton) {
        event.preventDefault();
        var form = reservationForm(),
          selectedVehicle =
            form && form.querySelector('input[name="vehicle"]:checked'),
          locationId = locationSelect() && Number(locationSelect().value),
          hours = form
            ? Array.prototype.indexOf.call(
                form.querySelectorAll('input[name="duration"]'),
                form.querySelector('input[name="duration"]:checked'),
              ) + 1
            : 0,
          starts =
            document.getElementById("reservation-date").value +
            "T" +
            document.getElementById("reservation-time").value +
            ":00";
        if (!locationId || !state.selectedSpace)
          return ui.toast(
            "Choose a free parking space before reserving.",
            "warning",
          );
        if (!selectedVehicle)
          return ui.toast("Choose a vehicle for this reservation.", "warning");
        if (
          !hours ||
          isNaN(new Date(starts)) ||
          new Date(starts).getTime() < Date.now() - 60000
        )
          return ui.toast("Choose a future arrival date and time.", "warning");
        if (!state.quote)
          return ui.toast("Please wait for the final price to load.", "warning");
        var label = reserveButton.textContent;
        reserveButton.disabled = true;
        reserveButton.textContent = "Creating reservation…";
        api
          .request("driver/reservations", {
            method: "POST",
            body: {
              location_id: locationId,
              space_id: state.selectedSpace.id,
              vehicle_id: Number(selectedVehicle.value),
              starts_at: starts,
              duration_hours: hours,
            },
          })
          .then(function (result) {
            return load().then(function () {
              showConfirmation(result);
              ui.toast(
                "Reservation " + result.reservation_code + " confirmed.",
              );
            });
          })
          .catch(function (error) {
            ui.toast(
              error.message || "Unable to create the reservation.",
              "warning",
            );
          })
          .then(function () {
            reserveButton.disabled = !state.quote;
            reserveButton.textContent = state.quote
              ? "Reserve for " + money(state.quote.total_amount)
              : label;
          });
        return;
      }
      var button = event.target.closest("[data-action]");
      if (!button) return;
      var action = button.dataset.action;
      if (action === "choose-location" || action === "map-location") {
        event.preventDefault();
        var id =
          button.dataset.locationId ||
          (button.closest(".map-result") &&
            button.closest(".map-result").dataset.locationId);
        if (id && locationSelect()) {
          locationSelect().value = id;
          show("reservation");
          loadZones()
            .then(loadSpaces)
            .catch(function (error) {
              ui.toast(error.message, "warning");
            });
        }
      } else if (action === "vehicle-edit") {
        event.preventDefault();
        editVehicle(button.closest(".driver-vehicle-card").dataset.vehicleId);
      } else if (action === "vehicle-primary") {
        event.preventDefault();
        var vehicle = state.vehicles.filter(function (item) {
          return (
            String(item.id) ===
            String(button.closest(".driver-vehicle-card").dataset.vehicleId)
          );
        })[0];
        if (vehicle)
          api
            .request("driver/vehicles/" + vehicle.id, {
              method: "PUT",
              body: {
                make_model: vehicle.make_model,
                vehicle_year: vehicle.vehicle_year,
                registration_number: vehicle.registration_number,
                vehicle_type: vehicle.vehicle_type,
                color: vehicle.color || "",
                powertrain: vehicle.powertrain || "petrol",
                is_primary: true,
              },
            })
            .then(function () {
              return load();
            })
            .then(function () {
              ui.toast("Primary vehicle updated.");
            })
            .catch(function (error) {
              ui.toast(error.message, "warning");
            });
      } else if (action === "add-vehicle") {
        event.preventDefault();
        ui.openModal(document.getElementById("add-driver-vehicle"));
      } else if (action === "receipt") {
        event.preventDefault();
        var row = state.reservations.filter(function (item) {
          return (
            String(item.id) ===
            String(button.closest("tr").dataset.reservationId)
          );
        })[0];
        if (row) showReceipt(row);
      } else if (action === "receipt-modal-download") {
        event.preventDefault();
        if (state.receipt)
          ui.createPdf(
            "ParkFlow Parking Receipt",
            [
              "Reservation: " + state.receipt.reservation_code,
              "Location: " + state.receipt.location_name,
              "Space: " + (state.receipt.space_code || "—"),
              "Vehicle: " + state.receipt.registration_number,
              "Total paid: " + money(state.receipt.total_amount),
            ],
            "parkflow-receipt-" + state.receipt.reservation_code + ".pdf",
          );
      } else if (action === "history-export") {
        event.preventDefault();
        ui.createPdf(
          "ParkFlow Parking History",
          historyRows().map(function (row) {
            return (
              row.reservation_code +
              " · " +
              row.location_name +
              " · " +
              date(row.starts_at) +
              " · " +
              money(row.total_amount)
            );
          }),
          "parkflow-parking-history.pdf",
        );
      } else if (action === "history-page") {
        event.preventDefault();
        var requestedPage = Number(button.dataset.page);
        if (requestedPage >= 1) {
          state.historyPage = requestedPage;
          renderHistory();
        }
      } else if (action === "conversation") {
        event.preventDefault();
        loadMessages({
          id: button.dataset.userId,
          full_name:
            button.dataset.userName ||
            button.querySelector("strong").textContent,
        });
      } else if (action === "issue-details") {
        event.preventDefault();
        var issue = button.closest(".issue-ticket");
        ui.toast(
          issue.querySelector("strong").textContent +
            ": " +
            issue.querySelector("p").textContent,
        );
      } else if (action === "directions") {
        event.preventDefault();
        openDirections();
      } else if (action === "booking-details") {
        event.preventDefault();
        var active = state.reservations.filter(function (row) {
          return (
            ["confirmed", "waiting_check_in", "active"].indexOf(row.status) >= 0
          );
        })[0];
        if (active) showReceipt(active);
      } else if (action === "cancel-booking") {
        event.preventDefault();
        var card = button.closest("[data-active-booking-card]"),
          reservationId = card && card.dataset.reservationId;
        if (!reservationId) return;
        if (
          !window.confirm(
            "Cancel this booking? The parking space will become free again.",
          )
        )
          return;
        button.disabled = true;
        api
          .request("driver/reservations/" + reservationId + "/cancel", {
            method: "POST",
            body: {},
          })
          .then(function () {
            return load();
          })
          .then(function () {
            ui.toast("Booking cancelled. The space is free again.");
          })
          .catch(function (error) {
            button.disabled = false;
            ui.toast(error.message, "warning");
          });
      } else if (action === "refresh-otp") {
        event.preventDefault();
        var card = button.closest("[data-active-booking-card]"),
          id = card && card.dataset.reservationId,
          checkout = card && card.dataset.reservationStatus === "active",
          path = checkout ? "check-out-otp" : "check-in-otp";
        if (!id)
          return ui.toast("No active reservation is available.", "warning");
        api
          .request("driver/reservations/" + id + "/" + path, {
            method: "POST",
            body: {},
          })
          .then(function (result) {
            var code = checkout ? result.check_out_otp : result.check_in_otp;
            document
              .querySelectorAll(
                "[data-active-booking-card] .booking-otp strong",
              )
              .forEach(function (output) {
                output.innerHTML = String(code)
                  .split("")
                  .map(function (digit) {
                    return "<span>" + digit + "</span>";
                  })
                  .join("");
              });
            ui.toast(
              "A new " +
                (checkout ? "check-out" : "check-in") +
                " OTP is ready.",
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (action === "notifications-read") {
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
      } else if (action === "notification-read") {
        event.preventDefault();
        var notificationLink = button.dataset.link || "#overview";
        api
          .request("notifications/" + button.dataset.notificationId + "/read", {
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
      } else if (action === "wallet-info" || action === "payment-info") {
        event.preventDefault();
        ui.toast(
          "Card payment is enabled for every reservation in this local demo.",
        );
      } else if (action === "map-zoom") {
        event.preventDefault();
        ui.toast(
          "The availability map is a local visual preview. Select a location to reserve a live space.",
        );
      } else if (action === "attachment-info") {
        event.preventDefault();
        ui.toast(
          "Attachments are not enabled in this local chat yet. Send your message or report an issue with a photo.",
        );
      }
    },
    true,
  );
  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (form.id === "driver-profile-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request("driver/profile", {
            method: "PUT",
            body: {
              name: form.elements.name.value.trim(),
              email: form.elements.email.value.trim(),
              phone: form.elements.phone.value.trim(),
              city: form.elements.city.value.trim(),
              emergency_contact: form.elements.emergencyContact.value.trim(),
              language: form.elements.language.value,
              receive_updates: form.elements.updates.checked,
            },
          })
          .then(function () {
            return load();
          })
          .then(function () {
            ui.toast("Profile saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.closest("#add-driver-vehicle")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request("driver/vehicles", {
            method: "POST",
            body: {
              make_model: document
                .getElementById("new-vehicle-make")
                .value.trim(),
              vehicle_year: document.getElementById("new-vehicle-year").value,
              registration_number: document
                .getElementById("new-vehicle-plate")
                .value.trim(),
              vehicle_type: document.getElementById("new-vehicle-type").value,
              color: document.getElementById("new-vehicle-color").value.trim(),
              powertrain: document.getElementById("new-vehicle-fuel").value,
              is_primary: form.querySelector('input[type="checkbox"]').checked,
            },
          })
          .then(function () {
            form.reset();
            ui.closeModal(document.getElementById("add-driver-vehicle"));
            return load();
          })
          .then(function () {
            ui.toast("Vehicle saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "edit-driver-vehicle-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var id = document.getElementById("edit-vehicle-id").value;
        api
          .request("driver/vehicles/" + id, {
            method: "PUT",
            body: {
              make_model: document
                .getElementById("edit-vehicle-make")
                .value.trim(),
              vehicle_year: document.getElementById("edit-vehicle-year").value,
              registration_number: document
                .getElementById("edit-vehicle-plate")
                .value.trim(),
              vehicle_type: document.getElementById("edit-vehicle-type").value,
              color: document.getElementById("edit-vehicle-color").value.trim(),
              powertrain: document.getElementById("edit-vehicle-fuel").value,
              is_primary: document.getElementById("edit-vehicle-primary")
                .checked,
            },
          })
          .then(function () {
            ui.closeModal(document.getElementById("edit-driver-vehicle"));
            return load();
          })
          .then(function () {
            ui.toast("Vehicle updated.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.matches(".issue-form")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var category =
          {
            "Assigned space occupied": "space_access",
            "Access gate or OTP problem": "space_access",
            "Unsafe or blocked access": "safety",
            "Payment or receipt issue": "payment",
            "Vehicle damage concern": "vehicle_damage",
            Other: "other",
          }[document.getElementById("issue-category").value] || "other";
        var reservationId = document.getElementById("issue-reservation").value,
          reservation = state.reservations.filter(function (row) {
            return String(row.id) === String(reservationId);
          })[0];
        api
          .request("driver/issues", {
            method: "POST",
            body: {
              category: category,
              description: (
                document.getElementById("issue-location").value +
                "\n" +
                document.getElementById("issue-description").value
              ).trim(),
              location_id: reservation
                ? reservation.location_id
                : locationSelect() && locationSelect().value,
              reservation_id: reservationId || null,
            },
          })
          .then(function (result) {
            form.reset();
            ui.toast("Issue " + result.ticket_code + " submitted.");
            return load();
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.matches(".driver-map-search")) {
        event.preventDefault();
        var query = (document.getElementById("availability-search").value || "")
          .trim()
          .toLowerCase();
        document.querySelectorAll(".map-result").forEach(function (item) {
          item.hidden =
            !!query && item.textContent.toLowerCase().indexOf(query) < 0;
        });
        ui.toast(
          query
            ? "Showing matching parking locations."
            : "Showing all live parking locations.",
        );
      } else if (form.matches(".chat-composer")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var field = document.getElementById("driver-message");
        if (!state.recipient || !field.value.trim())
          return ui.toast(
            "Select a conversation and write a message first.",
            "warning",
          );
        api
          .request("driver/messages", {
            method: "POST",
            body: {
              recipient_user_id: state.recipient.id,
              body: field.value.trim(),
            },
          })
          .then(function () {
            field.value = "";
            return loadMessages(state.recipient);
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      }
    },
    true,
  );
  var profileForm = document.getElementById("driver-profile-form");
  if (profileForm)
    profileForm.addEventListener("reset", function () {
      window.setTimeout(function () {
        if (state.profile) setProfile(state.profile);
      }, 0);
    });
  var conversationSearch = document.getElementById(
    "driver-conversation-search",
  );
  if (conversationSearch)
    conversationSearch.addEventListener("input", function () {
      var query = conversationSearch.value.trim().toLowerCase();
      document.querySelectorAll(".conversation-item").forEach(function (item) {
        item.closest("li").hidden =
          !!query && item.textContent.toLowerCase().indexOf(query) < 0;
      });
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
  (function setReservationDefaults() {
    var reservationDate = document.getElementById("reservation-date"),
      reservationTime = document.getElementById("reservation-time"),
      availabilityDate = document.getElementById("availability-date");
    if (reservationDate) {
      reservationDate.min = today();
      reservationDate.value = today();
    }
    if (availabilityDate) availabilityDate.value = today();
    if (!reservationDate || !reservationTime) return;
    var now = Date.now(),
      future = Array.prototype.slice
        .call(reservationTime.options)
        .filter(function (option) {
          return (
            new Date(
              reservationDate.value + "T" + option.value + ":00",
            ).getTime() >
            now + 60000
          );
        })[0];
    if (future) reservationTime.value = future.value;
    else {
      var next = new Date();
      next.setDate(next.getDate() + 1);
      reservationDate.value =
        next.getFullYear() +
        "-" +
        String(next.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(next.getDate()).padStart(2, "0");
      reservationTime.selectedIndex = 0;
    }
  })();
  guard()
    .then(load)
    .then(loadNotifications)
    .then(function () {
      window.setInterval(refreshAvailability, 30000);
    })
    .catch(function (error) {
      if (error.message !== "Sign in required.")
        ui.toast(error.message, "warning");
    });
})();
