/* Guest-facing interactions: location discovery, filters, map pins, and support. */
(function () {
  'use strict';

  var ui = window.ParkFlowUI;
  if (!ui) return;

  function selectedMapPin(pin) {
    document.querySelectorAll('.public-map__pin').forEach(function (item) {
      item.classList.toggle('is-selected', item === pin);
    });
    ui.toast(pin.getAttribute('aria-label') + ' selected.');
  }

  var locationCards = Array.prototype.slice.call(document.querySelectorAll('.location-card'));

  function getLocationFeatures(card) {
    return Array.prototype.map.call(card.querySelectorAll('.location-card__features li'), function (item) {
      return item.textContent.trim();
    });
  }

  function openLocationDetails(card) {
    var modal = document.getElementById('guest-location-details');
    if (!modal || !card) return;
    var name = card.querySelector('.location-card__header h3');
    var address = card.querySelector('.location-card__header p');
    var rate = card.dataset.rate || '0';
    var availability = card.dataset.availability || '0';
    var distance = card.dataset.distance || '—';
    var title = modal.querySelector('h2');
    var addressTarget = modal.querySelector('.guest-location-details__address');
    var rateTarget = modal.querySelector('.guest-location-details__rate');
    var availabilityTarget = modal.querySelector('.guest-location-details__availability');
    var distanceTarget = modal.querySelector('.guest-location-details__distance');
    var featuresTarget = modal.querySelector('.guest-location-details__features');

    if (title) title.textContent = name ? name.textContent.trim() : 'Parking location details';
    if (addressTarget) addressTarget.textContent = address ? address.textContent.trim() : 'Dhaka';
    if (rateTarget) rateTarget.textContent = '৳' + rate + '/hr';
    if (availabilityTarget) availabilityTarget.textContent = availability + ' spaces free';
    if (distanceTarget) distanceTarget.textContent = distance + ' min walk';
    if (featuresTarget) {
      featuresTarget.innerHTML = '';
      getLocationFeatures(card).forEach(function (feature) {
        var item = document.createElement('li');
        item.textContent = feature;
        featuresTarget.appendChild(item);
      });
    }
    ui.openModal(modal);
  }

  function updateLocationResultCount(visibleCount) {
    var count = document.querySelector('.location-results__meta p strong');
    if (count) count.textContent = visibleCount + ' matching location' + (visibleCount === 1 ? '' : 's');
  }

  function filterLocationCards(query, type, maximumRate) {
    var normalizedQuery = String(query || '').split(',')[0].trim().toLowerCase();
    var normalizedType = String(type || '').toLowerCase();
    var visibleCount = 0;
    locationCards.forEach(function (card) {
      var matchesQuery = !normalizedQuery || card.textContent.toLowerCase().indexOf(normalizedQuery) !== -1;
      var matchesType = !normalizedType || normalizedType === 'all parking types' || card.dataset.locationType === normalizedType.replace(' ', '-');
      var matchesPrice = !maximumRate || Number(card.dataset.rate) < maximumRate;
      var isVisible = matchesQuery && matchesType && matchesPrice;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    updateLocationResultCount(visibleCount);
    return visibleCount;
  }

  function sortLocationCards(order) {
    var results = document.getElementById('all-locations');
    var moreLink = results && results.querySelector('.location-results__more');
    if (!results || !moreLink) return;
    locationCards.slice().sort(function (first, second) {
      if (order === 'Lowest price') return Number(first.dataset.rate) - Number(second.dataset.rate);
      if (order === 'Nearest first') return Number(first.dataset.distance) - Number(second.dataset.distance);
      if (order === 'Most available') return Number(second.dataset.availability) - Number(first.dataset.availability);
      return Number(second.classList.contains('location-card--featured')) - Number(first.classList.contains('location-card--featured'));
    }).forEach(function (card) {
      results.insertBefore(card, moreLink);
    });
  }

  function showSearchResult(query) {
    var results = document.getElementById('location-results') || document.getElementById('locations');
    if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ui.toast(query ? 'Showing available parking near ' + query + '.' : 'Showing available parking locations.');
  }

  var parkingSearch = document.getElementById('find-parking');
  if (parkingSearch) {
    parkingSearch.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var location = parkingSearch.querySelector('input[type="search"], input[type="text"]');
      filterLocationCards(location && location.value.trim(), '', 0);
      showSearchResult(location && location.value.trim());
    });
  }

  document.querySelectorAll('.location-filters').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var query = form.querySelector('input[type="search"]');
      var type = form.querySelector('select[name="type"]');
      var price = form.querySelector('select[name="price"]');
      var rateMatch = price && price.value.match(/(\d+)/);
      var matches = filterLocationCards(query && query.value, type && type.value, rateMatch ? Number(rateMatch[1]) : 0);
      showSearchResult(matches + ' selected locations');
    });
  });

  var sortControl = document.querySelector('.location-results__meta select[name="sort"]');
  if (sortControl) {
    sortControl.addEventListener('change', function () {
      sortLocationCards(sortControl.value);
      ui.toast('Locations sorted by ' + sortControl.value.toLowerCase() + '.');
    });
  }

  document.querySelectorAll('.guest-location-details-trigger').forEach(function (button) {
    button.addEventListener('click', function () { openLocationDetails(button.closest('.location-card')); });
  });

  document.querySelectorAll('.public-map__pin').forEach(function (pin) {
    pin.addEventListener('click', function () { selectedMapPin(pin); });
  });

  document.querySelectorAll('.public-map__controls button, .public-map__locate').forEach(function (button) {
    button.addEventListener('click', function () {
      ui.toast((button.getAttribute('aria-label') || button.textContent.trim() || 'Map control') + ' applied.');
    });
  });

  document.querySelectorAll('.support-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      form.reset();
      ui.toast('Support request sent. Our team will reply shortly.');
    });
  });
})();
