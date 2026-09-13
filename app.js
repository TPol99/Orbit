const body = document.body;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeButton = document.getElementById('themeButton');
const mobileTheme = document.getElementById('mobileTheme');
const themeOrder = ['system', 'light', 'dark'];

const resolveTheme = (preference) => {
  if (preference === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return preference;
};

const applyTheme = (preference) => {
  body.dataset.theme = preference;
  const effective = resolveTheme(preference);
  themeMeta?.setAttribute('content', effective === 'dark' ? '#0b0b10' : '#f5f4f8');
  localStorage.setItem('orbit-theme', preference);
  const label = preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark';
  themeButton?.setAttribute('aria-label', `Appearance: ${label}. Tap to change.`);
  mobileTheme?.setAttribute('aria-label', `Appearance: ${label}. Tap to change.`);
  if (themeButton) themeButton.innerHTML = `◐ <span>Appearance</span><small class="appearance-status">${label}</small>`;
};

applyTheme(themeOrder.includes(localStorage.getItem('orbit-theme')) ? localStorage.getItem('orbit-theme') : 'system');

const cycleTheme = () => {
  const current = body.dataset.theme || 'system';
  applyTheme(themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length]);
};
themeButton?.addEventListener('click', cycleTheme);
mobileTheme?.addEventListener('click', cycleTheme);

const media = window.matchMedia('(prefers-color-scheme: dark)');
media.addEventListener?.('change', () => {
  if ((localStorage.getItem('orbit-theme') || 'system') === 'system') applyTheme('system');
});

const sections = ['home', 'training', 'nutrition', 'travel', 'calendar', 'goals'];
const showSection = (id) => {
  sections.forEach((sectionId) => document.getElementById(sectionId)?.classList.toggle('hidden', sectionId !== id));
  document.querySelectorAll('.nav-item[data-section]').forEach((b) => b.classList.toggle('active', b.dataset.section === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.querySelectorAll('.nav-item[data-section]').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));
document.querySelectorAll('[data-section-jump]').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.sectionJump)));

// --- Travel / flight quick-add foundation ---------------------------------
const flightModal = document.getElementById('flightModal');
const flightForm = document.getElementById('flightForm');
const flightSearchButton = document.getElementById('flightSearchButton');
const flightStatus = document.getElementById('flightStatus');
const addFlightButtons = document.querySelectorAll('[data-add-flight]');
const manualToggle = document.getElementById('manualFlightToggle');
const manualFields = document.getElementById('manualFlightFields');

const demoLookup = (flightNumber, date) => {
  const key = `${flightNumber.toUpperCase()}|${date}`;
  const demo = {
    'VA332|2026-09-18': {
      airline: 'Virgin Australia', flightNumber: 'VA332', aircraft: 'Boeing 737',
      origin: 'BNE', destination: 'MEL', departureLocal: '2026-09-18T10:15:00+10:00', arrivalLocal: '2026-09-18T12:25:00+10:00',
      departureTerminal: '', arrivalTerminal: '', status: 'Scheduled', source: 'Orbit preview data'
    }
  };
  return demo[key] || null;
};

const normaliseFlight = (record) => ({
  airline: record.airline?.name || record.airline || '',
  flightNumber: record.number || record.flightNumber || '',
  aircraft: record.aircraft?.model || record.aircraft || '',
  origin: record.departure?.airport?.iata || record.origin || '',
  destination: record.arrival?.airport?.iata || record.destination || '',
  departureLocal: record.departure?.scheduledTime?.local || record.departureLocal || '',
  arrivalLocal: record.arrival?.scheduledTime?.local || record.arrivalLocal || '',
  departureTerminal: record.departure?.terminal || '',
  arrivalTerminal: record.arrival?.terminal || '',
  status: record.status || 'Scheduled',
  source: record.source || 'Flight data provider'
});

