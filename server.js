/* ============================================================
   DATA CONFIG
   ============================================================ */
const BED_TYPES = [
  { code:'KB', label:'King Bed',   segment:'Couple',            min:1, max:2, rate:15000, count:2 },
  { code:'QB', label:'Queen Bed',  segment:'Couple',             min:1, max:2, rate:12000, count:3 },
  { code:'TB', label:'Twin Beds',  segment:'Barkada / Group',    min:2, max:4, rate:10000, count:2 },
  { code:'DB', label:'Double Bed', segment:'Family',             min:4, max:6, rate:9000,  count:5 },
  { code:'SB', label:'Single Bed', segment:'Solo',               min:1, max:2, rate:6000,  count:5 },
];

const DEFAULT_STATUS_OVERRIDES = {};

function buildRooms(){
  const rooms = [];
  BED_TYPES.forEach(bt=>{
    for(let i=1;i<=bt.count;i++){
      const num = String(i).padStart(2,'0');
      const code = `RM${num}${bt.code}`;
      rooms.push({
        code,
        bedCode: bt.code,
        bedLabel: bt.label,
        segment: bt.segment,
        min: bt.min,
        max: bt.max,
        rate: bt.rate,
        status: DEFAULT_STATUS_OVERRIDES[code] || 'available'
      });
    }
  });
  return rooms;
}

const STORAGE_KEY = 'okada_fd_room_status_v2';

