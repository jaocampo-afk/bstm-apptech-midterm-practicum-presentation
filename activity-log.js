/* ============================================================
   MODULE 2 — ACTIVITY LOG (LOG BOOK)
   Self-contained. Mock data only — not wired to Module 1's
   live reservation state. Drop this file in alongside index.html
   and add:  <script src="activity-log.js"></script>  before </body>.

   Requires in index.html:
   - <section id="view-activitylog" class="hidden"></section>
   - <a id="nav-module2">Activity Log</a> in the sidenav
   - <a id="nav-module1"> on the Module 1 nav link
   - <p id="page-eyebrow"> and <h1 id="page-title"> in the header
   ============================================================ */

/* ---------- MOCK DATA ---------- */
const LOG_ENTRIES = [
  { ts:'2026-08-17T07:42', time:'7:42 AM', officer:'Front Desk Officer', type:'system',      title:'Logged in to Front Desk Portal',            detail:'Session started at Front Desk Terminal 1.' },
  { ts:'2026-08-17T08:15', time:'8:15 AM', officer:'Front Desk Officer', type:'checkin',      title:'Checked in guest Maria Santos',              detail:'Room RM01KB · King Bed · 2 guests · 2 nights.' },
  { ts:'2026-08-17T08:17', time:'8:17 AM', officer:'Front Desk Officer', type:'payment',      title:'Payment received — BPI / BDO QR',            detail:'₱33,600.00 for Room RM01KB, confirmed by front desk.' },
  { ts:'2026-08-17T09:02', time:'9:02 AM', officer:'Housekeeping',       type:'maintenance',  title:'Room RM03DB flagged for maintenance',        detail:'Plumbing inspection requested, room closed to bookings.' },
  { ts:'2026-08-17T10:05', time:'10:05 AM', officer:'Front Desk Officer', type:'checkin',     title:'Checked in guest Andres Reyes',               detail:'Room RM02QB · Queen Bed · 2 guests · 1 night.' },
  { ts:'2026-08-17T10:07', time:'10:07 AM', officer:'Front Desk Officer', type:'payment',     title:'Payment received — Cash on Hand',             detail:'₱13,440.00 tendered, ₱0.00 change issued.' },
  { ts:'2026-08-17T11:30', time:'11:30 AM', officer:'Front Desk Officer', type:'checkout',    title:'Checked out guest Liza Fernandez',            detail:'Room RM01QB · Queen Bed · Folio settled in full.' },
  { ts:'2026-08-17T13:12', time:'1:12 PM', officer:'Front Desk Officer', type:'checkin',      title:'Checked in guest Group — Cruz Party',         detail:'Room RM01TB · Twin Beds · 4 guests · 3 nights.' },
  { ts:'2026-08-17T13:15', time:'1:15 PM', officer:'Front Desk Officer', type:'payment',      title:'Payment received — BPI / BDO QR',             detail:'₱33,600.00 for Room RM01TB, confirmed by front desk.' },

  { ts:'2026-08-16T08:02', time:'8:02 AM', officer:'Front Desk Officer', type:'system',       title:'Logged in to Front Desk Portal',              detail:'Session started at Front Desk Terminal 1.' },
  { ts:'2026-08-16T09:20', time:'9:20 AM', officer:'Front Desk Officer', type:'checkin',      title:'Checked in guest Family Tan',                 detail:'Room RM02DB · Double Bed · 5 guests · 2 nights.' },
  { ts:'2026-08-16T09:24', time:'9:24 AM', officer:'Front Desk Officer', type:'payment',      title:'Payment received — Cash on Hand',             detail:'₱20,160.00 tendered, ₱0.00 change issued.' },
  { ts:'2026-08-16T11:45', time:'11:45 AM', officer:'Housekeeping',      type:'maintenance',  title:'Room RM04SB flagged for maintenance',         detail:'Air-conditioning unit servicing, room closed to bookings.' },
  { ts:'2026-08-16T14:10', time:'2:10 PM', officer:'Front Desk Officer', type:'checkout',     title:'Checked out guest Group — Alvarez Party',     detail:'Room RM02TB · Twin Beds · Folio settled in full.' },
  { ts:'2026-08-16T16:40', time:'4:40 PM', officer:'Front Desk Officer', type:'checkin',      title:'Checked in guest Ramon Villanueva',           detail:'Room RM03SB · Single Bed · 1 guest · 1 night.' },
  { ts:'2026-08-16T16:42', time:'4:42 PM', officer:'Front Desk Officer', type:'payment',      title:'Payment received — BPI / BDO QR',             detail:'₱6,720.00 for Room RM03SB, confirmed by front desk.' },

  { ts:'2026-08-15T07:55', time:'7:55 AM', officer:'Front Desk Officer', type:'system',       title:'Logged in to Front Desk Portal',              detail:'Session started at Front Desk Terminal 1.' },
  { ts:'2026-08-15T10:18', time:'10:18 AM', officer:'Front Desk Officer', type:'checkin',     title:'Checked in guest Patricia Cruz',              detail:'Room RM02KB · King Bed · 2 guests · 4 nights.' },
  { ts:'2026-08-15T10:20', time:'10:20 AM', officer:'Front Desk Officer', type:'payment',     title:'Payment received — Cash on Hand',             detail:'₱67,200.00 tendered, ₱0.00 change issued.' },
  { ts:'2026-08-15T15:30', time:'3:30 PM', officer:'Housekeeping',       type:'maintenance',  title:'Room RM03DB maintenance closed out',          detail:'Plumbing repair completed, room cleared for bookings.' },
  { ts:'2026-08-15T18:05', time:'6:05 PM', officer:'Front Desk Officer', type:'checkout',     title:'Checked out guest Group — Domingo Party',     detail:'Room RM03DB · Double Bed · Folio settled in full.' },
];