const formatDateTime = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  return Number.isNaN(dt.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(dt);
};
const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.valueOf())) return String(value).slice(0,16);
  const pad = n => String(n).padStart(2,'0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const fillFlightFields = (flight) => {
  const values = {
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    aircraft: flight.aircraft,
    origin: flight.origin,
    destination: flight.destination,
    departure: toLocalDateTimeInput(flight.departureLocal),
    arrival: toLocalDateTimeInput(flight.arrivalLocal),
    departureTerminal: flight.departureTerminal,
    arrivalTerminal: flight.arrivalTerminal,
    status: flight.status
  };
  Object.entries(values).forEach(([name, value]) => {
    const el = flightForm?.elements.namedItem(name);
    if (el && value !== undefined) el.value = value;
  });
};

let openFlightModal = () => {
  flightModal?.classList.remove('hidden');
  flightModal?.setAttribute('aria-hidden', 'false');
  document.getElementById('flightNumber')?.focus();
};
const closeFlightModal = () => {
  flightModal?.classList.add('hidden');
  flightModal?.setAttribute('aria-hidden', 'true');
};
document.querySelectorAll('[data-close-flight]').forEach((el) => el.addEventListener('click', closeFlightModal));
addFlightButtons.forEach((button) => button.addEventListener('click', openFlightModal));

manualToggle?.addEventListener('click', () => {
  manualFields?.classList.toggle('hidden');
  manualToggle.textContent = manualFields?.classList.contains('hidden') ? 'Enter details manually' : 'Hide manual fields';
});

flightSearchButton?.addEventListener('click', async () => {
  const flightNumber = document.getElementById('flightNumber')?.value.trim().toUpperCase();
  const date = document.getElementById('flightDate')?.value;
  if (!flightNumber || !date) {
    flightStatus.textContent = 'Enter a flight number and date first.';
    flightStatus.dataset.state = 'error';
    return;
  }
  flightStatus.textContent = 'Looking up flight…';
  flightStatus.dataset.state = 'loading';
  flightSearchButton.disabled = true;
  try {
    const response = await fetch(`/api/flight-lookup?flightNumber=${encodeURIComponent(flightNumber)}&date=${encodeURIComponent(date)}`, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      if (data?.flight) {
        fillFlightFields(normaliseFlight(data.flight));
        flightStatus.textContent = `Flight found. ${data.source ? `Source: ${data.source}` : ''}`;
        flightStatus.dataset.state = 'success';
        return;
      }
    }
    const preview = demoLookup(flightNumber, date);
    if (preview) {
      fillFlightFields(preview);
      flightStatus.textContent = 'Preview data loaded. Connect a flight-data API for live lookup.';
      flightStatus.dataset.state = 'success';
    } else {
      flightStatus.textContent = 'No live result yet. You can enter the flight manually below.';
      flightStatus.dataset.state = 'error';
    }
  } catch (error) {
    const preview = demoLookup(flightNumber, date);
    if (preview) {
      fillFlightFields(preview);
      flightStatus.textContent = 'Preview data loaded. Live API is not configured yet.';
      flightStatus.dataset.state = 'success';
    } else {
      flightStatus.textContent = 'Live lookup is not configured yet. Manual entry is available.';
      flightStatus.dataset.state = 'error';
    }
  } finally {
    flightSearchButton.disabled = false;
  }
});

const refreshFlightTripOptions = () => {
  const select = document.getElementById('flightTripTarget');
  if (!select) return;
  const current = select.value;
  const trips = readTrips();
  select.innerHTML = '<option value="">Choose a trip…</option>' + trips.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.emoji)} ${escapeHtml(t.name)}</option>`).join('');
  if (trips.some(t=>t.id===current)) select.value = current;
};
const addFlightToTrip = (flight, tripId) => {
  const trips = readTrips();
  const trip = trips.find(t=>t.id===tripId);
  if (!trip) return false;
  const departureDate = flight.departure ? flight.departure.slice(0,10) : '';
  trip.items.push({
    id:uid('item'), type:'flight', title:`${flight.flightNumber || 'Flight'} · ${flight.origin || '???'} → ${flight.destination || '???'}`,
    date:departureDate || trip.startDate, time:flight.departure ? flight.departure.slice(11,16) : '',
    endDate:flight.arrival ? flight.arrival.slice(0,10) : departureDate || trip.startDate, endTime:flight.arrival ? flight.arrival.slice(11,16) : '',
    reference:flight.bookingReference || '',
    notes:[flight.airline,flight.aircraft,flight.departureTerminal ? `Dep terminal ${flight.departureTerminal}` : '',flight.arrivalTerminal ? `Arr terminal ${flight.arrivalTerminal}` : '',flight.seat ? `Seat ${flight.seat}` : '',flight.status].filter(Boolean).join(' · ')
  });
  trip.items.sort((a,b)=>`${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  writeTrips(trips);
  return true;
};

flightForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(flightForm);
  const flight = Object.fromEntries(formData.entries());
  const tripId = document.getElementById('flightTripTarget')?.value || '';
  if (tripId) {
    addFlightToTrip(flight, tripId);
    localStorage.setItem('orbit-last-flight', JSON.stringify(flight));
    flightStatus.textContent = `Saved ${flight.flightNumber || 'flight'} to your trip.`;
  } else {
    localStorage.setItem('orbit-last-flight', JSON.stringify(flight));
    flightStatus.textContent = `Saved ${flight.flightNumber || 'flight'} to this browser. Choose a trip next time to add it to an itinerary.`;
  }
  flightStatus.dataset.state = 'success';
  renderTrips(); renderHomeTravel(); refreshFlightTripOptions();
});

const originalOpenFlightModal = openFlightModal;
openFlightModal = () => { originalOpenFlightModal(); refreshFlightTripOptions(); };


// --- Trips ------------------------------------------------------------------
const tripModal = document.getElementById('tripModal');
const itemModal = document.getElementById('itemModal');
const tripForm = document.getElementById('tripForm');
const itemForm = document.getElementById('itemForm');
const flightItemFields = document.getElementById('flightItemFields');
const genericItemFields = document.getElementById('genericItemFields');
const itemFlightSearchButton = document.getElementById('itemFlightSearchButton');
const itemFlightStatus = document.getElementById('itemFlightStatus');
const tripList = document.getElementById('tripList');
const emptyTrips = document.getElementById('emptyTrips');
const tripStorageKey = 'orbit-trips';