function loadRoomState(){
  const rooms = buildRooms();
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    rooms.forEach(r=>{
      const entry = saved[r.code];
      if(entry){
        r.status = entry.status || entry; // supports legacy string-only format
        r.bookedAt = entry.bookedAt || null;
      }
    });
  }catch(e){}
  return rooms;
}
function persistRoomState(){
  const map = {};
  ROOMS.forEach(r=> map[r.code] = { status:r.status, bookedAt:r.bookedAt || null });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

let ROOMS = loadRoomState();
let activeFilter = 'ALL';
let selectedRoom = null;
let booking = {};
let payMethod = null;

/* ============================================================
   UTIL
   ============================================================ */
const peso = n => '₱' + Number(n||0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
const $ = id => document.getElementById(id);
function bookedAtLabel(iso){
  if(!iso) return '';
  return new Date(iso).toLocaleString('en-PH', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
}

function updateClock(){
  const now = new Date();
  $('header-clock').textContent = now.toLocaleString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
setInterval(updateClock, 1000*30);

/* ============================================================
   LOGIN
   ============================================================ */
$('login-form').addEventListener('submit', function(e){
  e.preventDefault();
  const u = $('login-username').value.trim();
  const p = $('login-password').value.trim();
  if(u === 'admin123' && p === '123'){
    $('login-error').classList.add('hidden');
    $('login-screen').classList.add('hidden');
    const overlay = $('welcome-overlay');
    overlay.classList.remove('hidden');
    setTimeout(()=>{
      overlay.classList.add('hidden');
      $('app').classList.remove('hidden');
      updateClock();
      renderBedFilters();
      renderRooms();
    }, 2600);
  } else {
    $('login-error').classList.remove('hidden');
  }
});

$('logout-btn').addEventListener('click', ()=>{
  $('app').classList.add('hidden');
  $('login-form').reset();
  $('login-screen').classList.remove('hidden');
  goToView('rooms');
});

/* ============================================================
   VIEW ROUTING
   ============================================================ */
function goToView(name){
  ['rooms','booking','payment','success','activitylog','report3'].forEach(v=>{
    $('view-'+v).classList.toggle('hidden', v!==name);
  });
  const titles = { rooms:'Room Availability', booking:'Guest Reservation Details', payment:'Payment', success:'Booking Confirmed', activitylog:'Activity Log', report3:'Hotel Report' };
  $('page-title').textContent = titles[name];
  if(name!=='activitylog' && name!=='report3'){
    $('page-eyebrow').textContent = 'Module 1 — Guest Reservation';
    $('nav-module1').classList.add('active');
    $('nav-module2').classList.remove('active');
    $('nav-module3').classList.remove('active');
  }
  window.scrollTo({top:0, behavior:'smooth'});
}
$('nav-module1').addEventListener('click', (e)=>{ e.preventDefault(); renderRooms(); goToView('rooms'); });
document.querySelectorAll('.back-to-rooms').forEach(b=> b.addEventListener('click', ()=>{ renderRooms(); goToView('rooms'); }));
document.querySelector('.back-to-booking').addEventListener('click', ()=> goToView('booking'));

/* ============================================================
   ROOMS VIEW
   ============================================================ */
function renderBedFilters(){
  const wrap = $('bed-filters');
  const filters = [{code:'ALL', label:'All Rooms'}, ...BED_TYPES.map(b=>({code:b.code, label:b.label}))];
  wrap.innerHTML = filters.map(f => `
    <button class="chip ${activeFilter===f.code?'active':''} px-3.5 py-1.5 rounded-full text-xs font-medium" data-filter="${f.code}">${f.label}</button>
  `).join('');
  wrap.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{ activeFilter = btn.dataset.filter; renderBedFilters(); renderRooms(); });
  });
}

function statusMeta(status){
  if(status==='available') return { label:'Available', border:'var(--success)', bg:'var(--success-bg)', text:'var(--success)', clickable:true };
  if(status==='occupied') return { label:'Occupied', border:'var(--danger)', bg:'var(--danger-bg)', text:'var(--danger)', clickable:false };
  return { label:'Maintenance', border:'var(--amber)', bg:'var(--amber-bg)', text:'var(--amber)', clickable:false };
}

function renderRooms(){
  const grid = $('rooms-grid');
  const filtered = activeFilter==='ALL' ? ROOMS : ROOMS.filter(r=> r.bedCode===activeFilter);

  $('stat-available').textContent = ROOMS.filter(r=>r.status==='available').length;
  $('stat-occupied').textContent = ROOMS.filter(r=>r.status==='occupied').length;
  $('stat-maintenance').textContent = ROOMS.filter(r=>r.status==='maintenance').length;

  grid.innerHTML = filtered.map(r=>{
    const m = statusMeta(r.status);
    return `
    <div class="room-card ${m.clickable?'selectable':''} bg-white rounded-xl overflow-hidden border" data-code="${r.code}"
         style="border-color:${m.border}33; ${m.clickable?'cursor:pointer;':'opacity:.72; cursor:not-allowed;'}">
      <div class="h-1.5" style="background:${m.border};"></div>
      <div class="p-4">
        <div class="flex items-start justify-between">
          <p class="font-mono text-lg font-semibold tracking-wide">${r.code}</p>
          <span class="text-[10px] font-semibold uppercase tracking-wider2 px-2 py-1 rounded-full" style="background:${m.bg}; color:${m.text};">${m.label}</span>
        </div>
        <p class="text-sm text-gray-600 mt-2">${r.bedLabel}</p>
        <p class="text-[11px] text-gray-400">${r.segment} · ${r.min===r.max? r.max : r.min+'–'+r.max} pax</p>
        ${r.status==='occupied' && r.bookedAt ? `
        <p class="text-[11px] mt-1.5 flex items-center gap-1" style="color:var(--danger);">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Booked ${bookedAtLabel(r.bookedAt)}
        </p>` : ''}
        <div class="flex items-center justify-between mt-3 pt-3 border-t" style="border-color:var(--line);">
          <span class="text-xs text-gray-400">Rate / night</span>
          <span class="text-sm font-semibold font-mono">${peso(r.rate)}</span>
        </div>
        ${r.status==='occupied' ? `
        <button class="btn-ghost w-full mt-3 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5" data-checkout="${r.code}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          Check Out
        </button>` : ''}
      </div>
    </div>`;
  }).join('') || `<p class="text-sm text-gray-400 col-span-full py-10 text-center">No rooms match this filter.</p>`;

  grid.querySelectorAll('.room-card.selectable').forEach(card=>{
    card.addEventListener('click', ()=>{
      const room = ROOMS.find(r=> r.code===card.dataset.code);
      openBooking(room);
    });
  });

  grid.querySelectorAll('[data-checkout]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      checkoutRoom(btn.dataset.checkout);
    });
  });
}

