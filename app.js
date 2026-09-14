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
  if (themeButton) themeButton.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M12 3v18"/></svg><span>Appearance</span><small class="appearance-status">${label}</small>`;
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
const fmtDDMMYYYY = (value) => value ? (() => { const [y,m,d] = value.split('-'); return `${d}-${m}-${y}`; })() : '';
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
  card.innerHTML = `<div class="card-head"><h2>Upcoming travel</h2><div class="card-head-actions"><button class="text-btn" data-open-home-trip>View trip</button><button class="text-btn" data-section-jump="travel">All trips</button></div></div><button class="travel-item travel-item-button" type="button" data-open-home-trip><div class="trip-emoji">${escapeHtml(upcoming.emoji)}</div><div class="trip-info"><strong>${escapeHtml(upcoming.name)}</strong><span>${fmtShortDate(upcoming.startDate)} – ${fmtShortDate(upcoming.endDate)} · ${tripDuration(upcoming.startDate,upcoming.endDate)}</span><small>${upcoming.items.filter(i=>i.type==='flight').length} flights · ${upcoming.items.filter(i=>i.type==='hotel').length} hotels · ${upcoming.items.filter(i=>['ferry','train'].includes(i.type)).length} transit</small></div><span class="trip-badge">${escapeHtml(fmtDDMMYYYY(upcoming.startDate))}</span></button><div class="travel-preview">${items.length ? items.map(i=>`<div><b>${fmtShortDate(i.date)}</b><span>${itemIcon(i.type)} ${escapeHtml(i.title)}</span></div>`).join('') : `<div><b>Next</b><span>Add flights, hotels and plans</span></div>`}</div>`;
  card.querySelectorAll('[data-open-home-trip]').forEach(el=>el.addEventListener('click',()=>openTripDetail(upcoming.id)));
  card.querySelector('[data-section-jump]')?.addEventListener('click',()=>showSection('travel'));
};

renderTrips();
renderHomeTravel();


// v6 launch-state and modal safety
const orbitModals = ['flightModal', 'tripModal', 'tripDetailModal', 'itemModal', 'workoutModal', 'exerciseModal', 'workoutDetailModal', 'liveWorkoutModal']
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


// --- Orbit Training module ---
const workoutStorageKey = 'orbit-workouts';
const exerciseStorageKey = 'orbit-exercises';
const trainingLogsKey = 'orbit-training-logs';

const readJSON = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const workouts = () => readJSON(workoutStorageKey);
const exercises = () => readJSON(exerciseStorageKey);
const trainingLogs = () => readJSON(trainingLogsKey);

// --- Exercise database ----------------------------------------------------
// Kinetic.place publishes an MIT-licensed dataset and a free hosted REST API.
// Orbit uses the hosted API at runtime so the static PWA stays small.
const exerciseApiBase = 'https://api.kinetic.place/v1/exercises';
let remoteExerciseCache = [];
let exerciseDbLoading = false;
let exerciseDbInitialised = false;

const normaliseRemoteExercise = (e = {}) => {
  const muscles = Array.isArray(e.muscleGroups) ? e.muscleGroups :
    (Array.isArray(e.targetMuscles) ? e.targetMuscles.map(name => ({name, type:'primary'})) : []);
  const equip = Array.isArray(e.equipment) ? e.equipment :
    (Array.isArray(e.equipments) ? e.equipments.map(name => ({name})) : []);
  const primary = muscles.find(m => String(m.type || '').toLowerCase() === 'primary') || muscles[0] || {};
  const instructionList = Array.isArray(e.instructions) ? e.instructions :
    (Array.isArray(e.keywords) ? e.keywords.filter(Boolean).slice(0,4) : []);
  const media = e.mediaUrl || e.gifUrl || e.imageUrl || e.videoUrl || e.video?.url || e.gif?.url || '';
  return {
    id: String(e.id || e.exerciseId || uid2('dbex')),
    name: e.name || 'Unnamed exercise',
    muscle: primary.name || primary.slug || 'General',
    equipment: equip[0]?.name || equip[0]?.type || '—',
    mediaUrl: media,
    instructions: instructionList.join(' '),
    difficulty: e.difficultyLevel || '',
    category: e.category || e.exerciseType || 'strength',
    source: 'Kinetic.place'
  };
};

const extractExerciseArray = payload => {
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload?.results || payload?.exercises || [];
};

const fetchExerciseDatabase = async (params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v) usp.set(k,v); });
  usp.set('limit', params.limit || '36');
  const res = await fetch(`${exerciseApiBase}?${usp.toString()}`, {headers:{'Accept':'application/json'}});
  if (!res.ok) throw new Error(`Exercise database returned ${res.status}`);
  const data = await res.json();
  return extractExerciseArray(data).map(normaliseRemoteExercise);
};

const uniqueById = arr => [...new Map(arr.map(x => [x.id, x])).values()];

