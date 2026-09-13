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
const orbitModals = ['flightModal', 'tripModal', 'tripDetailModal', 'itemModal', 'workoutModal', 'exerciseModal', 'workoutDetailModal']
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
  wl.innerHTML=ws.map(w=>`<article class="workout-row"><div class="workout-icon"><svg class="card-icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8v8M4.5 10v4M9.5 7v10M17 8v8M19.5 10v4M14.5 7v10M9.5 12h5"/></svg></div><div><h3>${escapeHtml(w.name)}</h3><p>${w.exerciseIds.length} exercises${w.duration?` · ${w.duration} min`:''}${w.notes?` · ${escapeHtml(w.notes)}`:''}</p></div><div class="workout-actions"><button class="secondary small" data-open-workout="${w.id}">Open</button><button class="icon-btn danger" title="Delete workout" data-delete-workout="${w.id}">×</button></div></article>`).join('');
  wl.querySelectorAll('[data-open-workout]').forEach(b=>b.addEventListener('click',()=>openWorkoutDetail(b.dataset.openWorkout)));
  wl.querySelectorAll('[data-delete-workout]').forEach(b=>b.addEventListener('click',()=>{writeJSON(workoutStorageKey,workouts().filter(w=>w.id!==b.dataset.deleteWorkout));renderTraining();}));
  const lib=document.getElementById('exerciseLibrary');
  lib.innerHTML=ex.map(e=>`<article class="exercise-card">${renderExerciseMedia(e)}<div><h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.muscle)} · ${escapeHtml(e.equipment)}</p><small>${escapeHtml(e.instructions||'Add form cues in the exercise editor.')}</small></div></article>`).join('');
  const nw=ws[0]; document.getElementById('nextWorkoutMeta').textContent=nw?`${nw.exerciseIds.length} exercises`:'';
  document.getElementById('nextWorkoutBody').innerHTML=nw?`<div class="next-workout-name">${escapeHtml(nw.name)}</div><div class="next-workout-meta"><span>${nw.exerciseIds.length} exercises</span>${nw.duration?`<span>~${nw.duration} min</span>`:''}</div><button class="primary small training-side-button" data-start-next="${nw.id}">Start workout</button>`:`<div class="muted">Create a workout to get started.</div>`;
  document.querySelector('[data-start-next]')?.addEventListener('click',e=>openWorkoutDetail(e.currentTarget.dataset.startNext));
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
    return `<article class="workout-exercise" data-workout-exercise="${ex.id}"><div class="workout-exercise-head"><div><h3>${escapeHtml(ex.name)}</h3><div class="muted">${escapeHtml(ex.muscle)} · ${escapeHtml(ex.equipment)}</div></div><button class="icon-btn danger" data-remove-exercise="${ex.id}" title="Remove">×</button></div><table class="set-table"><thead><tr><th>Set</th><th>Weight (kg)</th><th>Reps</th><th>Done</th></tr></thead><tbody>${[0,1,2].map((_,i)=>`<tr><td>${i+1}</td><td><input class="set-input" inputmode="decimal" data-weight data-index="${i}" value=""></td><td><input class="set-input" inputmode="numeric" data-reps data-index="${i}" value=""></td><td><input type="checkbox" data-done data-index="${i}"></td></tr>`).join('')}</tbody></table><div class="set-actions"><button class="secondary small" data-add-set="${ex.id}">+ Add set</button><span class="muted" data-last-stat="${ex.id}"></span></div></article>`;
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
renderTraining();


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