function checkoutRoom(code){
  const room = ROOMS.find(r=> r.code===code);
  if(!room) return;
  if(!confirm(`Check out ${room.code}? This will mark the room as available again.`)) return;
  room.status = 'available';
  room.bookedAt = null;
  persistRoomState();
  renderRooms();
}

/* ============================================================
   BOOKING VIEW
   ============================================================ */
function openBooking(room){
  selectedRoom = room;
  booking = {};
  $('booking-form').reset();
  $('stay-error').classList.add('hidden');

  $('booking-room-summary').innerHTML = `
    <div>
      <p class="text-[10px] tracking-wider2 uppercase" style="color:var(--gold-light);">Selected Room</p>
      <p class="font-mono text-2xl mt-1">${room.code}</p>
      <p class="text-white/50 text-sm mt-0.5">${room.bedLabel} · ${room.segment}</p>
    </div>
    <div class="text-right">
      <p class="text-[10px] tracking-wider2 uppercase text-white/40">Capacity</p>
      <p class="text-lg font-semibold mt-1">${room.min===room.max? room.max : room.min+'–'+room.max} guests</p>
      <p class="text-white/50 text-sm mt-0.5">${peso(room.rate)} / night</p>
    </div>
  `;

  $('f-guests').min = room.min;
  $('f-guests').max = room.max;
  $('f-guests').value = room.min;
  $('guests-hint').textContent = `This room accommodates ${room.min===room.max? room.max : room.min+'–'+room.max} guest(s).`;

  const today = new Date().toISOString().split('T')[0];
  $('f-checkin').value = today;
  const tmr = new Date(); tmr.setDate(tmr.getDate()+1);
  $('f-checkout').value = tmr.toISOString().split('T')[0];
  $('f-checkin').min = today;

  goToView('booking');
}

$('booking-form').addEventListener('submit', function(e){
  e.preventDefault();
  const checkin = new Date($('f-checkin').value);
  const checkout = new Date($('f-checkout').value);
  if(checkout <= checkin){
    $('stay-error').classList.remove('hidden');
    return;
  }
  $('stay-error').classList.add('hidden');

  const guests = Number($('f-guests').value);
  if(guests < selectedRoom.min || guests > selectedRoom.max){
    alert(`Number of guests must be between ${selectedRoom.min} and ${selectedRoom.max} for ${selectedRoom.bedLabel}.`);
    return;
  }

  const nights = Math.max(1, Math.round((checkout-checkin)/86400000));

  booking = {
    room: selectedRoom,
    fullname: $('f-fullname').value,
    age: $('f-age').value,
    gender: $('f-gender').value,
    nationality: $('f-nationality').value,
    contact: $('f-contact').value,
    email: $('f-email').value,
    address: $('f-address').value,
    guests,
    checkin: $('f-checkin').value,
    checkout: $('f-checkout').value,
    nights,
    access: {
      wheelchair: $('a-wheelchair').checked,
      bathroom: $('a-bathroom').checked,
      elevator: $('a-elevator').checked,
    },
    emname: $('f-emname').value,
    emphone: $('f-emphone').value,
  };

  openPayment();
});

/* ============================================================
   PAYMENT VIEW
   ============================================================ */
function openPayment(){
  payMethod = null;
  $('panel-qr').classList.add('hidden');
  $('panel-cash').classList.add('hidden');
  $('tile-qr').classList.remove('selected');
  $('tile-cash').classList.remove('selected');
  ['addon1-label','addon1-amount','addon2-label','addon2-amount','cash-received'].forEach(id=> $(id).value='');
  $('btn-cash-confirm').disabled = true;

  const r = booking.room;
  $('pay-summary').innerHTML = `
    <div class="flex justify-between"><span class="text-gray-400">Room</span><span class="font-mono font-semibold">${r.code}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Guest</span><span class="font-medium text-right">${booking.fullname}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Check-in</span><span>${booking.checkin}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Check-out</span><span>${booking.checkout}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Nights</span><span>${booking.nights}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Guests</span><span>${booking.guests}</span></div>
    <div class="flex justify-between pt-2 border-t mt-2" style="border-color:var(--line);"><span class="text-gray-400">Rate / night</span><span class="font-mono">${peso(r.rate)}</span></div>
  `;

  computeCash();
  goToView('payment');
}