const populateExerciseFilters = (items) => {
  const muscle = document.getElementById('exerciseDbMuscle');
  const equip = document.getElementById('exerciseDbEquipment');
  if (!muscle || !equip) return;
  const currentM = muscle.value, currentE = equip.value;
  const muscles = [...new Set(items.map(x=>x.muscle).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const equipment = [...new Set(items.map(x=>x.equipment).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  muscle.innerHTML = `<option value="">All muscles</option>${muscles.map(x=>`<option>${escapeHtml(x)}</option>`).join('')}`;
  equip.innerHTML = `<option value="">All equipment</option>${equipment.map(x=>`<option>${escapeHtml(x)}</option>`).join('')}`;
  if (muscles.includes(currentM)) muscle.value = currentM;
  if (equipment.includes(currentE)) equip.value = currentE;
};

const addRemoteExerciseToLibrary = (ex) => {
  const all = exercises();
  if (!all.some(x=>x.id===ex.id)) writeJSON(exerciseStorageKey, [...all, ex]);
  renderTraining();
};

const renderExerciseDatabase = (items) => {
  const lib = document.getElementById('exerciseLibrary');
  if (!lib) return;
  const q=(document.getElementById('exerciseDbSearch')?.value||'').trim().toLowerCase();
  const m=(document.getElementById('exerciseDbMuscle')?.value||'').toLowerCase();
  const eq=(document.getElementById('exerciseDbEquipment')?.value||'').toLowerCase();
  const matches = uniqueById(items).filter(x => {
    const hay = `${x.name} ${x.muscle} ${x.equipment}`.toLowerCase();
    return (!q || hay.includes(q)) && (!m || x.muscle.toLowerCase()===m) && (!eq || x.equipment.toLowerCase()===eq);
  }).slice(0,36);
  document.getElementById('exerciseDbStatus').textContent = exerciseDbLoading ? 'Loading exercise database…' : `${matches.length} exercises shown · Kinetic.place`;
  lib.innerHTML = matches.length ? matches.map(ex=>`<article class="exercise-card database-exercise-card">${renderExerciseMedia(ex)}<div class="exercise-card-body"><div class="exercise-card-top"><div><h3>${escapeHtml(ex.name)}</h3><p>${escapeHtml(ex.muscle)} · ${escapeHtml(ex.equipment)}</p></div><button class="secondary small" data-db-add="${escapeHtml(ex.id)}">Add</button></div><small>${escapeHtml(ex.instructions||'Technique information available in the exercise database.')}</small></div></article>`).join('') : `<div class="empty-state"><strong>No exercises found</strong><span>Try another search or clear your filters.</span></div>`;
  lib.querySelectorAll('[data-db-add]').forEach(btn=>btn.addEventListener('click',()=>{const ex=remoteExerciseCache.find(x=>x.id===btn.dataset.dbAdd);if(ex){addRemoteExerciseToLibrary(ex);btn.textContent='Added';btn.disabled=true;}}));
};

const initExerciseDatabase = async () => {
  if (exerciseDbInitialised || exerciseDbLoading) return;
  exerciseDbLoading = true; renderExerciseDatabase(remoteExerciseCache);
  try {
    remoteExerciseCache = await fetchExerciseDatabase({limit:36});
    exerciseDbInitialised = true;
    populateExerciseFilters(remoteExerciseCache);
    renderExerciseDatabase(remoteExerciseCache);
  } catch (err) {
    exerciseDbLoading = false;
    const status=document.getElementById('exerciseDbStatus');
    if(status) status.textContent='Database unavailable right now. Your saved Orbit exercises are still available.';
    renderExerciseDatabase(exercises());
    return;
  }
  exerciseDbLoading = false;
  renderExerciseDatabase(remoteExerciseCache);
};

const uid2 = (prefix='id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const fmtWeight = n => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:1});
const weekStart = () => { const d=new Date(); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-day); return d; };
const dateLabel = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU',{day:'2-digit',month:'short'}) : '';

const seedExercises = () => {
  if (exercises().length) return;
  writeJSON(exerciseStorageKey,[
    {id:uid2('ex'),name:'Lat Pulldown',muscle:'Back',equipment:'Cable',mediaUrl:'',instructions:'Keep your chest tall and pull elbows down towards your sides.'},
    {id:uid2('ex'),name:'Seated Cable Row',muscle:'Back',equipment:'Cable',mediaUrl:'',instructions:'Brace your torso and drive elbows back without swinging.'},
    {id:uid2('ex'),name:'Incline Dumbbell Press',muscle:'Chest',equipment:'Dumbbells',mediaUrl:'',instructions:'Keep shoulder blades set and lower the dumbbells under control.'},
    {id:uid2('ex'),name:'Dumbbell Curl',muscle:'Biceps',equipment:'Dumbbells',mediaUrl:'',instructions:'Keep elbows close to your body and avoid swinging.'}
  ]);
};
seedExercises();

const seedStarterPushDay = () => {
  if (workouts().length) return;
  const all = exercises();
  const names = [
    ['Smith Incline Bench Press','Chest','Smith Machine'],
    ['Lever Chest Press','Chest','Machine'],
    ['Lever Seated Fly','Chest','Machine'],
    ['Cable Standing High Cross Triceps Extension','Triceps','Cable'],
    ['Cable Pushdown','Triceps','Cable'],
    ['Cable One Arm Lateral Raise','Shoulders','Cable'],
    ['Lever Triceps Dip','Triceps','Machine'],
    ['Cable Low Fly','Chest','Cable']
  ];
  const ids = names.map(([name,muscle,equipment]) => {
    let ex = all.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!ex) {
      ex = {id:uid2('ex'),name,muscle,equipment,mediaUrl:'',instructions:'Add technique notes or database media when available.',source:'Orbit starter'};
      all.push(ex);
    }
    return ex.id;
  });
  writeJSON(exerciseStorageKey, all);
  writeJSON(workoutStorageKey,[{
    id:uid2('workout'),
    name:'Push Day',
    duration:65,
    notes:'Starter routine based on your current Push Day.',
    exerciseIds:ids,
    createdAt:new Date().toISOString(),
    targets:[
      [{weight:60,reps:8},{weight:60,reps:8},{weight:60,reps:8}],
      [{weight:80,reps:10},{weight:85,reps:8},{weight:85,reps:8}],
      [{weight:30,reps:12},{weight:30,reps:12},{weight:30,reps:12}],
      [{weight:20,reps:12},{weight:20,reps:12},{weight:20,reps:12}],
      [{weight:22.5,reps:12},{weight:22.5,reps:12},{weight:22.5,reps:12}],
      [{weight:7.5,reps:12},{weight:7.5,reps:12},{weight:7.5,reps:12},{weight:7.5,reps:12},{weight:7.5,reps:12},{weight:7.5,reps:12}],
      [{weight:120,reps:12},{weight:120,reps:12},{weight:120,reps:12}],
      [{weight:10,reps:12},{weight:10,reps:12},{weight:10,reps:12}]
    ]
  }]);
};
seedStarterPushDay();

const workoutModal = document.getElementById('workoutModal');
const exerciseModal = document.getElementById('exerciseModal');
const workoutDetailModal = document.getElementById('workoutDetailModal');
const workoutForm = document.getElementById('workoutForm');
const exerciseForm = document.getElementById('exerciseForm');
let activeWorkoutId = null;

const openTrainingModal = m => { m?.classList.remove('hidden'); m?.setAttribute('aria-hidden','false'); };
const closeTrainingModal = m => { m?.classList.add('hidden'); m?.setAttribute('aria-hidden','true'); };

document.getElementById('createWorkoutButton')?.addEventListener('click',()=>{ workoutForm?.reset(); openTrainingModal(workoutModal); workoutForm?.elements.name?.focus(); });
document.getElementById('emptyCreateWorkout')?.addEventListener('click',()=>{ workoutForm?.reset(); openTrainingModal(workoutModal); });
document.querySelectorAll('[data-close-workout]').forEach(b=>b.addEventListener('click',()=>closeTrainingModal(workoutModal)));
document.querySelectorAll('[data-close-exercise]').forEach(b=>b.addEventListener('click',()=>closeTrainingModal(exerciseModal)));
document.querySelectorAll('[data-close-workout-detail]').forEach(b=>b.addEventListener('click',()=>closeTrainingModal(workoutDetailModal)));

document.getElementById('addExerciseButton')?.addEventListener('click',()=>{ exerciseForm?.reset(); document.getElementById('exerciseMediaPreview')?.classList.add('hidden'); openTrainingModal(exerciseModal); exerciseForm?.elements.name?.focus(); });
document.getElementById('libraryAddExercise')?.addEventListener('click',()=>document.getElementById('addExerciseButton')?.click());
exerciseForm?.elements.mediaUrl?.addEventListener('input',()=>{
  const box=document.getElementById('exerciseMediaPreview'); const url=exerciseForm.elements.mediaUrl.value.trim();
  if(!url){box.classList.add('hidden'); box.innerHTML=''; return;}
  const safe=escapeHtml(url); const lower=url.toLowerCase();
  box.innerHTML=(lower.endsWith('.mp4')||lower.includes('video'))?`<video src="${safe}" controls muted playsinline></video>`:`<img src="${safe}" alt="Exercise demonstration preview" onerror="this.closest('.media-preview').innerHTML='<span class=\"muted\">Preview unavailable — the URL will still be saved.</span>'">`;
  box.classList.remove('hidden');
});

workoutForm?.addEventListener('submit',e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(workoutForm).entries());
  const all=workouts(); all.push({id:uid2('workout'),name:d.name.trim(),duration:Number(d.duration||0),notes:d.notes?.trim()||'',exerciseIds:[],createdAt:new Date().toISOString()});
  writeJSON(workoutStorageKey,all); closeTrainingModal(workoutModal); renderTraining(); openWorkoutDetail(all[all.length-1].id);
});

exerciseForm?.addEventListener('submit',e=>{
  e.preventDefault(); const d=Object.fromEntries(new FormData(exerciseForm).entries()); const all=exercises();
  all.push({id:uid2('ex'),name:d.name.trim(),muscle:d.muscle?.trim()||'General',equipment:d.equipment?.trim()||'—',mediaUrl:d.mediaUrl?.trim()||'',instructions:d.instructions?.trim()||''});
  writeJSON(exerciseStorageKey,all); closeTrainingModal(exerciseModal); renderTraining();
});

const renderExerciseMedia = ex => {
  if(!ex.mediaUrl) return `<div class="exercise-media"><span class="media-placeholder">🏋️</span></div>`;
  const u=escapeHtml(ex.mediaUrl); const low=ex.mediaUrl.toLowerCase();
  if(low.endsWith('.mp4')||low.includes('video')) return `<div class="exercise-media"><video src="${u}" muted loop autoplay playsinline></video></div>`;
  return `<div class="exercise-media"><img src="${u}" alt="${escapeHtml(ex.name)} demonstration" onerror="this.parentElement.innerHTML='<span class=\"media-placeholder\">🏋️</span>'"></div>`;
};

const renderTraining = () => {
  const ws=workouts(); const ex=exercises(); const logs=trainingLogs();
  const week=weekStart();
  const weekLogs=logs.filter(l=>new Date(l.date)>=week);
  const volume=weekLogs.reduce((sum,l)=>sum+(l.sets||[]).reduce((s,x)=>s+(Number(x.weight)||0)*(Number(x.reps)||0),0),0);
  const pbCount=logs.reduce((n,l)=>n+(l.pbCount||0),0);
  document.getElementById('trainingWeekCount').textContent=weekLogs.length;
  document.getElementById('trainingVolumeLabel').textContent=`${fmtWeight(volume)} kg volume`;
  document.getElementById('trainingPBs').textContent=pbCount;
  document.getElementById('trainingStreak').textContent=calcStreak(logs);
  const last=[...logs].sort((a,b)=>b.date.localeCompare(a.date))[0];
  document.getElementById('trainingLastWorkout').textContent=last?dateLabel(last.date):'—';
  document.getElementById('trainingLastWorkoutSub').textContent=last?last.name:'Nothing logged yet';
  document.getElementById('workoutCountLabel').textContent=`${ws.length} saved`;
  const wl=document.getElementById('workoutList'), empty=document.getElementById('emptyWorkouts');
  empty.classList.toggle('hidden',ws.length>0);
  wl.innerHTML=ws.map(w=>`<article class="workout-row"><div class="workout-icon"><svg class="card-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8v8M4.5 10v4M9.5 7v10M17 8v8M19.5 10v4M14.5 7v10M9.5 12h5"/></svg></div><div><h3>${escapeHtml(w.name)}</h3><p>${w.exerciseIds.length} exercises${w.duration?` · ${w.duration} min`:''}${w.notes?` · ${escapeHtml(w.notes)}`:''}</p></div><div class="workout-actions"><button class="secondary small" data-open-workout="${w.id}">Open</button><button class="primary small" data-start-workout="${w.id}">Start</button><button class="icon-btn danger" title="Delete workout" data-delete-workout="${w.id}">×</button></div></article>`).join('');
  wl.querySelectorAll('[data-open-workout]').forEach(b=>b.addEventListener('click',()=>openWorkoutDetail(b.dataset.openWorkout))); wl.querySelectorAll('[data-start-workout]').forEach(b=>b.addEventListener('click',()=>startLiveWorkout(b.dataset.startWorkout)));
  wl.querySelectorAll('[data-delete-workout]').forEach(b=>b.addEventListener('click',()=>{writeJSON(workoutStorageKey,workouts().filter(w=>w.id!==b.dataset.deleteWorkout));renderTraining();}));
  const lib=document.getElementById('exerciseLibrary');
  if (remoteExerciseCache.length) renderExerciseDatabase(remoteExerciseCache);
  else { lib.innerHTML=ex.map(e=>`<article class="exercise-card">${renderExerciseMedia(e)}<div><h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.muscle)} · ${escapeHtml(e.equipment)}</p><small>${escapeHtml(e.instructions||'Add form cues in the exercise editor.')}</small></div></article>`).join(''); }
  const nw=ws[0]; document.getElementById('nextWorkoutMeta').textContent=nw?`${nw.exerciseIds.length} exercises`:'';
  document.getElementById('nextWorkoutBody').innerHTML=nw?`<div class="next-workout-name">${escapeHtml(nw.name)}</div><div class="next-workout-meta"><span>${nw.exerciseIds.length} exercises</span>${nw.duration?`<span>~${nw.duration} min</span>`:''}</div><button class="primary small training-side-button" data-start-next="${nw.id}">Start workout</button>`:`<div class="muted">Create a workout to get started.</div>`;
  document.querySelector('[data-start-next]')?.addEventListener('click',e=>startLiveWorkout(e.currentTarget.dataset.startNext));
  renderProgress(logs);
};

const calcStreak=logs=>{ const set=new Set(logs.map(l=>l.date)); let d=new Date(); d.setHours(0,0,0,0); let count=0; while(set.has(d.toISOString().slice(0,10))){count++;d.setDate(d.getDate()-1);} return count; };
const renderProgress=logs=>{
  const map={}; logs.forEach(l=>(l.sets||[]).forEach(s=>{const k=l.exerciseId||s.exerciseId;if(!map[k])map[k]={best:0,last:0,name:l.exerciseName||'Exercise'}; const v=Number(s.weight)||0; map[k].best=Math.max(map[k].best,v);map[k].last=v;}));
  const arr=Object.values(map).sort((a,b)=>b.best-a.best).slice(0,5); const box=document.getElementById('progressBody');
  box.innerHTML=arr.length?arr.map(x=>`<div class="progress-row"><div><strong>${escapeHtml(x.name)}</strong><span>${fmtWeight(x.best)} kg best</span></div><div class="progress-mini-track"><span style="width:${Math.min(100,Math.max(8,(x.best/(Math.max(x.best,100)))*100))}%"></span></div></div>`).join(''):`<div class="muted">Log your first workout and your exercise progress will appear here.</div>`;
};

const openWorkoutDetail=id=>{
  const w=workouts().find(x=>x.id===id); if(!w)return; activeWorkoutId=id;
  document.getElementById('workoutDetailTitle').textContent=w.name; document.getElementById('workoutDetailSubline').textContent=`${w.exerciseIds.length} exercises${w.duration?` · ~${w.duration} min`:''}`;
  renderWorkoutDetail(w); openTrainingModal(workoutDetailModal);
};

const renderWorkoutDetail=w=>{
  const exs=exercises();
  const exerciseCards=w.exerciseIds.map(id=>{
    const ex=exs.find(x=>x.id===id); if(!ex)return '';
    const exIndex=w.exerciseIds.indexOf(ex.id); const targets=Array.isArray(w.targets?.[exIndex]) ? w.targets[exIndex] : [{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}];
    return `<article class="workout-exercise" data-workout-exercise="${ex.id}"><div class="workout-exercise-head"><div><h3>${escapeHtml(ex.name)}</h3><div class="muted">${escapeHtml(ex.muscle)} · ${escapeHtml(ex.equipment)}</div></div><button class="icon-btn danger" data-remove-exercise="${ex.id}" title="Remove">×</button></div><table class="set-table"><thead><tr><th>Set</th><th>Weight (kg)</th><th>Reps</th><th>Done</th></tr></thead><tbody>${targets.map((target,i)=>`<tr><td>${i+1}</td><td><input class="set-input" inputmode="decimal" data-weight data-index="${i}" value="${target.weight ?? ''}"></td><td><input class="set-input" inputmode="numeric" data-reps data-index="${i}" value="${target.reps ?? ''}"></td><td><input type="checkbox" data-done data-index="${i}"></td></tr>`).join('')}</tbody></table><div class="set-actions"><button class="secondary small" data-add-set="${ex.id}">+ Add set</button><span class="muted" data-last-stat="${ex.id}"></span></div></article>`;
  }).join('');
  document.getElementById('workoutDetailBody').innerHTML=`<div class="workout-detail-toolbar"><strong>${w.exerciseIds.length} exercises</strong><button class="secondary small" id="addExerciseToWorkout">+ Add exercise</button></div>${exerciseCards || '<div class="empty-state"><strong>No exercises yet</strong><p class="muted">Add exercises to this workout.</p></div>'}<div class="modal-actions"><button class="primary" id="finishWorkout">Finish & save workout</button></div>`;
  document.getElementById('addExerciseToWorkout')?.addEventListener('click',()=>showExercisePicker(w));
  document.querySelectorAll('[data-remove-exercise]').forEach(b=>b.addEventListener('click',()=>{w.exerciseIds=w.exerciseIds.filter(x=>x!==b.dataset.removeExercise);persistWorkout(w);renderWorkoutDetail(w);}));
  document.getElementById('finishWorkout')?.addEventListener('click',()=>finishWorkout(w));
  document.querySelectorAll('[data-add-set]').forEach(b=>b.addEventListener('click',()=>{
    const card=b.closest('.workout-exercise'); const tbody=card.querySelector('tbody'); const idx=tbody.children.length; const tr=document.createElement('tr'); tr.innerHTML=`<td>${idx+1}</td><td><input class="set-input" inputmode="decimal" data-weight data-index="${idx}"></td><td><input class="set-input" inputmode="numeric" data-reps data-index="${idx}"></td><td><input type="checkbox" data-done data-index="${idx}"></td>`; tbody.appendChild(tr);
  }));
};
const persistWorkout=w=>writeJSON(workoutStorageKey,workouts().map(x=>x.id===w.id?w:x));
const showExercisePicker=w=>{
  const exs=exercises(); const overlay=document.createElement('div'); overlay.className='exercise-picker';
  overlay.innerHTML=exs.map(e=>`<button class="secondary" type="button" data-pick="${e.id}"><span>${escapeHtml(e.name)}</span><small>${escapeHtml(e.muscle)}</small></button>`).join('');
  const detail=document.getElementById('workoutDetailBody'); const toolbar=detail.querySelector('.workout-detail-toolbar'); toolbar.after(overlay); overlay.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{if(!w.exerciseIds.includes(b.dataset.pick)){w.exerciseIds.push(b.dataset.pick);persistWorkout(w);renderWorkoutDetail(w);}}));
};
const finishWorkout=w=>{
  const cards=[...document.querySelectorAll('.workout-exercise')]; let pbCount=0;
  cards.forEach(card=>{
    const exId=card.dataset.workoutExercise; const ex=exercises().find(x=>x.id===exId); if(!ex)return;
    let sets=[]; [...card.querySelectorAll('tbody tr')].forEach((tr,i)=>{const weight=Number(tr.querySelector('[data-weight]')?.value||0);const reps=Number(tr.querySelector('[data-reps]')?.value||0);const done=!!tr.querySelector('[data-done]')?.checked;if(done && (weight||reps))sets.push({weight,reps,done});});
    if(sets.length){const existing=trainingLogs().filter(l=>l.exerciseId===exId).flatMap(l=>l.sets||[]).reduce((m,s)=>Math.max(m,Number(s.weight)||0),0);const best=Math.max(...sets.map(s=>Number(s.weight)||0));if(best>existing)pbCount++; writeJSON(trainingLogsKey,[...trainingLogs(),{id:uid2('log'),date:new Date().toISOString().slice(0,10),name:w.name,exerciseId:exId,exerciseName:ex.name,sets}]);}
  });
  renderTraining(); closeTrainingModal(workoutDetailModal);
  const count=trainingLogs().filter(l=>l.date===new Date().toISOString().slice(0,10)).length;
  alert(`Workout saved.${pbCount?` ${pbCount} new PB${pbCount===1?'':'s'}!`:''} ${count} exercise${count===1?'':'s'} logged.`);
};