/* ---------- STYLE CONFIG ---------- */
const LOG_TYPES = {
  checkin:     { label:'Check-In',    dot:'#3F7A5D', bg:'#E6F0EA', text:'#3F7A5D' },
  checkout:    { label:'Check-Out',   dot:'#2F6F73', bg:'#E4EEEF', text:'#2F6F73' },
  payment:     { label:'Payment',     dot:'#B8925A', bg:'#F7EFDF', text:'#8A6B41' },
  maintenance: { label:'Maintenance', dot:'#A8763B', bg:'#F3EADA', text:'#A8763B' },
  system:      { label:'System',      dot:'#6B7178', bg:'#EDEDEC', text:'#6B7178' },
};

/* ---------- STATE ---------- */
let logFilter = 'ALL';
let logSearch = '';
let logRendered = false;

/* ---------- HELPERS ---------- */
const logEl = id => document.getElementById(id);
function dateLabel(dateStr){
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}
function groupByDate(entries){
  const groups = {};
  entries.forEach(e=>{
    const d = e.ts.split('T')[0];
    (groups[d] = groups[d] || []).push(e);
  });
  return Object.keys(groups).sort((a,b)=> b.localeCompare(a)).map(d=>({ date:d, items: groups[d] }));
}

/* ---------- BUILD SHELL (once) ---------- */
function buildActivityLogShell(){
  const wrap = logEl('view-activitylog');
  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div id="log-filters" class="flex items-center gap-2 flex-wrap"></div>
      <div class="flex items-center gap-2">
        <input type="text" id="log-search" placeholder="Search officer, guest, room, action…"
               class="!w-64 !py-2 !text-sm" style="border:1px solid var(--line); border-radius:.5rem; padding:.5rem .75rem;" />
      </div>
    </div>
    <p id="log-count" class="text-xs text-gray-400 mb-5"></p>
    <div id="log-timeline"></div>
  `;

  const filters = [
    { code:'ALL', label:'All Activity' },
    { code:'checkin', label:'Check-In' },
    { code:'checkout', label:'Check-Out' },
    { code:'payment', label:'Payment' },
    { code:'maintenance', label:'Maintenance' },
    { code:'system', label:'System' },
  ];
  logEl('log-filters').innerHTML = filters.map(f => `
    <button class="chip ${logFilter===f.code?'active':''} px-3.5 py-1.5 rounded-full text-xs font-medium" data-logfilter="${f.code}">${f.label}</button>
  `).join('');
  document.querySelectorAll('[data-logfilter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      logFilter = btn.dataset.logfilter;
      document.querySelectorAll('[data-logfilter]').forEach(b=> b.classList.toggle('active', b.dataset.logfilter===logFilter));
      renderActivityLog();
    });
  });

  logEl('log-search').addEventListener('input', (e)=>{
    logSearch = e.target.value.trim().toLowerCase();
    renderActivityLog();
  });
}

/* ---------- RENDER ---------- */
function renderActivityLog(){
  let entries = [...LOG_ENTRIES].sort((a,b)=> b.ts.localeCompare(a.ts));

  if(logFilter !== 'ALL'){
    entries = entries.filter(e=> e.type === logFilter);
  }
  if(logSearch){
    entries = entries.filter(e=>
      (e.officer + ' ' + e.title + ' ' + e.detail).toLowerCase().includes(logSearch)
    );
  }

  logEl('log-count').textContent = `${entries.length} entr${entries.length===1?'y':'ies'} logged`;

  const grouped = groupByDate(entries);
  logEl('log-timeline').innerHTML = grouped.map(group => `
    <div class="mb-8">
      <p class="text-[11px] tracking-wider2 uppercase font-semibold mb-4" style="color:var(--gold-dim);">${dateLabel(group.date)}</p>
      <div class="relative pl-6">
        <div class="absolute left-[7px] top-1 bottom-1 w-px" style="background:var(--line);"></div>
        ${group.items.map(e=>{
          const meta = LOG_TYPES[e.type];
          return `
          <div class="relative pb-6">
            <div class="absolute -left-[1px] top-1.5 w-3.5 h-3.5 rounded-full border-2" style="background:${meta.dot}; border-color:#fff; box-shadow:0 0 0 2px ${meta.dot}33;"></div>
            <div class="ml-6 bg-white rounded-xl border p-4" style="border-color:var(--line);">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold">${e.title}</p>
                  <p class="text-xs text-gray-500 mt-0.5">${e.detail}</p>
                </div>
                <span class="shrink-0 text-[10px] font-semibold uppercase tracking-wider2 px-2 py-1 rounded-full" style="background:${meta.bg}; color:${meta.text};">${meta.label}</span>
              </div>
              <div class="flex items-center gap-2 mt-3 pt-3 border-t" style="border-color:var(--line);">
                <span class="font-mono text-xs text-gray-400">${e.time}</span>
                <span class="text-gray-300">·</span>
                <span class="text-xs text-gray-500">${e.officer}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('') || `<p class="text-sm text-gray-400 py-16 text-center">No activity matches this filter.</p>`;
}

/* ---------- MODULE NAV WIRING ---------- */
function openActivityLog(){
  ['view-rooms','view-booking','view-payment','view-success','view-activitylog','view-report3'].forEach(id=>{
    logEl(id).classList.toggle('hidden', id!=='view-activitylog');
  });
  logEl('page-eyebrow').textContent = 'Module 2 — Log Book';
  logEl('page-title').textContent = 'Activity Log';
  logEl('nav-module2').classList.add('active');
  logEl('nav-module1').classList.remove('active');
  logEl('nav-module3').classList.remove('active');
  window.scrollTo({ top:0, behavior:'smooth' });

  if(!logRendered){
    buildActivityLogShell();
    renderActivityLog();
    logRendered = true;
  }
}

logEl('nav-module2').addEventListener('click', (e)=>{
  e.preventDefault();
  openActivityLog();
});
