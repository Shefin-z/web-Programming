/* Live administrator portal backed by api/index.php and the signed-in PHP session. */
(function () {
  "use strict";
  var api = window.ParkFlowAPI,
    ui = window.ParkFlowUI;
  if (!api || !ui || !document.body.classList.contains("admin-portal")) return;
  var state = {
    profile: null,
    managers: [],
    locations: [],
    rules: [],
    categories: [],
    escalatedIssues: [],
    analytics: null,
    dashboard: null,
    managerPendingRemoval: null,
    managerApprovalDecision: null,
    pendingDeletion: null,
  };
  var money = function (value) {
    return (
      "BDT " +
      Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
    );
  };
  var esc = function (value) {
    var e = document.createElement("span");
    e.textContent = value == null ? "" : String(value);
    return e.innerHTML;
  };
  var initials = function (name) {
    return String(name || "?")
      .split(/\s+/)
      .map(function (part) {
        return part[0] || "";
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };
  var time = function (value) {
    return value ? String(value).slice(0, 5) : "—";
  };
  var clockTime = function (value) {
    return value ? String(value).slice(-8, -3) : "—";
  };
  var dateTime = function (value) {
    var date = new Date(String(value).replace(" ", "T"));
    return isNaN(date) ? "—" : date.toLocaleString();
  };
  var badge = function (value) {
    var text = String(value || "unknown").replace(/_/g, " ");
    var cls = /active|operational|completed|approved|confirmed/i.test(text)
      ? "success"
      : /pending|waiting|review|paused|overstayed/i.test(text)
        ? "warning"
        : /cancelled|rejected|suspended|closed/i.test(text)
          ? "danger"
          : "info";
    return (
      '<span class="badge badge--' +
      cls +
      ' badge--dot">' +
      esc(text) +
      "</span>"
    );
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
      .request("admin/reservations/" + id)
      .then(function (data) {
        var reservation = data.reservation || {},
          modal = document.getElementById("admin-reservation-details");
        if (!modal) return;
        var title = document.getElementById("admin-reservation-details-title"),
          subtitle = document.getElementById(
            "admin-reservation-details-subtitle",
          ),
          code = document.getElementById("admin-reservation-details-code"),
          status = document.getElementById("admin-reservation-details-status"),
          list = document.getElementById("admin-reservation-details-list");
        if (title)
          title.textContent =
            "Reservation #" + (reservation.reservation_code || "—");
        if (subtitle)
          subtitle.textContent =
            (reservation.location_name || "Parking location") +
            " · Live database record";
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
              "Amount paid",
              money(reservation.payment_amount || reservation.total_amount),
              "Reservation total " + money(reservation.total_amount),
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

  function guard() {
    return api.me().then(function (result) {
      if (!result.user || result.user.role !== "admin") {
        window.location.href = "login.html?account=admin";
        throw new Error("Sign in required.");
      }
      document.querySelectorAll(".admin-name").forEach(function (name) {
        name.textContent = result.user.full_name;
      });
      var greeting = document.querySelector("#admin-overview-title");
      if (greeting)
        greeting.textContent =
          "Welcome, " + String(result.user.full_name).split(/\s+/)[0];
    });
  }
  function setValue(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }
  function renderProfile(data) {
    var profile = data.profile || data;
    state.profile = profile;
    var name = document.getElementById("admin-profile-name"),
      email = document.getElementById("admin-profile-email"),
      phone = document.getElementById("admin-profile-phone");
    if (name) name.value = profile.full_name || "";
    if (email) email.value = profile.email || "";
    if (phone) phone.value = profile.phone || "";
    document.querySelectorAll(".admin-name").forEach(function (item) {
      item.textContent = profile.full_name || "";
    });
  }
  function compactMoney(value) {
    value = Number(value || 0);
    if (value >= 1000000)
      return (
        "BDT " +
        (value / 1000000)
          .toFixed(value >= 10000000 ? 0 : 1)
          .replace(/\.0$/, "") +
        "M"
      );
    if (value >= 1000)
      return (
        "BDT " +
        (value / 1000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, "") +
        "K"
      );
    return money(value);
  }
  function trendLabel(value, days) {
    var date = new Date(String(value || "").replace(" ", "T"));
    return isNaN(date)
      ? "No activity"
      : date.toLocaleDateString(
          undefined,
          days >= 365
            ? { month: "short", year: "numeric" }
            : { month: "short", day: "numeric" },
        );
  }
  function buildTrend(rows, days, start) {
    var values = {},
      index;
    (rows || []).forEach(function (row) {
      values[String(row.day).slice(0, 10)] = Number(row.revenue || 0);
    });
    if (days >= 365) {
      var months = {},
        first = new Date(String(start || "").replace(" ", "T"));
      if (isNaN(first)) first = new Date();
      first.setDate(1);
      for (index = 0; index < 12; index += 1) {
        var month = new Date(first.getFullYear(), first.getMonth() + index, 1),
          key =
            month.getFullYear() +
            "-" +
            String(month.getMonth() + 1).padStart(2, "0"),
          total = 0;
        Object.keys(values).forEach(function (day) {
          if (day.slice(0, 7) === key) total += values[day];
        });
        months[key] = { day: key + "-01", revenue: total };
      }
      return Object.keys(months).map(function (key) {
        return months[key];
      });
    }
    var output = [],
      cursor = new Date(String(start || "").replace(" ", "T"));
    if (isNaN(cursor)) cursor = new Date();
    for (index = 0; index < days; index += 1) {
      var day = new Date(cursor);
      day.setDate(cursor.getDate() + index);
      var key =
        day.getFullYear() +
        "-" +
        String(day.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(day.getDate()).padStart(2, "0");
      output.push({ day: key, revenue: values[key] || 0 });
    }
    return output;
  }
  function linePath(values, max, area) {
    var last = Math.max(values.length - 1, 1),
      path = values
        .map(function (value, index) {
          var x = (index * 800) / last,
            y = 240 - (Number(value || 0) / Math.max(max, 1)) * 210;
          return (index ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        })
        .join(" ");
    return area ? path + " L800 260 L0 260Z" : path;
  }
  function renderRevenueChart(data) {
    var root = document.getElementById("analytics-summary");
    if (!root) return;
    var days = Number(data.days || 30),
      current = buildTrend(data.trend, days, data.period_start),
      previousStart = new Date(
        String(data.period_start || "").replace(" ", "T"),
      );
    previousStart.setDate(previousStart.getDate() - days);
    var previous = buildTrend(
      data.previous_trend,
      days,
      isNaN(previousStart) ? null : previousStart.toISOString().slice(0, 10),
    );
    var currentValues = current.map(function (row) {
        return Number(row.revenue || 0);
      }),
      previousValues = previous.map(function (row) {
        return Number(row.revenue || 0);
      }),
      total = currentValues.reduce(function (sum, value) {
        return sum + value;
      }, 0),
      previousTotal = previousValues.reduce(function (sum, value) {
        return sum + value;
      }, 0),
      max = Math.max.apply(null, currentValues.concat(previousValues, [1])),
      summary = root.querySelector(".admin-chart-summary"),
      change = previousTotal
        ? ((total - previousTotal) / previousTotal) * 100
        : null;
    if (summary) {
      var totalNode = summary.querySelector("strong"),
        changeNode = summary.querySelector("small");
      if (totalNode) totalNode.textContent = money(total);
      if (changeNode) {
        changeNode.className =
          change == null ? "" : change >= 0 ? "text-success" : "text-danger";
        changeNode.textContent =
          change == null
            ? "No comparable prior-period revenue"
            : (change >= 0 ? "↑ " : "↓ ") +
              Math.abs(change).toFixed(1) +
              "% vs previous period";
      }
    }
    var axis = root.querySelector(".chart-y-axis");
    if (axis)
      axis.innerHTML = [max, max * 0.75, max * 0.5, max * 0.25, 0]
        .map(function (value) {
          return "<span>" + esc(compactMoney(value)) + "</span>";
        })
        .join("");
    var svg = root.querySelector(".chart-svg");
    if (svg) {
      svg.setAttribute(
        "aria-label",
        "Paid revenue for the last " + days + " days",
      );
      svg.innerHTML =
        '<defs><linearGradient id="admin-area-live" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2f8fff"></stop><stop offset="100%" stop-color="#2f8fff" stop-opacity="0"></stop></linearGradient></defs><path class="area" fill="url(#admin-area-live)" d="' +
        linePath(currentValues, max, true) +
        '"></path><path class="line line--secondary" d="' +
        linePath(previousValues, max, false) +
        '"></path><path class="line" d="' +
        linePath(currentValues, max, false) +
        '"></path>';
    }
    var labels = root.querySelector(".chart-x-axis");
    if (labels) {
      var steps = Math.min(6, current.length),
        positions = [];
      for (var step = 0; step < steps; step += 1)
        positions.push(
          Math.round((step * (current.length - 1)) / Math.max(steps - 1, 1)),
        );
      labels.innerHTML = positions
        .map(function (index) {
          return (
            "<span>" + esc(trendLabel(current[index].day, days)) + "</span>"
          );
        })
        .join("");
    }
    var latest = current[current.length - 1] || {
        day: data.period_end,
        revenue: 0,
      },
      tooltip = root.querySelector(".chart-tooltip");
    if (tooltip) {
      tooltip.style.left = "auto";
      tooltip.style.right = "1rem";
      tooltip.style.top = "1rem";
      tooltip.innerHTML =
        "<span>" +
        esc(trendLabel(latest.day, days)) +
        "</span><strong>" +
        esc(money(latest.revenue)) +
        '</strong><span class="text-muted">paid revenue</span>';
    }
  }
  function renderUtilization(data) {
    var counts = {
      occupied: 0,
      available: 0,
      reserved: 0,
      blocked: 0,
      maintenance: 0,
    };
    (data.utilization || []).forEach(function (row) {
      counts[row.status] = Number(row.total || 0);
    });
    var blocked = counts.blocked + counts.maintenance,
      total = Number((data.metrics || {}).spaces || 0),
      occupiedPercent = total ? Math.round((counts.occupied * 100) / total) : 0,
      freePercent = total ? (counts.available * 100) / total : 0,
      reservedPercent = total ? (counts.reserved * 100) / total : 0;
    var donut = document.querySelector(".admin-utilization-donut");
    if (donut) {
      donut.style.setProperty("--donut-a", occupiedPercent + "%");
      donut.style.setProperty("--donut-b", occupiedPercent + freePercent + "%");
      donut.style.setProperty(
        "--donut-c",
        occupiedPercent + freePercent + reservedPercent + "%",
      );
      var value = donut.querySelector(".donut-chart__value strong"),
        label = donut.querySelector(".donut-chart__value span");
      if (value) value.textContent = occupiedPercent + "%";
      if (label) label.textContent = "occupied";
    }
    var legend = document.querySelector("#analytics-summary .chart-legend");
    if (legend) {
      var rows = [
        { label: "Occupied", value: counts.occupied },
        { label: "Free", value: counts.available },
        { label: "Reserved", value: counts.reserved },
        { label: "Blocked / maintenance", value: blocked },
      ];
      legend.querySelectorAll("li").forEach(function (item, index) {
        var row = rows[index];
        if (!row) return;
        var label = item.querySelector("span"),
          value = item.querySelector("strong");
        if (label) label.textContent = row.label;
        if (value) value.textContent = row.value;
      });
    }
    var note = document.querySelector("#analytics-summary .occupancy-note p");
    if (note)
      note.innerHTML =
        "<strong>Live availability</strong><br>" +
        counts.available +
        " free, " +
        counts.reserved +
        " reserved, and " +
        blocked +
        " unavailable out of " +
        total +
        " spaces.";
  }
  function renderDashboard(data) {
    state.dashboard = data;
    var metrics = data.metrics || {};
    document.querySelectorAll("#overview .kpi-card").forEach(function (card) {
      var label = card.querySelector(".kpi-card__value span");
      var output = card.querySelector(".kpi-card__value strong");
      if (!label || !output) return;
      var key = label.textContent.toLowerCase();
      if (key.indexOf("reservation") >= 0)
        output.textContent = Number(metrics.reservations || 0).toLocaleString();
      else if (key.indexOf("revenue") >= 0)
        output.textContent = money(metrics.revenue);
      else if (key.indexOf("occupancy") >= 0)
        output.textContent = metrics.spaces
          ? Math.round(
              ((metrics.occupied_spaces || 0) * 100) / metrics.spaces,
            ) + "%"
          : "0%";
      else if (key.indexOf("space") >= 0)
        output.textContent = Number(metrics.spaces || 0).toLocaleString();
    });
    var table = document.querySelector("#overview .dashboard-table tbody");
    if (table)
      table.innerHTML =
        (data.recent_reservations || [])
          .map(function (row) {
            return (
              '<tr data-reservation-id="' +
              row.id +
              '"><td><strong>#' +
              esc(row.reservation_code) +
              '</strong></td><td><div class="table-identity"><span class="avatar avatar--sm">' +
              esc(initials(row.full_name)) +
              '</span><span class="table-identity__text"><strong>' +
              esc(row.full_name) +
              "</strong><small>" +
              esc(row.registration_number) +
              "</small></span></div></td><td>" +
              esc(row.location_name) +
              "</td><td>" +
              esc(clockTime(row.starts_at)) +
              "–" +
              esc(clockTime(row.ends_at)) +
              "</td><td><strong>" +
              money(row.total_amount) +
              "</strong></td><td>" +
              badge(row.status) +
              '</td><td><button class="icon-btn" data-action="reservation-details" type="button" aria-label="View reservation"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-eye"></use></svg></button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="7">No reservations have been recorded yet.</td></tr>';
    renderUtilization(data);
  }
  function renderManagers(rows) {
    state.managers = rows;
    var body = document.querySelector("#managers .dashboard-table tbody");
    if (body)
      body.innerHTML =
        rows
          .map(function (row) {
            var action =
              row.account_status === "suspended"
                ? '<button class="btn btn--success btn--sm" data-action="manager-activate" type="button">Activate</button>'
                : row.account_status === "active"
                  ? '<button class="btn btn--secondary btn--sm" data-action="manager-suspend" type="button">Suspend</button>'
                  : '<a class="btn btn--secondary btn--sm" href="#manager-approvals">Review</a>';
            return (
              '<tr data-manager-id="' +
              row.id +
              '"><td><div class="table-identity"><span class="avatar">' +
              esc(initials(row.full_name)) +
              '</span><span class="table-identity__text"><strong>' +
              esc(row.full_name) +
              "</strong><small>" +
              esc(row.email) +
              "</small></span></div></td><td>" +
              esc(row.locations || "Unassigned") +
              "</td><td>" +
              esc(row.shift_name || "—") +
              "</td><td><strong>—</strong></td><td>" +
              badge(row.account_status) +
              '</td><td><div class="table-actions"><button class="icon-btn" data-action="manager-edit" type="button" aria-label="Edit ' +
              esc(row.full_name) +
              '"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-edit"></use></svg></button>' +
              action +
              "</div></td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="6">No manager accounts found.</td></tr>';
    document
      .querySelectorAll(
        '.sidebar-nav__link[href="#managers"] .sidebar-nav__count',
      )
      .forEach(function (count) {
        count.textContent = rows.filter(function (row) {
          return row.account_status === "active";
        }).length;
      });
    var pagination = document.querySelector("#managers .table-pagination");
    if (pagination) {
      var summary = pagination.querySelector("span");
      if (summary)
        summary.textContent =
          "Showing " + rows.length + " of " + rows.length + " managers";
      var navigation = pagination.querySelector("nav");
      if (navigation) navigation.hidden = true;
    }
    var statusSelect = document.querySelector(".manager-filterbar select");
    if (statusSelect) {
      var currentStatus = statusSelect.value;
      var statuses = rows
        .map(function (row) {
          return row.account_status;
        })
        .filter(function (value, index, values) {
          return values.indexOf(value) === index;
        });
      statusSelect.innerHTML =
        "<option>All statuses</option>" +
        statuses
          .map(function (status) {
            return (
              '<option value="' +
              esc(status) +
              '">' +
              esc(status.charAt(0).toUpperCase() + status.slice(1)) +
              "</option>"
            );
          })
          .join("");
      statusSelect.value = currentStatus;
    }
    fillSelects();
  }
  function fillSelects() {
    [
      ["manager-location", "Select a parking location"],
      ["edit-manager-location", "Select a parking location"],
      ["pricing-rule-location", "All locations"],
      ["edit-pricing-rule-location", "All locations"],
      ["space-location", "Select a parking location"],
    ].forEach(function (pair) {
      var select = document.getElementById(pair[0]);
      if (!select) return;
      var current = select.value;
      select.innerHTML =
        '<option value="">' +
        pair[1] +
        "</option>" +
        state.locations
          .map(function (location) {
            return (
              '<option value="' +
              location.id +
              '">' +
              esc(location.name) +
              "</option>"
            );
          })
          .join("");
      select.value = current;
    });
    var previewLocation = document.getElementById("pricing-preview-location");
    if (previewLocation) {
      var selectedLocation = previewLocation.value,
        previewLocations = state.locations.filter(function (location) {
          return location.status === "operational";
        });
      previewLocation.innerHTML =
        previewLocations
          .map(function (location) {
            return (
              '<option value="' +
              location.id +
              '">' +
              esc(location.name) +
              "</option>"
            );
          })
          .join("") || '<option value="">No operational locations</option>';
      if (
        previewLocations.some(function (location) {
          return String(location.id) === String(selectedLocation);
        })
      )
        previewLocation.value = selectedLocation;
      else if (previewLocations[0])
        previewLocation.value = previewLocations[0].id;
    }
    ["new-location-manager", "edit-location-manager"].forEach(function (id) {
      var manager = document.getElementById(id);
      if (!manager) return;
      var current = manager.value;
      manager.innerHTML =
        '<option value="">Assign later</option>' +
        state.managers
          .filter(function (row) {
            return row.account_status === "active";
          })
          .map(function (row) {
            return (
              '<option value="' +
              row.id +
              '">' +
              esc(row.full_name) +
              "</option>"
            );
          })
          .join("");
      manager.value = current;
    });
  }
  function renderLocations(rows) {
    state.locations = rows;
    var grid = document.querySelector(".admin-location-grid");
    if (grid)
      grid.innerHTML =
        rows
          .map(function (row) {
            var total = Number(row.spaces_total || row.total_capacity || 0);
            var occupied = Number(row.occupied_spaces || 0);
            var percent = total ? Math.round((occupied * 100) / total) : 0;
            return (
              '<article class="admin-location-card" data-location-id="' +
              row.id +
              '"><header><span class="admin-location-card__mark">P</span>' +
              badge(row.status) +
              "</header><div><h3>" +
              esc(row.name) +
              "</h3><p>" +
              esc(row.address) +
              "</p></div><dl><div><dt>Total spaces</dt><dd>" +
              esc(row.total_capacity) +
              "</dd></div><div><dt>Occupied</dt><dd>" +
              occupied +
              "</dd></div><div><dt>Rate</dt><dd>" +
              money(row.base_hourly_rate) +
              '/hr</dd></div></dl><div class="location-capacity"><span><strong>' +
              percent +
              '%</strong> occupied</span><div class="progress progress--success"><div class="progress__bar" style="width:' +
              percent +
              '%"></div></div></div><footer><span><small>Manager</small> <strong>' +
              esc(row.managers || "Unassigned") +
              '</strong></span><button class="icon-btn" data-action="location-edit" type="button" aria-label="Edit location">✎</button></footer></article>'
            );
          })
          .join("") || "<p>No parking locations have been created yet.</p>";
    fillSelects();
  }
  function renderApprovals(rows) {
    var table = document.querySelector(".approval-table tbody");
    if (!table) return;
    table.innerHTML =
      rows
        .map(function (row) {
          return (
            '<tr data-application-id="' +
            row.id +
            '"><td><div class="table-identity"><span class="avatar">' +
            esc(initials(row.full_name)) +
            '</span><span class="table-identity__text"><strong>' +
            esc(row.full_name) +
            "</strong><small>" +
            esc(row.phone || row.email) +
            "</small></span></div></td><td><strong>Parking manager</strong><br><small>" +
            esc(row.locations || "Unassigned") +
            '</small></td><td><span class="text-muted">Account application</span></td><td>' +
            esc(dateTime(row.created_at)) +
            "</td><td>" +
            badge(row.account_status) +
            '</td><td><div class="approval-actions"><button class="btn btn--success btn--sm" data-action="application-approve" type="button">Approve</button><button class="btn btn--secondary btn--sm" data-action="application-reject" type="button">Reject</button></div></td></tr>'
          );
        })
        .join("") ||
      '<tr><td colspan="6">There are no manager applications awaiting review.</td></tr>';
    var count = document.querySelector(
      "#manager-approvals .section-toolbar__actions .badge, #manager-approvals .badge--warning",
    );
    if (count && !count.closest("tbody"))
      count.textContent = rows.length + " awaiting review";
    document
      .querySelectorAll(
        '.sidebar-nav__link[href="#manager-approvals"] .sidebar-nav__count',
      )
      .forEach(function (item) {
        item.textContent = rows.length;
      });
    var notification = document.querySelector(
      '.notification-item[href="#manager-approvals"]',
    );
    if (notification) {
      var title = notification.querySelector("strong"),
        detail = notification.querySelector("p"),
        stamp = notification.querySelector("time");
      if (title)
        title.textContent = rows.length
          ? rows.length +
            " manager application" +
            (rows.length === 1 ? "" : "s") +
            " await approval"
          : "No manager applications await approval";
      if (detail)
        detail.textContent = rows.length
          ? "Review and approve new manager access."
          : "Your manager approval queue is clear.";
      if (stamp) stamp.textContent = "Live";
      notification.classList.toggle("is-unread", rows.length > 0);
    }
  }
  function renderPricing(rows) {
    state.rules = rows;
    var list = document.querySelector(".pricing-rule-list");
    if (!list) return;
    list.innerHTML =
      rows
        .map(function (row) {
          var adjustment = Number(row.adjustment_value),
            fixed = row.adjustment_type === "fixed_amount",
            unit = fixed ? " BDT/hr" : "%",
            label =
              (adjustment >= 0 ? "Increase " : "Discount ") +
              (fixed
                ? money(Math.abs(adjustment)) + "/hr"
                : Math.abs(adjustment) + "%");
          return (
            '<article class="pricing-rule" data-rule-id="' +
            row.id +
            '"><span class="pricing-rule__icon">%</span><div class="pricing-rule__body"><div><h4>' +
            esc(row.name) +
            "</h4>" +
            badge(label) +
            "</div><p>" +
            esc(time(row.start_time)) +
            "–" +
            esc(time(row.end_time)) +
            " · " +
            esc(row.location_name || "All locations") +
            '</p><div class="pricing-rule__meta"><span>Adjustment <strong>' +
            (adjustment >= 0 ? "+" : "") +
            (fixed ? money(adjustment) + "/hr" : adjustment + "%") +
            "</strong></span><span>Status <strong>" +
            (Number(row.is_active) ? "Active" : "Paused") +
            '</strong></span></div></div><div class="pricing-rule__controls"><label class="switch"><input data-action="pricing-toggle" type="checkbox"' +
            (Number(row.is_active) ? " checked" : "") +
            '>Active</label><div class="pricing-rule__actions"><button class="icon-btn" data-action="pricing-edit" type="button" aria-label="Edit pricing rule"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-edit"></use></svg></button><button class="icon-btn table-delete" data-action="pricing-delete" type="button" aria-label="Delete pricing rule"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-trash"></use></svg></button></div></div></article>'
          );
        })
        .join("") || "<p>No pricing rules configured.</p>";
    var active = rows.filter(function (row) {
      return Number(row.is_active);
    });
    var count = document.querySelector("#pricing .panel-header .badge");
    if (count) count.textContent = active.length + " active";
    var previewNow = new Date();
    updateRatePreview(previewNow).catch(function () {
      /* The preview shows its own request error. */
    });
    var previewTime = document.getElementById("pricing-preview-time");
    if (previewTime)
      previewTime.value =
        String(previewNow.getHours()).padStart(2, "0") +
        ":" +
        String(previewNow.getMinutes()).padStart(2, "0");
  }
  function pricingPreviewDate() {
    var value =
        (document.getElementById("pricing-preview-time") || {}).value || "",
      when = new Date(),
      pieces = value.split(":");
    if (pieces.length === 2)
      when.setHours(Number(pieces[0]), Number(pieces[1]), 0, 0);
    return when;
  }
  function pricingSqlDate(value) {
    return (
      value.getFullYear() +
      "-" +
      String(value.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(value.getDate()).padStart(2, "0") +
      " " +
      String(value.getHours()).padStart(2, "0") +
      ":" +
      String(value.getMinutes()).padStart(2, "0") +
      ":00"
    );
  }
  function signedMoney(value) {
    var amount = Number(value || 0);
    return (amount > 0 ? "+" : amount < 0 ? "-" : "") + money(Math.abs(amount));
  }
  function updateRatePreview(now) {
    var locationSelect = document.getElementById("pricing-preview-location"),
      durationSelect = document.getElementById("pricing-preview-duration"),
      locationId = locationSelect && locationSelect.value,
      duration = Number((durationSelect && durationSelect.value) || 2),
      requestId;
    if (!locationId || !now || isNaN(now.getTime())) return Promise.resolve();
    requestId = Number(state.pricingPreviewRequest || 0) + 1;
    state.pricingPreviewRequest = requestId;
    return api
      .request(
        "admin/pricing-preview?location_id=" +
          encodeURIComponent(locationId) +
          "&starts_at=" +
          encodeURIComponent(pricingSqlDate(now)) +
          "&duration_hours=" +
          encodeURIComponent(duration),
      )
      .then(function (data) {
        if (requestId !== state.pricingPreviewRequest) return;
        var clock = document.querySelector(".pricing-clock strong"),
          sub = document.querySelector(".pricing-clock small"),
          heading = document.querySelector(
            ".pricing-preview .panel-header__copy p",
          ),
          mainRate = document.querySelector(".current-rate strong"),
          baseRate = document.querySelector(".current-rate em"),
          ruleNames = (data.applied_rules || []).map(function (rule) {
            return rule.name;
          });
        if (clock)
          clock.textContent = now.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
        if (sub)
          sub.textContent = ruleNames.length
            ? ruleNames.join(", ") +
              (ruleNames.length === 1 ? " is" : " are") +
              " active for this preview."
            : "No dynamic pricing rule is active at this time.";
        if (heading)
          heading.textContent =
            (data.location || {}).name || "Selected location";
        if (mainRate)
          mainRate.innerHTML =
            esc(money(data.hourly_rate)) + "<small>/hour</small>";
        if (baseRate)
          baseRate.textContent = "Base rate " + money(data.base_hourly_rate);
        var hoursLabel = document.getElementById("pricing-preview-hours-label");
        if (hoursLabel) hoursLabel.textContent = data.duration_hours;
        var baseParking = document.getElementById(
          "pricing-preview-base-parking",
        );
        if (baseParking) baseParking.textContent = money(data.base_parking);
        var adjustment = document.getElementById(
          "pricing-preview-demand-adjustment",
        );
        if (adjustment)
          adjustment.textContent = signedMoney(data.demand_adjustment);
        var fee = document.getElementById("pricing-preview-service-fee");
        if (fee) fee.textContent = money(data.service_fee);
        var total = document.getElementById("pricing-preview-total");
        if (total) total.textContent = money(data.total_amount);
      })
      .catch(function (error) {
        if (requestId === state.pricingPreviewRequest)
          ui.toast(error.message, "warning");
        throw error;
      });
  }
  function renderCategories(rows) {
    state.categories = rows;
    var grid = document.querySelector(".violation-category-grid");
    if (!grid) return;
    grid.innerHTML =
      rows
        .map(function (row) {
          return (
            '<article class="violation-category" data-category-id="' +
            row.id +
            '"><header><span class="violation-category__icon">!</span>' +
            badge(row.default_severity) +
            "</header><h3>" +
            esc(row.name) +
            "</h3><p>" +
            esc(row.description) +
            "</p><footer><span>Default penalty <strong>" +
            money(row.default_penalty) +
            '</strong></span><div class="category-actions"><button class="icon-btn" data-action="category-edit" type="button" aria-label="Edit category"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-edit"></use></svg></button><button class="icon-btn table-delete" data-action="category-deactivate" type="button" aria-label="Deactivate category"><svg fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-trash"></use></svg></button></div></footer></article>'
          );
        })
        .join("") || "<p>No violation categories configured.</p>";
  }
  function renderEscalatedIssues(rows) {
    state.escalatedIssues = rows || [];
    var body = document.querySelector(".forwarded-issue-table tbody");
    if (!body) return;
    body.innerHTML =
      state.escalatedIssues
        .map(function (row) {
          var closed = /resolved|dismissed/.test(row.status);
          return (
            '<tr data-forwarded-issue-id="' +
            row.id +
            '"><td><strong>#' +
            esc(row.violation_code) +
            "</strong><br><small>" +
            esc(dateTime(row.reported_at)) +
            "</small></td><td>" +
            esc(row.location_name || "Location unavailable") +
            '</td><td><div class="table-identity"><span class="avatar avatar--sm">' +
            esc(initials(row.driver_name)) +
            '</span><span class="table-identity__text"><strong>' +
            esc(row.driver_name || "Unknown driver") +
            "</strong><small>" +
            esc(row.registration_number || "No vehicle") +
            "</small></span></div></td><td><strong>" +
            esc(row.category) +
            "</strong><br><small>" +
            esc(row.description) +
            "</small></td><td>" +
            esc(row.manager_name || "Area manager") +
            "</td><td>" +
            badge(row.status) +
            "</td><td>" +
            (closed
              ? badge(row.status)
              : '<button class="btn btn--primary btn--sm" data-action="forwarded-issue-resolve" type="button">Mark resolved</button>') +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="7">No manager-forwarded driver reports.</td></tr>';
  }
  function renderNotifications(data) {
    var items = data.notifications || [],
      list = document.querySelector(
        '.topbar-popover[aria-label="Notifications"] .notification-list',
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
            esc(dateTime(item.created_at)) +
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
        /* Notifications do not block administration. */
      });
  }
  function renderAnalytics(data) {
    state.analytics = data;
    renderRevenueChart(data);
    var locations = data.locations || [];
    var totalRevenue = locations.reduce(function (sum, row) {
      return sum + Number(row.revenue || 0);
    }, 0);
    var totalBookings = locations.reduce(function (sum, row) {
      return sum + Number(row.reservations || 0);
    }, 0);
    document.querySelectorAll("#analytics .kpi-card").forEach(function (card) {
      var label = card.querySelector(".kpi-card__value span"),
        output = card.querySelector(".kpi-card__value strong");
      if (!label || !output) return;
      var value = label.textContent.toLowerCase();
      if (value.indexOf("reservation") >= 0)
        output.textContent = totalBookings.toLocaleString();
      else if (value.indexOf("revenue") >= 0)
        output.textContent = money(totalRevenue);
      else if (value.indexOf("performing") >= 0)
        output.textContent = locations[0] ? locations[0].name : "—";
    });
    var dashboardMetrics = (state.dashboard || {}).metrics || {};
    document.querySelectorAll("#analytics .kpi-card").forEach(function (card) {
      var label = card.querySelector(".kpi-card__value span"),
        output = card.querySelector(".kpi-card__value strong");
      if (
        label &&
        output &&
        label.textContent.toLowerCase().indexOf("occupancy") >= 0
      )
        output.textContent = dashboardMetrics.spaces
          ? Math.round(
              (Number(dashboardMetrics.occupied_spaces || 0) * 100) /
                Number(dashboardMetrics.spaces),
            ) + "%"
          : "0%";
    });
    var list = document.querySelector(".admin-analytics-list");
    if (list)
      list.innerHTML =
        locations
          .map(function (row) {
            var width = totalRevenue
              ? Math.round((Number(row.revenue || 0) * 100) / totalRevenue)
              : 0;
            return (
              "<div><span><strong>" +
              esc(row.name) +
              "</strong><small>" +
              Number(row.reservations || 0).toLocaleString() +
              " reservations</small></span><strong>" +
              money(row.revenue) +
              '</strong><div class="progress"><div class="progress__bar" style="width:' +
              width +
              '%"></div></div></div>'
            );
          })
          .join("") || "<p>No analytics data for the selected period.</p>";
    var reportRows = document.querySelector(".report-table tbody");
    if (reportRows)
      reportRows.innerHTML =
        locations
          .map(function (row) {
            var occupancy = Number(row.spaces)
              ? Math.round(
                  (Number(row.occupied || 0) * 100) / Number(row.spaces),
                )
              : 0;
            return (
              '<tr><th scope="row">' +
              esc(row.name) +
              "</th><td>" +
              Number(row.reservations || 0).toLocaleString() +
              "</td><td>" +
              occupancy +
              "%</td><td>" +
              money(row.revenue) +
              "</td><td>" +
              money(0) +
              "</td><td><strong>" +
              money(row.revenue) +
              "</strong></td><td>Current period</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="7">No report data for this period.</td></tr>';
    var foot = document.querySelector(".report-table tfoot");
    if (foot)
      foot.innerHTML =
        '<tr><th scope="row">Network total</th><td>' +
        totalBookings.toLocaleString() +
        "</td><td>—</td><td>" +
        money(totalRevenue) +
        "</td><td>" +
        money(0) +
        "</td><td>" +
        money(totalRevenue) +
        "</td><td>Current period</td></tr>";
    var summary = document.querySelectorAll(".report-summary strong");
    if (summary.length >= 4) {
      summary[0].textContent = money(totalRevenue);
      summary[1].textContent = money(totalRevenue);
      summary[2].textContent = totalBookings.toLocaleString();
      summary[3].textContent = totalBookings
        ? money(totalRevenue / totalBookings)
        : money(0);
    }
    var reportHeader = document.querySelector(
      ".report-document__header > div:last-child",
    );
    if (reportHeader) {
      var end = data.period_end
        ? new Date(data.period_end + "T00:00:00")
        : new Date();
      var heading = reportHeader.querySelector("strong"),
        generated = reportHeader.querySelector("small");
      if (heading)
        heading.textContent = end.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
      if (generated)
        generated.textContent = "Generated " + new Date().toLocaleString();
    }
  }
  function load() {
    return Promise.all([
      api.request("admin/profile"),
      api.request("admin/dashboard"),
      api.request("admin/managers"),
      api.request("admin/locations"),
      api.request("admin/manager-approvals"),
      api.request("admin/pricing-rules"),
      api.request("admin/violation-categories"),
      api.request("admin/forwarded-driver-reports"),
      api.request("admin/analytics?days=30"),
    ]).then(function (data) {
      renderProfile(data[0]);
      renderDashboard(data[1]);
      renderManagers(data[2].managers);
      renderLocations(data[3].locations);
      renderApprovals(data[4].applications);
      renderPricing(data[5].rules);
      renderCategories(data[6].categories);
      renderEscalatedIssues(data[7].reports);
      renderAnalytics(data[8]);
      var context = document.querySelector(".topbar-context small");
      if (context)
        context.textContent = new Date().toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
    });
  }
  function close(id) {
    ui.closeModal(document.getElementById(id));
  }
  function locationChoices() {
    return state.locations
      .map(function (row) {
        return row.id + ": " + row.name;
      })
      .join("\n");
  }
  function managerChoices() {
    return state.managers
      .filter(function (row) {
        return row.account_status === "active";
      })
      .map(function (row) {
        return row.id + ": " + row.full_name;
      })
      .join("\n");
  }
  function refresh(message) {
    return load().then(function () {
      if (message) ui.toast(message);
    });
  }

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form.closest(".admin-portal") && !form.closest(".modal")) return;
      if (form.id === "admin-profile-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request("admin/profile", {
            method: "PUT",
            body: {
              name: document.getElementById("admin-profile-name").value.trim(),
              phone: document
                .getElementById("admin-profile-phone")
                .value.trim(),
            },
          })
          .then(function () {
            return refresh("Profile saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.closest("#add-manager")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var name =
          document.getElementById("manager-first-name").value.trim() +
          " " +
          document.getElementById("manager-last-name").value.trim();
        api
          .request("admin/managers", {
            method: "POST",
            body: {
              name: name.trim(),
              email: document.getElementById("manager-email").value.trim(),
              phone: document.getElementById("manager-phone").value.trim(),
              password: document.getElementById("manager-password").value,
              location_id: document.getElementById("manager-location").value,
              shift_start: document.getElementById("manager-shift-start").value,
              shift_end: document.getElementById("manager-shift-end").value,
            },
          })
          .then(function () {
            form.reset();
            close("add-manager");
            return refresh(
              "Manager application created. Approve it before sign-in.",
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "edit-manager-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var managerId = document.getElementById("edit-manager-id").value;
        api
          .request("admin/managers/" + managerId, {
            method: "PUT",
            body: {
              name: document.getElementById("edit-manager-name").value.trim(),
              phone: document.getElementById("edit-manager-phone").value.trim(),
              location_id: document.getElementById("edit-manager-location")
                .value,
              shift_start: document.getElementById("edit-manager-shift-start")
                .value,
              shift_end: document.getElementById("edit-manager-shift-end")
                .value,
            },
          })
          .then(function () {
            close("edit-manager");
            return refresh("Manager details updated.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "edit-location-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var locationId = document.getElementById("edit-location-id").value;
        api
          .request("admin/locations/" + locationId, {
            method: "PUT",
            body: {
              name: document.getElementById("edit-location-name").value.trim(),
              address: document
                .getElementById("edit-location-address")
                .value.trim(),
              area: document.getElementById("edit-location-area").value.trim(),
              capacity: document.getElementById("edit-location-capacity").value,
              rate: document.getElementById("edit-location-rate").value,
              status: document.getElementById("edit-location-status").value,
              manager_user_id:
                document.getElementById("edit-location-manager").value || null,
            },
          })
          .then(function () {
            close("edit-location");
            return refresh("Parking location updated.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "add-space-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request(
            "admin/locations/" +
              document.getElementById("space-location").value +
              "/spaces",
            {
              method: "POST",
              body: {
                space_code: document.getElementById("space-code").value.trim(),
                space_type: document.getElementById("space-type").value,
                status: document.getElementById("space-status").value,
              },
            },
          )
          .then(function () {
            form.reset();
            close("add-space");
            return refresh("Parking space added.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.closest("#add-location")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request("admin/locations", {
            method: "POST",
            body: {
              name: document.getElementById("new-location-name").value.trim(),
              address: document
                .getElementById("new-location-address")
                .value.trim(),
              area: "Dhaka",
              capacity: document.getElementById("new-location-capacity").value,
              rate: document.getElementById("new-location-rate").value,
              manager_user_id:
                document.getElementById("new-location-manager").value || null,
            },
          })
          .then(function () {
            form.reset();
            close("add-location");
            return refresh(
              "Parking location created with its available spaces.",
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.closest("#add-pricing-rule")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        api
          .request("admin/pricing-rules", {
            method: "POST",
            body: {
              name: document.getElementById("pricing-rule-name").value.trim(),
              location_id:
                document.getElementById("pricing-rule-location").value || null,
              start_time: document.getElementById("pricing-start-time").value,
              end_time: document.getElementById("pricing-end-time").value,
              adjustment_type: document.getElementById(
                "pricing-adjustment-type",
              ).value,
              adjustment_value:
                document.getElementById("pricing-adjustment").value,
              is_active: form.querySelector('input[type="checkbox"]').checked,
            },
          })
          .then(function () {
            form.reset();
            document.getElementById("pricing-adjustment").value = 25;
            close("add-pricing-rule");
            return refresh("Pricing rule saved.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "edit-pricing-rule-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var pricingId = document.getElementById("edit-pricing-rule-id").value;
        api
          .request("admin/pricing-rules/" + pricingId, {
            method: "PUT",
            body: {
              name: document
                .getElementById("edit-pricing-rule-name")
                .value.trim(),
              location_id:
                document.getElementById("edit-pricing-rule-location").value ||
                null,
              start_time: document.getElementById("edit-pricing-start-time")
                .value,
              end_time: document.getElementById("edit-pricing-end-time").value,
              adjustment_type: document.getElementById(
                "edit-pricing-adjustment-type",
              ).value,
              adjustment_value: document.getElementById(
                "edit-pricing-adjustment",
              ).value,
              is_active: document.getElementById("edit-pricing-active").checked,
            },
          })
          .then(function () {
            close("edit-pricing-rule");
            return refresh("Pricing rule updated.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.id === "edit-violation-category-form") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var categoryId = document.getElementById(
          "edit-violation-category-id",
        ).value;
        api
          .request("admin/violation-categories/" + categoryId, {
            method: "PUT",
            body: {
              name: document
                .getElementById("edit-violation-category-name")
                .value.trim(),
              description: document
                .getElementById("edit-violation-category-description")
                .value.trim(),
              severity: document.getElementById("edit-violation-severity")
                .value,
              penalty: document.getElementById("edit-violation-penalty").value,
            },
          })
          .then(function () {
            close("edit-violation-category");
            return refresh("Violation category updated.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (form.closest("#add-violation-category")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!form.checkValidity()) return form.reportValidity();
        var severity =
          {
            Minor: "low",
            Moderate: "medium",
            Major: "high",
            Critical: "critical",
          }[document.getElementById("violation-severity").value] || "medium";
        api
          .request("admin/violation-categories", {
            method: "POST",
            body: {
              name: document
                .getElementById("violation-category-name")
                .value.trim(),
              description: document
                .getElementById("violation-category-description")
                .value.trim(),
              severity: severity,
              penalty: document.getElementById("violation-penalty").value || 0,
            },
          })
          .then(function () {
            form.reset();
            close("add-violation-category");
            return refresh("Violation category saved.");
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
      var button = event.target.closest(
        "[data-action], [data-report-download]",
      );
      if (!button) return;
      var action = button.dataset.action;
      if (button.hasAttribute("data-report-download")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var report = state.analytics || { locations: [] };
        var lines = (report.locations || []).map(function (row) {
          return (
            row.name +
            ": " +
            row.reservations +
            " reservations, " +
            money(row.revenue)
          );
        });
        ui.createPdf(
          "ParkFlow Revenue Report",
          lines,
          "parkflow-revenue-report.pdf",
        );
        return;
      }
      if (!action) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action === "reservation-details") {
        var reservationRow = button.closest("tr");
        if (reservationRow && reservationRow.dataset.reservationId)
          openReservationDetails(reservationRow.dataset.reservationId);
        return;
      }
      if (action === "manager-suspend") {
        openManagerRemoval(button.closest("tr").dataset.managerId);
      } else if (action === "manager-activate") {
        var activateId = button.closest("tr").dataset.managerId;
        button.disabled = true;
        api
          .request("admin/managers/" + activateId + "/activate", {
            method: "POST",
            body: {},
          })
          .then(function () {
            return refresh("Manager account reactivated.");
          })
          .catch(function (error) {
            button.disabled = false;
            ui.toast(error.message, "warning");
          });
      } else if (action === "manager-remove-confirm") {
        var managerId = state.managerPendingRemoval;
        if (!managerId) return;
        api
          .request("admin/managers/" + managerId, {
            method: "DELETE",
            body: {},
          })
          .then(function () {
            state.managerPendingRemoval = null;
            close("remove-manager");
            return refresh("Manager access suspended.");
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (
        action === "application-approve" ||
        action === "application-reject"
      ) {
        openManagerApprovalDecision(
          button.closest("tr").dataset.applicationId,
          action === "application-approve" ? "approve" : "reject",
        );
      } else if (action === "manager-approval-confirm") {
        var review = state.managerApprovalDecision;
        if (!review) return;
        api
          .request("admin/manager-approvals/" + review.id, {
            method: "POST",
            body: { decision: review.decision },
          })
          .then(function () {
            state.managerApprovalDecision = null;
            close("manager-approval-decision");
            return refresh(
              "Manager application " +
                (review.decision === "approve" ? "approved." : "rejected."),
            );
          })
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      } else if (action === "pricing-toggle") {
        var rule = state.rules.filter(function (row) {
          return (
            String(row.id) === button.closest(".pricing-rule").dataset.ruleId
          );
        })[0];
        if (!rule) return;
        api
          .request("admin/pricing-rules/" + rule.id, {
            method: "PUT",
            body: {
              name: rule.name,
              location_id: rule.location_id,
              start_time: time(rule.start_time),
              end_time: time(rule.end_time),
              adjustment_type: rule.adjustment_type || "percentage",
              adjustment_value: rule.adjustment_value,
              is_active: button.checked,
            },
          })
          .then(function () {
            return refresh("Pricing rule updated.");
          })
          .catch(function (error) {
            button.checked = !button.checked;
            ui.toast(error.message, "warning");
          });
      } else if (action === "pricing-edit") {
        editPricing(button.closest(".pricing-rule").dataset.ruleId);
      } else if (action === "pricing-delete") {
        requestDeletion(
          "pricing",
          button.closest(".pricing-rule").dataset.ruleId,
        );
      } else if (action === "reservation-details") {
        var row = button.closest("tr");
        ui.toast(
          "Reservation " +
            row.cells[0].textContent.trim() +
            ": " +
            row.cells[1].innerText.replace(/\s+/g, " ") +
            ", " +
            row.cells[2].textContent.trim() +
            ".",
        );
      } else if (action === "manager-edit") {
        editManager(button.closest("tr").dataset.managerId);
      } else if (action === "location-edit") {
        editLocation(button.closest(".admin-location-card").dataset.locationId);
      } else if (action === "category-edit") {
        editCategory(button.closest(".violation-category").dataset.categoryId);
      } else if (action === "category-deactivate") {
        requestDeletion(
          "category",
          button.closest(".violation-category").dataset.categoryId,
        );
      } else if (action === "admin-delete-cancel") {
        state.pendingDeletion = null;
        close("admin-delete-confirm");
      } else if (action === "admin-delete-confirm") {
        confirmDeletion();
      } else if (action === "forwarded-issue-resolve") {
        var caseId = button.closest("tr").dataset.forwardedIssueId;
        if (!caseId) return;
        button.disabled = true;
        api
          .request("admin/forwarded-driver-reports/" + caseId + "/resolve", {
            method: "POST",
            body: { note: "Resolved by administrator." },
          })
          .then(function () {
            return refresh("Forwarded driver report resolved.");
          })
          .catch(function (error) {
            button.disabled = false;
            ui.toast(error.message, "warning");
          });
      } else if (action === "notifications-read") {
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
      }
    },
    true,
  );

  function editManager(id) {
    var row = state.managers.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!row) return;
    var assigned = state.locations.filter(function (location) {
      return (
        String(row.locations || "")
          .split(", ")
          .indexOf(location.name) >= 0
      );
    })[0];
    document.getElementById("edit-manager-id").value = row.id;
    document.getElementById("edit-manager-name").value = row.full_name || "";
    document.getElementById("edit-manager-phone").value = row.phone || "";
    document.getElementById("edit-manager-location").value = assigned
      ? assigned.id
      : "";
    document.getElementById("edit-manager-shift-start").value = String(
      row.shift_start || "08:00",
    ).slice(0, 5);
    document.getElementById("edit-manager-shift-end").value = String(
      row.shift_end || "16:00",
    ).slice(0, 5);
    ui.openModal(document.getElementById("edit-manager"));
  }
  function openManagerRemoval(id) {
    var row = state.managers.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!row) return;
    state.managerPendingRemoval = row.id;
    document.querySelectorAll(".remove-manager-name").forEach(function (item) {
      item.textContent = row.full_name;
    });
    ui.openModal(document.getElementById("remove-manager"));
  }
  function openManagerApprovalDecision(id, decision) {
    var row = document.querySelector('[data-application-id="' + id + '"]');
    var name = row
      ? row.querySelector(".table-identity__text strong").textContent
      : "this manager";
    state.managerApprovalDecision = { id: id, decision: decision };
    var approving = decision === "approve";
    document.getElementById("manager-approval-decision-title").textContent =
      (approving ? "Approve " : "Reject ") + name + "?";
    document.querySelector(".manager-approval-decision-copy").textContent =
      approving
        ? "This manager will gain access to their assigned location."
        : "This manager application will be declined.";
    document.querySelector(".manager-approval-decision-detail").textContent =
      approving
        ? "You can change the manager assignment later from the Managers section."
        : "The applicant will not be able to sign in with this application.";
    var confirm = document.querySelector(
      '[data-action="manager-approval-confirm"]',
    );
    confirm.textContent = approving ? "Approve manager" : "Reject application";
    confirm.classList.toggle("btn--danger", !approving);
    confirm.classList.toggle("btn--primary", approving);
    ui.openModal(document.getElementById("manager-approval-decision"));
  }
  function editLocation(id) {
    var row = state.locations.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!row) return;
    var manager = state.managers.filter(function (item) {
      return (
        String(row.managers || "")
          .split(", ")
          .indexOf(item.full_name) >= 0
      );
    })[0];
    document.getElementById("edit-location-id").value = row.id;
    document.getElementById("edit-location-name").value = row.name || "";
    document.getElementById("edit-location-address").value = row.address || "";
    document.getElementById("edit-location-area").value = row.area || "";
    document.getElementById("edit-location-capacity").value =
      row.total_capacity || "";
    document.getElementById("edit-location-rate").value =
      row.base_hourly_rate || "";
    document.getElementById("edit-location-status").value =
      row.status || "operational";
    document.getElementById("edit-location-manager").value = manager
      ? manager.id
      : "";
    ui.openModal(document.getElementById("edit-location"));
  }
  function editCategory(id) {
    var row = state.categories.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!row) return;
    document.getElementById("edit-violation-category-id").value = row.id;
    document.getElementById("edit-violation-category-name").value =
      row.name || "";
    document.getElementById("edit-violation-category-description").value =
      row.description || "";
    document.getElementById("edit-violation-severity").value =
      row.default_severity || "medium";
    document.getElementById("edit-violation-penalty").value =
      row.default_penalty || 0;
    ui.openModal(document.getElementById("edit-violation-category"));
  }
  function editPricing(id) {
    var row = state.rules.filter(function (item) {
      return String(item.id) === String(id);
    })[0];
    if (!row) return;
    document.getElementById("edit-pricing-rule-id").value = row.id;
    document.getElementById("edit-pricing-rule-name").value = row.name || "";
    document.getElementById("edit-pricing-rule-location").value =
      row.location_id || "";
    document.getElementById("edit-pricing-start-time").value = time(
      row.start_time,
    );
    document.getElementById("edit-pricing-end-time").value = time(row.end_time);
    document.getElementById("edit-pricing-adjustment-type").value =
      row.adjustment_type || "percentage";
    document.getElementById("edit-pricing-adjustment").value =
      row.adjustment_value;
    document.getElementById("edit-pricing-active").checked =
      Number(row.is_active) === 1;
    ui.openModal(document.getElementById("edit-pricing-rule"));
  }
  function requestDeletion(kind, id) {
    var row = (kind === "pricing" ? state.rules : state.categories).filter(
      function (item) {
        return String(item.id) === String(id);
      },
    )[0];
    if (!row) return;
    state.pendingDeletion = { kind: kind, id: row.id, name: row.name };
    var pricing = kind === "pricing",
      title = document.getElementById("admin-delete-confirm-title"),
      copy = document.getElementById("admin-delete-confirm-copy"),
      detail = document.getElementById("admin-delete-confirm-detail"),
      confirm = document.querySelector('[data-action="admin-delete-confirm"]');
    title.textContent =
      (pricing ? "Delete" : "Deactivate") + " " + row.name + "?";
    copy.textContent = pricing
      ? "This pricing rule will stop applying to every future reservation immediately."
      : "This category will no longer be available to managers for new violations.";
    detail.textContent = pricing
      ? "Existing reservations keep their recorded prices."
      : "Existing violation history stays available for reports.";
    confirm.textContent = pricing ? "Delete rule" : "Deactivate category";
    ui.openModal(document.getElementById("admin-delete-confirm"));
  }
  function confirmDeletion() {
    var pending = state.pendingDeletion;
    if (!pending) return;
    var route =
      pending.kind === "pricing"
        ? "admin/pricing-rules/" + pending.id
        : "admin/violation-categories/" + pending.id;
    api
      .request(route, { method: "DELETE", body: {} })
      .then(function () {
        state.pendingDeletion = null;
        close("admin-delete-confirm");
        return refresh(
          pending.kind === "pricing"
            ? "Pricing rule deleted."
            : "Violation category deactivated.",
        );
      })
      .catch(function (error) {
        ui.toast(error.message, "warning");
      });
  }
  var search = document.getElementById("manager-search");
  if (search)
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      document.querySelectorAll("#managers tbody tr").forEach(function (row) {
        row.hidden = !!q && row.textContent.toLowerCase().indexOf(q) === -1;
      });
    });
  var managerStatus = document.querySelector(".manager-filterbar select");
  if (managerStatus) {
    var filterManagers = function () {
      var wanted = managerStatus.value.toLowerCase();
      document.querySelectorAll("#managers tbody tr").forEach(function (row) {
        var status = (row.cells[4] ? row.cells[4].textContent : "")
          .trim()
          .toLowerCase();
        row.hidden = wanted !== "all statuses" && status !== wanted;
      });
    };
    managerStatus.addEventListener("change", filterManagers);
    var filterButton = document.querySelector(".manager-filterbar button");
    if (filterButton)
      filterButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        filterManagers();
      });
  }
  var globalSearch = document.querySelector(".topbar-search");
  if (globalSearch)
    globalSearch.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var query = (document.getElementById("admin-search").value || "")
        .trim()
        .toLowerCase();
      var found = state.managers
        .concat(state.locations, state.rules, state.categories)
        .filter(function (row) {
          return JSON.stringify(row).toLowerCase().indexOf(query) >= 0;
        });
      if (!query)
        return ui.toast(
          "Enter a manager, location, pricing rule, or category to search.",
          "warning",
        );
      if (!found.length) return ui.toast("No matching live records found.");
      ui.toast(
        found.length +
          " matching live record" +
          (found.length === 1 ? "" : "s") +
          " found.",
      );
    });
  document
    .querySelectorAll("#analytics .section-toolbar__actions select")
    .forEach(function (select) {
      select.addEventListener("change", function () {
        var days = /7/.test(select.value)
          ? 7
          : /year/i.test(select.value)
            ? 365
            : 30;
        api
          .request("admin/analytics?days=" + days)
          .then(renderAnalytics)
          .catch(function (error) {
            ui.toast(error.message, "warning");
          });
      });
    });
  function loadOverviewAnalytics(days) {
    api
      .request("admin/analytics?days=" + days)
      .then(function (data) {
        renderAnalytics(data);
        document
          .querySelectorAll("[data-overview-analytics-period]")
          .forEach(function (button) {
            var active =
              Number(button.dataset.overviewAnalyticsPeriod) === Number(days);
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
          });
      })
      .catch(function (error) {
        ui.toast(error.message, "warning");
      });
  }
  document
    .querySelectorAll("[data-overview-analytics-period]")
    .forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        loadOverviewAnalytics(Number(button.dataset.overviewAnalyticsPeriod));
      });
    });
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
  var previewForm = document.querySelector(".pricing-preview__controls");
  if (previewForm)
    previewForm.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var value = document.getElementById("pricing-preview-time").value,
          button = previewForm.querySelector('button[type="submit"]');
        if (!value) return;
        var when = new Date();
        var parts = value.split(":");
        when.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        if (button) {
          button.disabled = true;
          button.textContent = "Applying…";
        }
        updateRatePreview(when)
          .then(function () {
            ui.toast("Rate preview updated from the live pricing rules.");
          })
          .catch(function () {
            /* The pricing request already showed its error. */
          })
          .finally(function () {
            if (button) {
              button.disabled = false;
              button.textContent = "Apply preview";
            }
          });
      },
      true,
    );
  var previewLocationSelect = document.getElementById(
    "pricing-preview-location",
  );
  if (previewLocationSelect)
    previewLocationSelect.addEventListener("change", function () {
      updateRatePreview(pricingPreviewDate()).catch(function () {
        /* The preview shows its own request error. */
      });
    });
  var previewDurationSelect = document.getElementById(
    "pricing-preview-duration",
  );
  if (previewDurationSelect)
    previewDurationSelect.addEventListener("change", function () {
      updateRatePreview(pricingPreviewDate()).catch(function () {
        /* The preview shows its own request error. */
      });
    });
  var previewTimeSelect = document.getElementById("pricing-preview-time");
  if (previewTimeSelect)
    previewTimeSelect.addEventListener("change", function () {
      updateRatePreview(pricingPreviewDate()).catch(function () {
        /* The preview shows its own request error. */
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
  guard()
    .then(load)
    .then(loadNotifications)
    .catch(function (error) {
      if (error && error.message !== "Sign in required.")
        ui.toast(error.message, "warning");
    });
})();