document.getElementById('showProgressButton')?.addEventListener('click',()=>showSection('training'));

document.getElementById('exerciseDbSearch')?.addEventListener('input',()=>renderExerciseDatabase(remoteExerciseCache));
document.getElementById('exerciseDbMuscle')?.addEventListener('change',()=>renderExerciseDatabase(remoteExerciseCache));
document.getElementById('exerciseDbEquipment')?.addEventListener('change',()=>renderExerciseDatabase(remoteExerciseCache));
document.getElementById('training')?.addEventListener('click',(e)=>{ if(e.target.closest('[data-section]')) initExerciseDatabase(); });
renderTraining();
setTimeout(initExerciseDatabase, 60);


// v12 responsive navigation
const mobileMenu = document.getElementById('mobileMenu');
const sidebarToggle = document.getElementById('sidebarToggle');
const navScrim = document.getElementById('navScrim');
const openMobileNav = () => { document.body.classList.add('mobile-nav-open'); navScrim?.classList.remove('hidden'); };
const closeMobileNav = () => { document.body.classList.remove('mobile-nav-open'); navScrim?.classList.add('hidden'); };
mobileMenu?.addEventListener('click', openMobileNav);
navScrim?.addEventListener('click', closeMobileNav);
sidebarToggle?.addEventListener('click', () => {
  if (window.innerWidth <= 760) { closeMobileNav(); return; }
  document.body.classList.toggle('nav-collapsed');
  localStorage.setItem('orbit-nav-collapsed', document.body.classList.contains('nav-collapsed') ? '1' : '0');
});
if (localStorage.getItem('orbit-nav-collapsed') === '1' && window.innerWidth > 760) document.body.classList.add('nav-collapsed');
window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMobileNav(); });
document.querySelectorAll('.nav-item[data-section]').forEach(button => button.addEventListener('click', closeMobileNav));