function selectPayMethod(method){
  payMethod = method;
  $('tile-qr').classList.toggle('selected', method==='qr');
  $('tile-cash').classList.toggle('selected', method==='cash');
  $('panel-qr').classList.toggle('hidden', method!=='qr');
  $('panel-cash').classList.toggle('hidden', method!=='cash');

  if(method==='qr'){
    const total = booking.room.rate * booking.nights;
    $('qr-amount').textContent = peso(total * 1.12);
    $('qr-holder').innerHTML = generateQR();
  } else {
    computeCash();
  }
}

function generateQR(){
  // decorative mock QR pattern (not a real scannable code)
  let cells = '';
  const size = 21, cell = 8;
  let seed = 42;
  function rand(){ seed = (seed*9301+49297)%233280; return seed/233280; }
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      const isFinder = (x<7&&y<7)||(x>size-8&&y<7)||(x<7&&y>size-8);
      const on = isFinder ? finderPattern(x,y,size) : rand()>0.55;
      if(on) cells += `<rect class="qr-pixel" x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  const total = size*cell;
  return `<svg width="180" height="180" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg"><rect width="${total}" height="${total}" fill="#fff"/>${cells}</svg>`;
}
function finderPattern(x,y,size){
  const fx = x<7?x : x>size-8? x-(size-7) : -1;
  const fy = y<7?y : -1;
  if(fx<0) return false;
  const ring = Math.max(Math.abs(fx-3), Math.abs(fy-3));
  return ring===3 || ring===1;
}

function computeCash(){
  const r = booking.room;
  const roomTotal = r.rate * booking.nights;
  const a1 = Number($('addon1-amount').value)||0;
  const a2 = Number($('addon2-amount').value)||0;
  const subtotal = roomTotal + a1 + a2;
  const tax = subtotal * 0.12;
  const total = subtotal + tax;
  const received = Number($('cash-received').value)||0;
  const change = Math.max(0, received-total);

  $('cash-nights-label').textContent = `(${peso(r.rate)} × ${booking.nights} night${booking.nights>1?'s':''})`;
  $('cash-room-total').textContent = peso(roomTotal);
  $('cash-subtotal').textContent = peso(subtotal);
  $('cash-tax').textContent = peso(tax);
  $('cash-total').textContent = peso(total);
  $('cash-change').textContent = peso(change);

  $('btn-cash-confirm').disabled = received < total || total<=0;
  computeCash._total = total;
  computeCash._breakdown = {roomTotal, addon1:a1, addon2:a2, subtotal, tax, total, received, change};
}
['addon1-amount','addon2-amount','cash-received'].forEach(id=> $(id).addEventListener('input', computeCash));

$('btn-qr-confirm').addEventListener('click', ()=>{
  const total = booking.room.rate * booking.nights * 1.12;
  finalizeBooking('BPI / BDO (QR)', total, null);
});
$('btn-cash-confirm').addEventListener('click', ()=>{
  const b = computeCash._breakdown;
  finalizeBooking('Cash on Hand', b.total, b);
});

/* ============================================================
   FINALIZE
   ============================================================ */
function finalizeBooking(methodLabel, totalPaid, cashBreakdown){
  selectedRoom.status = 'occupied';
  selectedRoom.bookedAt = new Date().toISOString();
  persistRoomState();

  $('success-summary').innerHTML = `
    <div class="flex justify-between"><span class="text-gray-400">Room</span><span>${booking.room.code} — ${booking.room.bedLabel}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Guest</span><span>${booking.fullname}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Stay</span><span>${booking.checkin} → ${booking.checkout} (${booking.nights}n)</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Guests</span><span>${booking.guests}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Payment Method</span><span>${methodLabel}</span></div>
    ${cashBreakdown ? `<div class="flex justify-between"><span class="text-gray-400">Cash Received</span><span>${peso(cashBreakdown.received)}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Change</span><span>${peso(cashBreakdown.change)}</span></div>` : ''}
    <div class="flex justify-between pt-2 border-t mt-2 font-semibold" style="border-color:var(--line);"><span>Total Paid</span><span>${peso(totalPaid)}</span></div>
  `;

  goToView('success');
}

/* ============================================================
   INIT
   ============================================================ */
updateClock();