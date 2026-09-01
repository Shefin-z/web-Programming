/* Driver portal: availability search, reservation preview, receipts, issues, and vehicles. */
(function () {
  'use strict';

  var ui = window.ParkFlowUI;
  if (!ui) return;

  var reservationForm = document.querySelector('.reservation-form');
  var selectedParkingSlot = null;
  var driverRouteStorageKey = 'parkflow-driver-active-route';
  var driverRoutes = ['overview', 'profile', 'availability', 'reservation', 'active-booking', 'history', 'issues', 'messages', 'vehicles'];
  var driverProfileStorageKey = 'parkflow-driver-profile';

  function isDriverRoute(routeId) {
    return driverRoutes.indexOf(routeId) !== -1;
  }

  function saveDriverRoute(routeId) {
    try {
      window.sessionStorage.setItem(driverRouteStorageKey, routeId);
    } catch (error) {
      /* The portal still works if browser storage is unavailable. */
    }
  }

  function getInitialDriverRoute() {
    var routeFromUrl = (window.location.hash || '').slice(1);
    if (isDriverRoute(routeFromUrl)) return routeFromUrl;
    try {
      var savedRoute = window.sessionStorage.getItem(driverRouteStorageKey);
      if (isDriverRoute(savedRoute)) return savedRoute;
    } catch (error) {
      /* Fall back to the dashboard when browser storage is unavailable. */
    }
    return 'overview';
  }

  /*
   * The Driver sidebar uses its own route controller. It does not depend on
   * hash scrolling, so every desktop/mobile sidebar item opens a visible view.
   */
  function openDriverSection(routeId) {
    if (!isDriverRoute(routeId)) return;
    var targetId = routeId === 'active-booking' ? 'overview' : routeId;
    var target = document.getElementById(targetId);
    var focusTarget = document.getElementById(routeId) || target;
    var content = document.querySelector('.dashboard-content');
    if (!target || !content) return;

    Array.prototype.filter.call(content.children, function (item) {
      return item.classList && item.classList.contains('driver-section');
    }).forEach(function (section) {
      var isCurrent = section === target;
      section.classList.toggle('is-view-active', isCurrent);
      /* Inline visibility makes the selected portal view reliable even if a CSS view rule is overridden. */
      section.style.display = isCurrent ? 'grid' : 'none';
    });
    document.querySelectorAll('.driver-portal .sidebar-nav__link').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + routeId);
    });
    document.querySelectorAll('.driver-portal .sidebar-profile[href="#profile"]').forEach(function (link) {
      link.classList.toggle('is-active', routeId === 'profile');
    });
    content.scrollTop = focusTarget === target ? 0 : Math.max(0, focusTarget.offsetTop - 16);
    saveDriverRoute(routeId);
  }

  function initialiseDriverNavigation() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('.driver-portal a[href^="#"]');
      if (!link) return;
      if (link.closest('.modal')) return;
      var routeId = (link.getAttribute('href') || '').replace(/^#/, '');
      if (!isDriverRoute(routeId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDriverSection(routeId);
      /* On mobile the sidebar is a <details> overlay; close it so the selected view is visible. */
      var mobileMenu = link.closest('details.mobile-sidebar');
      if (mobileMenu) mobileMenu.removeAttribute('open');
    }, true);

    document.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button || !/^Open booking$/i.test(button.textContent.trim())) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDriverSection('active-booking');
    }, true);

    /* Restore the last driver screen after a browser refresh. */
    openDriverSection(getInitialDriverRoute());
  }

  function updateDriverName(name) {
    document.querySelectorAll('.driver-name').forEach(function (element) {
      element.textContent = name;
    });
  }

  function applyDriverProfile(form, profile) {
    if (!profile) return;
    ['name', 'phone', 'email', 'city', 'emergencyContact', 'language'].forEach(function (fieldName) {
      if (profile[fieldName] !== undefined && form.elements[fieldName]) {
        form.elements[fieldName].value = profile[fieldName];
      }
    });
    if (form.elements.updates && profile.updates !== undefined) {
      form.elements.updates.checked = profile.updates;
    }
    if (profile.name) updateDriverName(profile.name);
  }

  function readSavedDriverProfile() {
    try {
      var savedProfile = window.sessionStorage.getItem(driverProfileStorageKey);
      return savedProfile ? JSON.parse(savedProfile) : null;
    } catch (error) {
      return null;
    }
  }

  function initialiseProfile() {
    var form = document.getElementById('driver-profile-form');
    if (!form) return;

    var savedProfile = readSavedDriverProfile();
    applyDriverProfile(form, savedProfile);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var profile = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        city: form.elements.city.value.trim(),
        emergencyContact: form.elements.emergencyContact.value.trim(),
        language: form.elements.language.value,
        updates: form.elements.updates.checked
      };
      try {
        window.sessionStorage.setItem(driverProfileStorageKey, JSON.stringify(profile));
      } catch (error) {
        /* Saving is still reflected on screen when browser storage is unavailable. */
      }
      updateDriverName(profile.name);
      ui.toast('Profile changes saved in this frontend demo.');
    });

    form.addEventListener('reset', function () {
      window.setTimeout(function () {
        applyDriverProfile(form, readSavedDriverProfile());
      }, 0);
    });
  }

  function money(amount) {
    return '৳' + Number(amount).toLocaleString('en-US');
  }

  function getReservationControls() {
    if (!reservationForm) return null;
    var selects = reservationForm.querySelectorAll('select');
    return {
      date: reservationForm.querySelector('input[type="date"]'),
      duration: reservationForm.querySelector('input[name="duration"]:checked'),
      location: selects[0],
      time: selects[1]
    };
  }

  function rateFromOption(option) {
    var match = option && option.textContent.match(/(\d+)/);
    return match ? Number(match[1]) : 80;
  }

  function durationFromControl(control) {
    if (!control) return 2;
    return Array.prototype.indexOf.call(reservationForm.querySelectorAll('input[name="duration"]'), control) + 1;
  }

  function readableDate(value) {
    var date = value ? new Date(value + 'T12:00:00') : new Date();
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', weekday: 'long' });
  }

  function calculateEndTime(label, hours) {
    var match = String(label).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return label;
    var hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    var minutes = Number(match[2]);
    var end = new Date(2000, 0, 1, hour + hours, minutes);
    return end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function updateReservationPreview() {
    var controls = getReservationControls();
    if (!controls || !controls.location) return;
    var selectedOption = controls.location.options[controls.location.selectedIndex];
    var location = selectedOption.textContent.split('—')[0].trim();
    var rate = rateFromOption(selectedOption);
    var duration = durationFromControl(controls.duration);
    var arrival = controls.time ? controls.time.options[controls.time.selectedIndex].textContent : '10:30 AM';
    var departure = calculateEndTime(arrival, duration);
    var subtotal = rate * duration;
    var total = subtotal + 8;
    var date = readableDate(controls.date && controls.date.value);

    var summary = document.querySelector('.booking-summary');
    if (summary) {
      var heading = summary.querySelector('h3');
      var slotMessage = summary.querySelector('header p');
      var times = summary.querySelectorAll('.booking-summary__timeline strong');
      var dates = summary.querySelectorAll('.booking-summary__timeline p');
      var period = summary.querySelector('.booking-summary__timeline em');
      var costs = summary.querySelectorAll('.booking-summary__cost dd');
      if (heading) heading.textContent = location;
      if (slotMessage) {
        slotMessage.textContent = selectedParkingSlot
          ? 'Selected parking slot: ' + selectedParkingSlot
          : 'Select a free parking slot below.';
      }
      if (times[0]) times[0].textContent = arrival;
      if (times[1]) times[1].textContent = departure;
      if (period) period.textContent = duration + (duration === 1 ? ' hour' : ' hours');
      dates.forEach(function (item) { item.textContent = date; });
      if (costs[0]) costs[0].textContent = money(subtotal);
      if (costs[1]) costs[1].textContent = money(8);
      if (costs[3]) costs[3].textContent = money(total);
    }
    var windowSummary = reservationForm.querySelector('.reservation-time-summary strong');
    if (windowSummary) windowSummary.textContent = arrival + ' → ' + departure;
    var reserveButton = document.getElementById('create-reservation');
    if (reserveButton) {
      reserveButton.dataset.total = String(total);
      reserveButton.textContent = selectedParkingSlot
        ? 'Reserve ' + selectedParkingSlot + ' for ' + money(total)
        : 'Select a parking slot';
    }
  }

  function selectParkingSlot(slotButton) {
    selectedParkingSlot = slotButton.dataset.slot;
    document.querySelectorAll('.slot-button--free').forEach(function (button) {
      var isSelected = button === slotButton;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    updateReservationPreview();
    ui.toast('Slot ' + selectedParkingSlot + ' selected for your vehicle.');
  }

  function updateReservationConfirmation() {
    var controls = getReservationControls();
    if (!controls || !controls.location) return;
    var location = controls.location.options[controls.location.selectedIndex].textContent.split('—')[0].trim();
    var duration = durationFromControl(controls.duration);
    var arrival = controls.time.options[controls.time.selectedIndex].textContent;
    var total = document.getElementById('create-reservation').dataset.total || '168';
    var modal = document.getElementById('reservation-confirmed');
    if (!modal) return;

    var intro = modal.querySelector('.reservation-success > p');
    var ticketHeader = modal.querySelectorAll('.reservation-success__ticket header strong');
    var ticketDetails = modal.querySelectorAll('.reservation-success__ticket > div strong');
    if (intro) intro.textContent = 'We reserved slot ' + selectedParkingSlot + ' at ' + location + '.';
    if (ticketHeader[1]) ticketHeader[1].textContent = selectedParkingSlot;
    if (ticketDetails[0]) ticketDetails[0].textContent = arrival;
    if (ticketDetails[1]) ticketDetails[1].textContent = duration + (duration === 1 ? ' hour' : ' hours');
    if (ticketDetails[2]) ticketDetails[2].textContent = money(total);

    var activeBooking = document.getElementById('active-booking');
    if (activeBooking) {
      var activeLocation = activeBooking.querySelector('.booking-location h2');
      var activeDetails = activeBooking.querySelectorAll('.booking-details dd');
      if (activeLocation) activeLocation.textContent = location;
      if (activeDetails[2]) activeDetails[2].textContent = selectedParkingSlot;
    }
  }

  function chooseLocationFromResult(link) {
    var item = link.closest('.map-result, .nearby-item');
    if (!item || !reservationForm) return;
    var name = item.querySelector('h3');
    var locationSelect = reservationForm.querySelector('select');
    if (name && locationSelect) {
      Array.prototype.some.call(locationSelect.options, function (option) {
        if (option.textContent.indexOf(name.textContent.trim()) !== -1) {
          locationSelect.value = option.value;
          return true;
        }
        return false;
      });
      updateReservationPreview();
    }
    openDriverSection('reservation');
  }

  function addVehicleToReservation(make, plate) {
    var container = document.querySelector('.vehicle-options');
    if (!container) return;
    var addButton = container.querySelector('button');
    var label = document.createElement('label');
    label.innerHTML = '<input type="radio" name="vehicle"><span class="vehicle-option"><i>🚗</i><span><strong></strong><small></small></span><em>✓</em></span>';
    label.querySelector('strong').textContent = make;
    label.querySelector('small').textContent = plate;
    container.insertBefore(label, addButton);
  }

  function addVehicleCard(make, plate, type) {
    var grid = document.querySelector('.driver-vehicle-grid');
    if (!grid) return;
    var card = document.createElement('article');
    card.className = 'driver-vehicle-card';
    card.innerHTML = '<header><span class="driver-vehicle-card__icon">🚗</span></header><div><h3></h3><p></p></div><strong class="driver-vehicle-card__plate"></strong><dl><div><dt>Status</dt><dd class="text-success">Verified</dd></div></dl><footer><span>Available for reservations</span></footer>';
    card.querySelector('h3').textContent = make;
    card.querySelector('p').textContent = type;
    card.querySelector('.driver-vehicle-card__plate').textContent = plate;
    grid.appendChild(card);
  }

  function initialiseReservation() {
    if (!reservationForm) return;
    reservationForm.querySelectorAll('select, input[type="date"], input[name="duration"]').forEach(function (control) {
      control.addEventListener('change', updateReservationPreview);
    });
    updateReservationPreview();

    var addVehicle = reservationForm.querySelector('.vehicle-options button');
    if (addVehicle) addVehicle.addEventListener('click', function () { ui.openModal(document.getElementById('add-driver-vehicle')); });

    reservationForm.querySelectorAll('.slot-button--free').forEach(function (slotButton) {
      slotButton.addEventListener('click', function () { selectParkingSlot(slotButton); });
    });

    var button = document.getElementById('create-reservation');
    if (button) {
      button.addEventListener('click', function () {
        if (!selectedParkingSlot) {
          ui.toast('Please select a free parking slot before reserving.', 'warning');
          return;
        }
        updateReservationConfirmation();
        ui.openModal(document.getElementById('reservation-confirmed'));
        ui.toast('Slot ' + selectedParkingSlot + ' reserved in the frontend demo.');
      });
    }
  }

  function initialiseAvailability() {
    document.querySelectorAll('.driver-map-search').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        ui.toast('Availability refreshed for your selected time slot.');
      });
    });
    document.querySelectorAll('.driver-map-pin').forEach(function (pin) {
      pin.addEventListener('click', function () {
        document.querySelectorAll('.driver-map-pin').forEach(function (item) { item.classList.toggle('is-selected', item === pin); });
        ui.toast('Parking location selected. Choose Select to continue.');
      });
    });
    document.querySelectorAll('.map-result a[href="#reservation"], .nearby-item a[href="#reservation"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        chooseLocationFromResult(link);
      });
    });
    document.querySelectorAll('#availability input[type="search"], #driver-search').forEach(function (input) {
      input.addEventListener('change', function () { ui.toast('Searching for parking near ' + (input.value || 'your location') + '.'); });
    });
  }

  function initialiseIssuesAndVehicles() {
    var issueForm = document.querySelector('.issue-form');
    if (issueForm) {
      issueForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!issueForm.checkValidity()) {
          issueForm.reportValidity();
          return;
        }
        issueForm.reset();
        ui.toast('Issue report #IS-2051 submitted to the parking manager.');
      });
    }

    document.querySelectorAll('.issue-upload input[type="file"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var label = input.closest('.issue-upload');
        var name = input.files && input.files[0] ? input.files[0].name : '';
        if (name && label) label.querySelector('strong').textContent = name + ' attached';
      });
    });

    var vehicleForm = document.querySelector('#add-driver-vehicle form');
    if (vehicleForm) {
      vehicleForm.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!vehicleForm.checkValidity()) {
          vehicleForm.reportValidity();
          return;
        }
        var make = document.getElementById('new-vehicle-make').value.trim();
        var plate = document.getElementById('new-vehicle-plate').value.trim().toUpperCase();
        var type = document.getElementById('new-vehicle-type').value;
        addVehicleToReservation(make, plate);
        addVehicleCard(make, plate, type);
        vehicleForm.reset();
        ui.closeModal(document.getElementById('add-driver-vehicle'));
        ui.toast('Vehicle added to this frontend demo.');
      });
    }

    document.querySelectorAll('.issue-ticket button').forEach(function (button) {
      button.addEventListener('click', function () { ui.toast('Issue details opened in the demo.'); });
    });
  }

  function initialiseReceiptsAndActions() {
    document.querySelectorAll('#receipt-preview button').forEach(function (button) {
      if (/download/i.test(button.textContent)) {
        button.addEventListener('click', function () {
          ui.createPdf('ParkFlow Parking Receipt', [
            'Receipt: RC-83942-0725',
            'Reservation: PF-83942',
            'Location: Police Plaza Parking',
            'Vehicle: DHA-METRO-GA-18-7264',
            'Space: C-12',
            'Total paid: BDT 126',
            'Thank you for parking with ParkFlow.'
          ], 'parkflow-receipt-PF-83942.pdf');
        });
      }
    });
    document.querySelectorAll('#history button').forEach(function (button) {
      if (/export all/i.test(button.textContent)) {
        button.addEventListener('click', function () {
          ui.createPdf('ParkFlow Parking History', ['Driver: Nafis Mahmud', 'Sessions: 14', 'Total parking time: 31h 45m', 'Total paid: BDT 2,580'], 'parkflow-parking-history.pdf');
        });
      }
    });
    document.querySelectorAll('button, a').forEach(function (control) {
      if (/^(Directions|Get directions)$/i.test(control.textContent.trim())) {
        control.addEventListener('click', function (event) {
          event.preventDefault();
          ui.toast('Directions are ready: use Gate 1 and follow the Zone A signs.');
        });
      }
    });
  }

  initialiseReservation();
  initialiseAvailability();
  initialiseIssuesAndVehicles();
  initialiseReceiptsAndActions();
  initialiseProfile();
  initialiseDriverNavigation();
})();