// v13 mobile search overlay
const mobileSearchTrigger = document.getElementById('mobileSearchTrigger');
const searchBar = document.getElementById('searchBar');
const searchClose = document.getElementById('searchClose');
const globalSearch = document.getElementById('globalSearch');
const topbar = document.querySelector('.topbar');
const openSearch = () => {
  topbar?.classList.add('search-open');
  setTimeout(() => globalSearch?.focus(), 40);
};
const closeSearch = () => {
  topbar?.classList.remove('search-open');
  globalSearch?.blur();
};
mobileSearchTrigger?.addEventListener('click', openSearch);
searchClose?.addEventListener('click', closeSearch);
globalSearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSearch();
});
document.addEventListener('click', (event) => {
  if (!topbar?.classList.contains('search-open')) return;
  if (!topbar.contains(event.target)) closeSearch();
});


// --- Orbit live workout screen (v17) ----------------------------------------
const liveWorkoutModal = document.getElementById('liveWorkoutModal');
const liveWorkoutBody = document.getElementById('liveWorkoutBody');
const liveWorkoutTitle = document.getElementById('liveWorkoutTitle');
const liveWorkoutMeta = document.getElementById('liveWorkoutMeta');
const liveWorkoutProgressBar = document.getElementById('liveWorkoutProgressBar');
const liveWorkoutSaveState = document.getElementById('liveWorkoutSaveState');
const restTimerDisplay = document.getElementById('restTimerDisplay');
const restTimerButton = document.getElementById('restTimerButton');
const restStartStop = document.getElementById('restStartStop');
const restMinus = document.getElementById('restMinus');
const restPlus = document.getElementById('restPlus');
const restReset = document.getElementById('restReset');
const liveWorkoutMinimise = document.getElementById('liveWorkoutMinimise');
const finishLiveWorkoutButton = document.getElementById('finishLiveWorkout');
const liveDraftKey = 'orbit-live-workout-draft';
let liveWorkoutState = null;
let restSeconds = 90;
let restRunning = false;
let restInterval = null;