const readTrips = () => {
  try { return JSON.parse(localStorage.getItem(tripStorageKey) || '[]'); } catch { return []; }
};
const writeTrips = (trips) => localStorage.setItem(tripStorageKey, JSON.stringify(trips));
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const tripDuration = (start, end) => {
  if (!start || !end) return '';
  const a = new Date(`${start}T00:00:00`), b = new Date(`${end}T00:00:00`);
  const days = Math.round((b-a)/86400000) + 1;
  return `${days} day${days === 1 ? '' : 's'}`;
};
const fmtShortDate = (value) => value ? new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(`${value}T00:00:00`)) : '';
const fmtLongDate = (value) => value ? new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${value}T00:00:00`)) : '';
const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const openTripModal = () => {
  tripForm?.reset();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const iso = tomorrow.toISOString().slice(0,10);
  tripForm?.elements.startDate && (tripForm.elements.startDate.value = iso);
  tripForm?.elements.endDate && (tripForm.elements.endDate.value = iso);
  tripModal?.classList.remove('hidden'); tripModal?.setAttribute('aria-hidden','false');
  tripForm?.elements.name?.focus();
};
const closeTripModal = () => { tripModal?.classList.add('hidden'); tripModal?.setAttribute('aria-hidden','true'); };
const openItemModal = (tripId) => {
  if (!itemModal) return;
  itemForm?.reset();
  itemTripId.value = tripId;
  document.querySelectorAll('.item-type').forEach((b,i)=>b.classList.toggle('active', i===0));
  setItemTypeUI('flight');
  itemFlightStatus.textContent='Enter the flight number and date to auto-fill the details.';
  delete itemFlightStatus.dataset.state;
  itemModal.classList.remove('hidden');
  itemModal.setAttribute('aria-hidden','false');
  document.getElementById('itemFlightNumber')?.focus();
};

const closeItemModal = () => { itemModal?.classList.add('hidden'); itemModal?.setAttribute('aria-hidden','true'); };

document.getElementById('addTripButton')?.addEventListener('click', openTripModal);
document.getElementById('emptyAddTrip')?.addEventListener('click', openTripModal);
document.querySelectorAll('[data-close-trip]').forEach(el=>el.addEventListener('click', closeTripModal));
document.querySelectorAll('[data-close-item]').forEach(el=>el.addEventListener('click', closeItemModal));

tripForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(tripForm).entries());
  if (data.endDate < data.startDate) { alert('Trip end date must be on or after the start date.'); return; }
  const trips = readTrips();
  trips.push({ id:uid('trip'), name:data.name.trim(), emoji:data.emoji.trim() || '✈️', startDate:data.startDate, endDate:data.endDate, notes:data.notes.trim(), items:[] });
  trips.sort((a,b)=>a.startDate.localeCompare(b.startDate));
  writeTrips(trips); closeTripModal(); renderTrips(); renderHomeTravel();
});

const selectedItemType = () => document.querySelector('.item-type.active')?.dataset.itemType || 'custom';

const setItemTypeUI = (type) => {
  const isFlight = type === 'flight';
  flightItemFields?.classList.toggle('hidden', !isFlight);
  genericItemFields?.classList.toggle('hidden', isFlight);
  const titleInput = document.getElementById('itemTitle');
  const titlePlaceholders = {hotel:'Hotel name',train:'Train journey',ferry:'Ferry crossing',car:'Car hire',activity:'Activity',custom:'Custom itinerary item'};
  if (titleInput) {
    titleInput.placeholder = titlePlaceholders[type] || 'Custom itinerary item';
    titleInput.required = !isFlight;
  }
};

document.querySelectorAll('.item-type').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.item-type').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');
  setItemTypeUI(button.dataset.itemType);
}));

const fillItineraryFlight = (flight) => {
  const values = {
    itemFlightNumber: flight.flightNumber, itemAirline: flight.airline, itemAircraft: flight.aircraft,
    itemOrigin: flight.origin, itemDestination: flight.destination,
    itemDeparture: toLocalDateTimeInput(flight.departureLocal), itemArrival: toLocalDateTimeInput(flight.arrivalLocal),
    itemDepartureTerminal: flight.departureTerminal, itemArrivalTerminal: flight.arrivalTerminal, itemStatus: flight.status
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.value = value;
  });
  const dateInput = document.getElementById('itemFlightDate');
  const dep = flight.departureLocal ? new Date(flight.departureLocal) : null;
  if (dateInput && dep && !Number.isNaN(dep.valueOf())) {
    const pad=n=>String(n).padStart(2,'0');
    dateInput.value=`${dep.getFullYear()}-${pad(dep.getMonth()+1)}-${pad(dep.getDate())}`;
  }
};

itemFlightSearchButton?.addEventListener('click', async () => {
  const number = document.getElementById('itemFlightNumber')?.value.trim().toUpperCase();
  const date = document.getElementById('itemFlightDate')?.value;
  if (!number || !date) {
    itemFlightStatus.textContent='Enter a flight number and date first.';
    itemFlightStatus.dataset.state='error';
    return;
  }
  itemFlightSearchButton.disabled=true;
  itemFlightStatus.textContent='Looking up flight…';
  itemFlightStatus.dataset.state='loading';
  try {
    const response=await fetch(`/api/flight-lookup?flightNumber=${encodeURIComponent(number)}&date=${encodeURIComponent(date)}`,{headers:{Accept:'application/json'}});
    if(response.ok){
      const data=await response.json();
      if(data?.flight){
        const flight=normaliseFlight(data.flight);
        fillItineraryFlight(flight);
        itemFlightStatus.textContent=`Flight found${data.source ? ` · ${data.source}` : ''}.`;
        itemFlightStatus.dataset.state='success';
        return;
      }
    }
    const preview=demoLookup(number,date);
    if(preview){
      fillItineraryFlight(preview);
      itemFlightStatus.textContent='Preview data loaded. Connect the flight-data provider for live lookup.';
      itemFlightStatus.dataset.state='success';
    }else{
      document.getElementById('itemFlightNumber').value=number;
      itemFlightStatus.textContent='No result yet. You can complete the flight details manually below.';
      itemFlightStatus.dataset.state='error';
    }
  } catch(error) {
    const preview=demoLookup(number,date);
    if(preview){
      fillItineraryFlight(preview);
      itemFlightStatus.textContent='Preview data loaded. Live API is not configured yet.';
      itemFlightStatus.dataset.state='success';
    }else{
      itemFlightStatus.textContent='Live lookup is not configured yet. Manual flight details are still available.';
      itemFlightStatus.dataset.state='error';
    }
  } finally {
    itemFlightSearchButton.disabled=false;
  }
});

itemForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const type = selectedItemType();
  const formData = Object.fromEntries(new FormData(itemForm).entries());
  const trips = readTrips();
  const trip = trips.find(t=>t.id===formData.tripId);
  if (!trip) return;

  let item;
  if (type === 'flight') {
    const flightNumber=(formData.flightNumber||'').trim().toUpperCase();
    if (!flightNumber) { alert('Enter a flight number.'); return; }
    const origin=(formData.origin||'').trim().toUpperCase();
    const destination=(formData.destination||'').trim().toUpperCase();
    item = {
      id:uid('item'), type:'flight', title:`${flightNumber}${origin&&destination ? ` · ${origin} → ${destination}` : ''}`,
      date:(formData.departure||'').slice(0,10) || formData.flightDate,
      time:(formData.departure||'').slice(11,16), endDate:(formData.arrival||'').slice(0,10), endTime:(formData.arrival||'').slice(11,16),
      reference:(formData.reference||'').trim(), notes:(formData.notes||'').trim(),
      airline:(formData.airline||'').trim(), aircraft:(formData.aircraft||'').trim(), flightNumber, origin, destination,
      departureTerminal:(formData.departureTerminal||'').trim(), arrivalTerminal:(formData.arrivalTerminal||'').trim(), status:(formData.status||'Scheduled').trim(), seat:(formData.seat||'').trim()
    };
  } else {
    if (!formData.title?.trim() || !formData.date) { alert('Add a title and date.'); return; }
    item = { id:uid('item'), type, title:formData.title.trim(), date:formData.date, time:formData.time, endDate:formData.endDate, endTime:formData.endTime, reference:(formData.genericReference||'').trim(), notes:(formData.genericNotes||'').trim() };
  }

  trip.items.push(item);
  trip.items.sort((a,b)=>`${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  writeTrips(trips); closeItemModal(); renderTrips(); renderHomeTravel();
});