const getHistoricalExerciseLogs = exId => trainingLogs().filter(l => l.exerciseId === exId).sort((a,b) => {
  const ad = a.loggedAt || `${a.date || ''}T00:00:00`;
  const bd = b.loggedAt || `${b.date || ''}T00:00:00`;
  return ad.localeCompare(bd);
});
const getLatestExerciseLog = exId => {
  const logs = getHistoricalExerciseLogs(exId);
  return logs.length ? logs[logs.length - 1] : null;
};
const getHistoricalBestWeight = exId => getHistoricalExerciseLogs(exId).flatMap(l => l.sets || []).reduce((best,s) => Math.max(best, Number(s.weight)||0), 0);
const readLiveDraft = () => readJSON(liveDraftKey, null);
const writeLiveDraft = state => {
  if (!state) return;
  writeJSON(liveDraftKey, state);
  if (liveWorkoutSaveState) liveWorkoutSaveState.textContent = `Saved ${new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}`;
};
const clearLiveDraft = () => localStorage.removeItem(liveDraftKey);
const formatClock = total => {
  const sec = Math.max(0, Math.round(total));
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
};
const updateRestUI = () => {
  const label = formatClock(restSeconds);
  if (restTimerDisplay) restTimerDisplay.textContent = label;
  if (restTimerButton) restTimerButton.textContent = `Rest ${label}`;
  if (restStartStop) restStartStop.textContent = restRunning ? 'Pause' : 'Start';
};
const stopRestTimer = () => { restRunning = false; if (restInterval) clearInterval(restInterval); restInterval = null; updateRestUI(); };
const startRestTimer = () => {
  if (restRunning) return;
  restRunning = true;
  updateRestUI();
  restInterval = setInterval(() => {
    restSeconds -= 1;
    if (restSeconds <= 0) { restSeconds = 0; stopRestTimer(); try { navigator.vibrate?.([180,80,180]); } catch {} }
    updateRestUI();
  }, 1000);
};
const resetRestTimer = () => { stopRestTimer(); restSeconds = 90; updateRestUI(); };
const renderLiveMedia = ex => {
  if (!ex?.mediaUrl) return `<div class="live-demo-panel"><span class="muted">No demonstration media is attached to this exercise yet.</span></div>`;
  const u=escapeHtml(ex.mediaUrl); const low=String(ex.mediaUrl).toLowerCase();
  const body=(low.endsWith('.mp4')||low.includes('video')) ? `<video src="${u}" controls muted loop autoplay playsinline></video>` : `<img src="${u}" alt="${escapeHtml(ex.name)} demonstration">`;
  return `<div class="live-demo-panel">${body}</div>`;
};
const buildLiveSets = (exId, planned) => {
  const latest = getLatestExerciseLog(exId);
  const previous = Array.isArray(latest?.sets) ? latest.sets : [];
  const draft = liveWorkoutState?.setsByExercise?.[exId];
  if (Array.isArray(draft) && draft.length) return draft.map(x => ({weight:x.weight ?? '', reps:x.reps ?? '', done:!!x.done}));
  if (previous.length) return previous.map(x => ({weight:x.weight ?? '', reps:x.reps ?? '', done:false}));
  if (Array.isArray(planned) && planned.length) return planned.map(x => ({weight:x.weight ?? '', reps:x.reps ?? '', done:false}));
  return [{weight:'',reps:'',done:false},{weight:'',reps:'',done:false},{weight:'',reps:'',done:false}];
};
const currentDoneCount = () => {
  let done=0,total=0;
  (liveWorkoutState?.setsByExercise ? Object.values(liveWorkoutState.setsByExercise) : []).forEach(sets => (sets||[]).forEach(s=>{ total++; if(s.done) done++; }));
  return {done,total};
};
const refreshLiveProgress = () => {
  const {done,total}=currentDoneCount();
  if(liveWorkoutProgressBar) liveWorkoutProgressBar.style.width = total ? `${Math.min(100,(done/total)*100)}%` : '0%';
  if(liveWorkoutMeta && liveWorkoutState) liveWorkoutMeta.textContent = `${liveWorkoutState.exerciseIds.length} exercises · ${done}/${total} sets complete`;
};
const persistLiveFromDOM = () => {
  if (!liveWorkoutState) return;
  const setsByExercise = {};
  document.querySelectorAll('.live-exercise-card').forEach(card => {
    const id = card.dataset.exerciseId;
    setsByExercise[id] = [...card.querySelectorAll('tbody tr')].map(row => ({
      weight: row.querySelector('[data-live-weight]')?.value || '',
      reps: row.querySelector('[data-live-reps]')?.value || '',
      done: !!row.querySelector('[data-live-done]')?.checked
    }));
  });
  liveWorkoutState.setsByExercise = setsByExercise;
  writeLiveDraft(liveWorkoutState);
  refreshLiveProgress();
};
const renderLiveWorkout = w => {
  const exs = exercises();
  liveWorkoutTitle.textContent = w.name;
  liveWorkoutMeta.textContent = `${w.exerciseIds.length} exercises`;
  const cards = w.exerciseIds.map((id,index) => {
    const ex = exs.find(x=>x.id===id); if(!ex) return '';
    const latest = getLatestExerciseLog(id);
    const previousSets = Array.isArray(latest?.sets) ? latest.sets : [];
    const planned = Array.isArray(w.targets?.[index]) ? w.targets[index] : [];
    const sets = buildLiveSets(id, planned);
    const historicalBest = getHistoricalBestWeight(id);
    return `<article class="live-exercise-card" data-exercise-id="${escapeHtml(id)}">
      <div class="live-exercise-top">
        <div class="live-exercise-media">${ex.mediaUrl ? ((String(ex.mediaUrl).toLowerCase().endsWith('.mp4')||String(ex.mediaUrl).toLowerCase().includes('video'))?`<video src="${escapeHtml(ex.mediaUrl)}" muted loop autoplay playsinline></video>`:`<img src="${escapeHtml(ex.mediaUrl)}" alt="">`) : `<span class="media-placeholder">🏋️</span>`}</div>
        <div class="live-exercise-name"><h3>${escapeHtml(ex.name)}</h3><p>${escapeHtml(ex.muscle || 'General')} · ${escapeHtml(ex.equipment || '—')}</p></div>
        ${ex.mediaUrl ? `<button class="secondary small demo-button" type="button" data-demo-toggle="${escapeHtml(id)}">View demo</button>` : ''}
      </div>
      <div class="live-exercise-meta"><span>${previousSets.length ? `Last: ${escapeHtml(previousSets.map(s=>`${s.weight || '—'} × ${s.reps || '—'}`).join(' · '))}` : 'No previous session'}</span>${historicalBest ? `<span>Best: ${fmtWeight(historicalBest)} kg</span>` : '<span>First logged session</span>'}</div>
      <div class="live-demo-slot hidden" data-demo-slot="${escapeHtml(id)}">${renderLiveMedia(ex)}</div>
      <table class="live-set-table"><thead><tr><th>Set</th><th>Previous</th><th>Weight</th><th>Reps</th><th>Done</th><th></th></tr></thead><tbody>${sets.map((set,i)=>{
        const prev=previousSets[i] || {};
        const isPB=historicalBest>0 && Number(set.weight)>historicalBest;
        return `<tr class="${set.done?'is-done':''}" data-set-row="${i}"><td class="live-set-num">${i+1}</td><td class="previous-value">${prev.weight ? `<b>${escapeHtml(String(prev.weight))}</b> × ${escapeHtml(String(prev.reps||'—'))}` : '—'}</td><td><input class="live-set-input" data-live-weight data-index="${i}" inputmode="decimal" value="${escapeHtml(String(set.weight))}" aria-label="Set ${i+1} weight"></td><td><input class="live-set-input" data-live-reps data-index="${i}" inputmode="numeric" value="${escapeHtml(String(set.reps))}" aria-label="Set ${i+1} reps"></td><td><input type="checkbox" data-live-done data-index="${i}" ${set.done?'checked':''} aria-label="Complete set ${i+1}"></td><td>${isPB?'<span class="pb-badge">New PB</span>':''}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="live-set-tools"><button class="secondary small" type="button" data-live-add-set="${escapeHtml(id)}">+ Add set</button><span class="muted">${escapeHtml(ex.instructions || 'Use controlled reps and keep good form.')}</span></div>
    </article>`;
  }).join('');
  liveWorkoutBody.innerHTML = cards || `<div class="empty-state"><strong>No exercises in this workout</strong><span>Add exercises before starting.</span></div>`;
  wireLiveWorkoutEvents();
  refreshLiveProgress();
};
const wireLiveWorkoutEvents = () => {
  liveWorkoutBody.querySelectorAll('[data-demo-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const slot=liveWorkoutBody.querySelector(`[data-demo-slot="${CSS.escape(btn.dataset.demoToggle)}"]`); if(!slot)return;
    slot.classList.toggle('hidden'); btn.textContent = slot.classList.contains('hidden') ? 'View demo' : 'Hide demo';
  }));
  liveWorkoutBody.querySelectorAll('[data-live-add-set]').forEach(btn => btn.addEventListener('click', () => {
    const card=btn.closest('.live-exercise-card'); const tbody=card?.querySelector('tbody'); if(!tbody)return;
    const idx=tbody.children.length; const row=document.createElement('tr');
    row.innerHTML=`<td class="live-set-num">${idx+1}</td><td class="previous-value">—</td><td><input class="live-set-input" data-live-weight data-index="${idx}" inputmode="decimal" value="" aria-label="Set ${idx+1} weight"></td><td><input class="live-set-input" data-live-reps data-index="${idx}" inputmode="numeric" value="" aria-label="Set ${idx+1} reps"></td><td><input type="checkbox" data-live-done data-index="${idx}" aria-label="Complete set ${idx+1}"></td><td></td>`;
    tbody.appendChild(row); persistLiveFromDOM();
  }));
  liveWorkoutBody.querySelectorAll('[data-live-done]').forEach(input => input.addEventListener('change', () => {
    input.closest('tr')?.classList.toggle('is-done', input.checked);
    if(input.checked) { restSeconds=90; startRestTimer(); }
    persistLiveFromDOM();
    // update PB badge after input changes/checks
  }));
  liveWorkoutBody.querySelectorAll('[data-live-weight],[data-live-reps]').forEach(input => input.addEventListener('input', () => { persistLiveFromDOM(); updateLivePBs(input.closest('.live-exercise-card')); }));
};
const updateLivePBs = card => {
  if(!card) return;
  const best=getHistoricalBestWeight(card.dataset.exerciseId);
  card.querySelectorAll('tbody tr').forEach(row => {
    let cell=row.lastElementChild; if(!cell)return;
    const weight=Number(row.querySelector('[data-live-weight]')?.value||0);
    cell.innerHTML = best>0 && weight>best ? '<span class="pb-badge">New PB</span>' : '';
  });
};
const startLiveWorkout = id => {
  const w=workouts().find(x=>x.id===id); if(!w)return;
  const draft=readLiveDraft();
  if(draft?.workoutId===id) {
    liveWorkoutState=draft;
  } else {
    liveWorkoutState={workoutId:id,workoutName:w.name,exerciseIds:[...w.exerciseIds],startedAt:new Date().toISOString(),setsByExercise:{}};
    w.exerciseIds.forEach((eid,idx)=>{liveWorkoutState.setsByExercise[eid]=buildLiveSets(eid,Array.isArray(w.targets?.[idx])?w.targets[idx]:[]);});
    writeLiveDraft(liveWorkoutState);
  }
  renderLiveWorkout(w); openTrainingModal(liveWorkoutModal); resetRestTimer();
};
const minimiseLiveWorkout = () => { persistLiveFromDOM(); liveWorkoutModal?.classList.add('live-workout-minimised'); };
const restoreLiveWorkout = () => { liveWorkoutModal?.classList.remove('live-workout-minimised'); const w=workouts().find(x=>x.id===liveWorkoutState?.workoutId); if(w) renderLiveWorkout(w); };
const finishLiveWorkout = () => {
  if(!liveWorkoutState) return;
  persistLiveFromDOM();
  const w=workouts().find(x=>x.id===liveWorkoutState.workoutId); if(!w)return;
  const sessionId=uid2('session'); const loggedAt=new Date().toISOString(); let exerciseCount=0; let pbCount=0; let totalVolume=0;
  Object.entries(liveWorkoutState.setsByExercise || {}).forEach(([exId,sets])=>{
    const ex=exercises().find(x=>x.id===exId); if(!ex)return;
    const completed=(sets||[]).map(s=>({weight:Number(s.weight)||0,reps:Number(s.reps)||0,done:!!s.done})).filter(s=>s.done&&(s.weight||s.reps));
    if(!completed.length)return;
    exerciseCount++;
    const priorBest=getHistoricalBestWeight(exId); const best=Math.max(...completed.map(s=>s.weight)); if(best>priorBest && priorBest>0) pbCount++; else if(priorBest===0 && best>0) pbCount++;
    completed.forEach(s=>{totalVolume += s.weight*s.reps;});
    writeJSON(trainingLogsKey,[...trainingLogs(),{id:uid2('log'),sessionId,date:loggedAt.slice(0,10),loggedAt,name:w.name,exerciseId:exId,exerciseName:ex.name,sets:completed,pbCount:best>priorBest?1:0}]);
  });
  if(!exerciseCount){ alert('Complete at least one set before finishing the workout. Your draft is still saved on this device.'); return; }
  clearLiveDraft(); liveWorkoutState=null; resetRestTimer(); liveWorkoutModal?.classList.remove('live-workout-minimised'); closeTrainingModal(liveWorkoutModal); renderTraining();
  alert(`Workout saved. ${exerciseCount} exercises · ${fmtWeight(totalVolume)} kg volume${pbCount?` · ${pbCount} new PB${pbCount===1?'':'s'}`:''}.`);
};
restStartStop?.addEventListener('click',()=>restRunning ? stopRestTimer() : startRestTimer());
restTimerButton?.addEventListener('click',()=>restRunning ? stopRestTimer() : startRestTimer());
restMinus?.addEventListener('click',()=>{restSeconds=Math.max(0,restSeconds-30);updateRestUI();});
restPlus?.addEventListener('click',()=>{restSeconds+=30;updateRestUI();});
restReset?.addEventListener('click',resetRestTimer);
liveWorkoutMinimise?.addEventListener('click',()=> liveWorkoutModal?.classList.contains('live-workout-minimised') ? restoreLiveWorkout() : minimiseLiveWorkout());
finishLiveWorkoutButton?.addEventListener('click',finishLiveWorkout);

// Home and Next Workout buttons should start the live workout experience.
document.querySelectorAll('.stat-card button.primary.small').forEach(btn => {
  if (btn.textContent.trim().toLowerCase().includes('start workout')) {
    btn.addEventListener('click', () => { const w=workouts()[0]; if(w) startLiveWorkout(w.id); });
  }
});