setItemTypeUI('flight');

const itemIcon = type => ({flight:'✈️',hotel:'🏨',train:'🚆',ferry:'🚢',car:'🚗',activity:'🎟️',custom:'📌'}[type] || '📌');
const itemLabel = type => ({flight:'Flight',hotel:'Hotel',train:'Train',ferry:'Ferry',car:'Car hire',activity:'Activity',custom:'Custom'}[type] || 'Item');

const tripDetailModal = document.getElementById('tripDetailModal');
const tripDetailTitle = document.getElementById('tripDetailTitle');
const tripDetailSubline = document.getElementById('tripDetailSubline');
const tripDetailBody = document.getElementById('tripDetailBody');
const tripDetailAddItem = document.getElementById('tripDetailAddItem');
let activeTripDetailId = '';

const closeTripDetail = () => {
  tripDetailModal?.classList.add('hidden');
  tripDetailModal?.setAttribute('aria-hidden','true');
  activeTripDetailId = '';
};

document.querySelectorAll('[data-close-trip-detail]').forEach(el=>el.addEventListener('click', closeTripDetail));

const openTripDetail = (tripId) => {
  const trip = readTrips().find(t=>t.id===tripId);
  if (!trip || !tripDetailModal) return;
  activeTripDetailId = tripId;
  tripDetailTitle.textContent = `${trip.emoji} ${trip.name}`;
  tripDetailSubline.textContent = `${fmtShortDate(trip.startDate)} – ${fmtShortDate(trip.endDate)} · ${tripDuration(trip.startDate,trip.endDate)}`;
  const items = [...trip.items].sort((a,b)=>`${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  tripDetailBody.innerHTML = `
    <div class="trip-detail-summary">
      <div><strong>${items.length}</strong><span>itinerary item${items.length===1?'':'s'}</span></div>
      <div><strong>${items.filter(i=>i.type==='flight').length}</strong><span>flight${items.filter(i=>i.type==='flight').length===1?'':'s'}</span></div>
      <div><strong>${items.filter(i=>i.type==='hotel').length}</strong><span>hotel${items.filter(i=>i.type==='hotel').length===1?'':'s'}</span></div>
    </div>
    ${trip.notes ? `<div class="trip-note card-soft"><span>Trip notes</span><p>${escapeHtml(trip.notes)}</p></div>` : ''}
    <div class="trip-timeline">
      ${items.length ? items.map((item, index) => `
        <article class="trip-timeline-item">
          <div class="timeline-rail"><div class="timeline-dot">${itemIcon(item.type)}</div>${index < items.length-1 ? '<span></span>' : ''}</div>
          <div class="timeline-card">
            <div class="timeline-card-head"><div><p>${fmtLongDate(item.date)}${item.time ? ` · ${escapeHtml(item.time)}` : ''}</p><h3>${escapeHtml(item.title)}</h3></div><span class="type-pill">${itemLabel(item.type)}</span></div>
            ${item.type === 'flight' ? `<div class="flight-detail-route"><strong>${escapeHtml(item.origin || '---')}</strong><span>→</span><strong>${escapeHtml(item.destination || '---')}</strong></div><div class="detail-flight-meta"><span>${escapeHtml(item.airline || 'Airline not set')}</span><span>${escapeHtml(item.aircraft || '')}</span><span>${escapeHtml(item.status || 'Scheduled')}</span></div><div class="detail-flight-times"><div><small>Departure</small><b>${item.time ? escapeHtml(item.time) : '—'}</b>${item.departureTerminal ? `<span>${escapeHtml(item.departureTerminal)}</span>` : ''}</div><div><small>Arrival</small><b>${item.endTime ? escapeHtml(item.endTime) : '—'}</b>${item.arrivalTerminal ? `<span>${escapeHtml(item.arrivalTerminal)}</span>` : ''}</div></div>${item.seat ? `<div class="detail-meta"><span>Seat</span><b>${escapeHtml(item.seat)}</b></div>` : ''}` : ''}
            ${item.reference ? `<div class="detail-meta"><span>Reference</span><b>${escapeHtml(item.reference)}</b></div>` : ''}
            ${item.type !== 'flight' && (item.endDate || item.endTime) ? `<div class="detail-meta"><span>Ends</span><b>${item.endDate ? fmtLongDate(item.endDate) : ''}${item.endTime ? ` · ${escapeHtml(item.endTime)}` : ''}</b></div>` : ''}
            ${item.notes ? `<p class="detail-notes">${escapeHtml(item.notes)}</p>` : ''}
          </div>
        </article>`).join('') : `<div class="detail-empty"><span>✈️</span><strong>Your itinerary is empty</strong><p>Add flights, hotels and plans to build your timeline.</p></div>`}
    </div>`;
  tripDetailAddItem.onclick = () => { closeTripDetail(); openItemModal(tripId); };
  tripDetailModal.classList.remove('hidden');
  tripDetailModal.setAttribute('aria-hidden','false');
};


const renderTrips = () => {
  const trips = readTrips();
  if (!tripList || !emptyTrips) return;
  emptyTrips.classList.toggle('hidden', trips.length > 0);
  tripList.innerHTML = trips.map(trip => `
    <article class="trip-card card">
      <div class="trip-card-head">
        <div class="trip-title-wrap"><div class="trip-large-emoji">${escapeHtml(trip.emoji)}</div><div><h2>${escapeHtml(trip.name)}</h2><p>${fmtShortDate(trip.startDate)} – ${fmtShortDate(trip.endDate)} · ${tripDuration(trip.startDate,trip.endDate)}</p></div></div>
        <div class="trip-card-actions"><button class="secondary" type="button" data-open-trip="${trip.id}">View trip</button><button class="secondary" type="button" data-add-item="${trip.id}">+ Add item</button><button class="icon-btn danger" type="button" data-delete-trip="${trip.id}" title="Delete trip">×</button></div>
      </div>
      ${trip.items.length ? `<div class="itinerary">${trip.items.map(item => `<div class="itinerary-item"><div class="itinerary-icon">${itemIcon(item.type)}</div><div class="itinerary-main"><strong>${escapeHtml(item.title)}</strong><span>${fmtLongDate(item.date)}${item.time ? ` · ${escapeHtml(item.time)}`:''} · ${itemLabel(item.type)}</span>${item.reference?`<small>Ref · ${escapeHtml(item.reference)}</small>`:''}${item.notes?`<small>${escapeHtml(item.notes)}</small>`:''}</div></div>`).join('')}</div>` : `<div class="trip-empty-row">No itinerary items yet. Add your first flight, hotel or plan.</div>`}
    </article>`).join('');
  tripList.querySelectorAll('[data-open-trip]').forEach(btn=>btn.addEventListener('click',()=>openTripDetail(btn.dataset.openTrip)));
  tripList.querySelectorAll('[data-add-item]').forEach(btn=>btn.addEventListener('click',()=>openItemModal(btn.dataset.addItem)));
  tripList.querySelectorAll('[data-delete-trip]').forEach(btn=>btn.addEventListener('click',()=>{
    const trips = readTrips().filter(t=>t.id!==btn.dataset.deleteTrip); writeTrips(trips); renderTrips(); renderHomeTravel();
  }));
};

const renderHomeTravel = () => {
  const card = document.querySelector('.travel-card');
  if (!card) return;
  const trips = readTrips().filter(t=>t.startDate).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const upcoming = trips.find(t=>t.startDate >= new Date().toISOString().slice(0,10)) || trips[0];
  const headButton = card.querySelector('[data-section-jump="travel"]');
  if (!upcoming) {
    card.innerHTML = `<div class="card-head"><h2>Upcoming travel</h2><button class="text-btn" data-section-jump="travel">View all</button></div><div class="travel-empty-home"><strong>No trips yet</strong><span>Add your first trip to see it here.</span></div>`;
    card.querySelector('[data-section-jump]')?.addEventListener('click',()=>showSection('travel')); return;
  }
  const items = upcoming.items.slice(0,3);
  card.innerHTML = `<div class="card-head"><h2>Upcoming travel</h2><div class="card-head-actions"><button class="text-btn" data-open-home-trip>View trip</button><button class="text-btn" data-section-jump="travel">All trips</button></div></div><button class="travel-item travel-item-button" type="button" data-open-home-trip><div class="trip-emoji">${escapeHtml(upcoming.emoji)}</div><div class="trip-info"><strong>${escapeHtml(upcoming.name)}</strong><span>${fmtShortDate(upcoming.startDate)} – ${fmtShortDate(upcoming.endDate)} · ${tripDuration(upcoming.startDate,upcoming.endDate)}</span><small>${upcoming.items.filter(i=>i.type==='flight').length} flights · ${upcoming.items.filter(i=>i.type==='hotel').length} hotels · ${upcoming.items.filter(i=>['ferry','train'].includes(i.type)).length} transit</small></div><span class="trip-badge">${escapeHtml(upcoming.startDate)}</span></button><div class="travel-preview">${items.length ? items.map(i=>`<div><b>${fmtShortDate(i.date)}</b><span>${itemIcon(i.type)} ${escapeHtml(i.title)}</span></div>`).join('') : `<div><b>Next</b><span>Add flights, hotels and plans</span></div>`}</div>`;
  card.querySelectorAll('[data-open-home-trip]').forEach(el=>el.addEventListener('click',()=>openTripDetail(upcoming.id)));
  card.querySelector('[data-section-jump]')?.addEventListener('click',()=>showSection('travel'));
};

renderTrips();
renderHomeTravel();


// v6 launch-state and modal safety
const orbitModals = ['flightModal', 'tripModal', 'tripDetailModal', 'itemModal']
  .map(id => document.getElementById(id))
  .filter(Boolean);

const closeAllOrbitModals = () => {
  orbitModals.forEach(modal => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  });
};

closeAllOrbitModals();
showSection('home');

orbitModals.forEach(modal => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeAllOrbitModals();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAllOrbitModals();
});
