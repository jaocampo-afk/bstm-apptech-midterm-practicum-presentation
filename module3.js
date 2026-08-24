/* ============================================================
   MODULE 3 — HOTEL REPORT
   Self-contained. Drop this file in alongside index.html and add:
   <script src="module3.js"></script>  after server.js, before </body>.

   Requires in index.html:
   - <section id="view-report3" class="hidden"></section>
   - <a id="nav-module3"> in the sidenav
   - <p id="page-eyebrow"> and <h1 id="page-title"> in the header

   Left division (top): mock booking trend line chart — NOT wired
   to Module 1, purely illustrative mock data.
   Right division (top): 2x2 live room-status cards, read from
   Module 1's ROOMS array (server.js) at render time.
   Bottom division: hotel sales report, computed dynamically from
   Module 1's live occupied rooms + BED_TYPES rates.
   ============================================================ */

/* ---------- MOCK BOOKING TREND DATA ----------
   Anchored to "today" so it stays evergreen. Offsets are days
   before today. Counts per the brief:
   - 7 days ago ("last week")  → 2 bookings
   - 4 days ago                → 1 booking
   - 3 days ago                → 4 bookings
   - 1 day ago ("yesterday")   → 4 bookings
   - everything else in the 7-day window → 0 (mock, for chart shape)
*/
const REPORT3_MOCK_COUNTS = { 7:2, 6:0, 5:0, 4:1, 3:4, 2:0, 1:4, 0:0 };

function report3_buildMockSeries(){
  const today = new Date();
  const points = [];
  for(let offset=7; offset>=0; offset--){
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    points.push({
      date: d,
      label: d.toLocaleDateString('en-PH', { month:'short', day:'numeric' }),
      count: REPORT3_MOCK_COUNTS[offset] ?? 0,
    });
  }
  return points;
}

/* ---------- LINE CHART (SVG) ---------- */
function report3_renderLineChart(points){
  const w = 560, h = 260;
  const padL = 34, padR = 18, padT = 20, padB = 34;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const maxCount = Math.max(4, ...points.map(p=>p.count));
  const stepX = chartW / (points.length - 1);

  const coords = points.map((p,i)=>{
    const x = padL + i*stepX;
    const y = padT + chartH - (p.count / maxCount) * chartH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c,i)=> `${i===0?'M':'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length-1].x.toFixed(1)} ${padT+chartH} L ${coords[0].x.toFixed(1)} ${padT+chartH} Z`;

  const gridLines = [0,1,2,3,4].map(i=>{
    const y = padT + chartH - (i/4)*chartH;
    const val = Math.round((maxCount/4)*i);
    return `
      <line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--line)" stroke-width="1" />
      <text x="${padL-8}" y="${y+3}" text-anchor="end" font-size="10" fill="#9A9488" font-family="IBM Plex Mono, monospace">${val}</text>
    `;
  }).join('');

  const xLabels = coords.map((c,i)=> `
    <text x="${c.x}" y="${h-10}" text-anchor="middle" font-size="9.5" fill="#9A9488" font-family="Inter, sans-serif">${c.label}</text>
  `).join('');

  const dots = coords.map(c=> `
    <circle cx="${c.x}" cy="${c.y}" r="4" fill="#B8925A" stroke="#fff" stroke-width="2" />
    <text x="${c.x}" y="${c.y-10}" text-anchor="middle" font-size="10" font-weight="600" fill="#8A6B41" font-family="IBM Plex Mono, monospace">${c.count}</text>
  `).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="report3grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#B8925A" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#B8925A" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#report3grad)" />
      <path d="${linePath}" fill="none" stroke="#B8925A" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${xLabels}
    </svg>
  `;
}

/* ---------- SALES REPORT CALC (live from Module 1) ---------- */
function report3_computeSales(){
  const occupied = (typeof ROOMS !== 'undefined') ? ROOMS.filter(r=> r.status==='occupied') : [];
  const grossRevenue = occupied.reduce((sum,r)=> sum + (r.rate||0), 0);

  const tax = grossRevenue * 0.12;
  const maintenanceCut = grossRevenue * 0.10;
  const netProfit = grossRevenue - tax - maintenanceCut;

  const loanPrincipal = 1000000;
  const loanPayment = netProfit * 0.02;
  const remainingLoan = Math.max(0, loanPrincipal - loanPayment);

  return { occupiedCount: occupied.length, grossRevenue, tax, maintenanceCut, netProfit, loanPrincipal, loanPayment, remainingLoan };
}

/* ---------- BUILD SHELL (once) ---------- */
let report3Built = false;

function report3_peso(n){
  return '₱' + Number(n||0).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function buildReport3Shell(){
  const wrap = document.getElementById('view-report3');
  wrap.innerHTML = `
    <div class="grid grid-cols-3 gap-6 mb-8">
      <div class="col-span-2 bg-white rounded-xl border p-5" style="border-color:var(--line);">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-display text-lg">Booking Trend — Last 7 Days</h3>
          <span class="text-[10px] font-semibold uppercase tracking-wider2 px-2 py-1 rounded-full" style="background:var(--amber-bg); color:var(--amber);">Sample Data</span>
        </div>
        <p class="text-xs text-gray-400 mb-3">Illustrative bookings-per-day trend, for reporting layout purposes only.</p>
        <div id="report3-chart"></div>
      </div>

      <div class="col-span-1 grid grid-cols-2 grid-rows-2 gap-4">
        <div class="rounded-xl p-4 flex flex-col justify-between" style="background:var(--success-bg); border:1px solid var(--success-line);">
          <p class="text-[10px] tracking-wider2 uppercase font-semibold" style="color:var(--success);">Available</p>
          <p id="report3-stat-available" class="font-display text-3xl" style="color:var(--success);">0</p>
        </div>
        <div class="rounded-xl p-4 flex flex-col justify-between" style="background:var(--danger-bg); border:1px solid var(--danger-line);">
          <p class="text-[10px] tracking-wider2 uppercase font-semibold" style="color:var(--danger);">Occupied</p>
          <p id="report3-stat-occupied" class="font-display text-3xl" style="color:var(--danger);">0</p>
        </div>
        <div class="rounded-xl p-4 flex flex-col justify-between" style="background:var(--amber-bg); border:1px solid var(--amber-line);">
          <p class="text-[10px] tracking-wider2 uppercase font-semibold" style="color:var(--amber);">Maintenance</p>
          <p id="report3-stat-maintenance" class="font-display text-3xl" style="color:var(--amber);">0</p>
        </div>
        <div class="rounded-xl p-4 flex flex-col justify-between" style="background:#EDEDEC; border:1px solid var(--line);">
          <p class="text-[10px] tracking-wider2 uppercase font-semibold" style="color:#6B7178;">Rooms — Coming Soon</p>
          <p class="font-display text-3xl" style="color:#6B7178;">+</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border p-6" style="border-color:var(--line);">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-3">
          <button id="report3-export-btn" class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style="background:var(--success-bg); color:var(--success); border:1px solid var(--success-line);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9.5 12.5 12 17l2.5-4.5M12 17v-4.5"/></svg>
            Export to Excel
          </button>
          <h3 class="font-display text-lg">Hotel Sales Report</h3>
        </div>
        <span class="text-[10px] font-semibold uppercase tracking-wider2 px-2 py-1 rounded-full" style="background:var(--success-bg); color:var(--success);">Live — Module 1 Rates</span>
      </div>
      <p class="text-xs text-gray-400 mb-5">Computed from currently occupied rooms and their nightly rates.</p>

      <div class="grid grid-cols-3 gap-8">
        <div class="col-span-1 space-y-2.5 text-sm font-mono">
          <p class="text-[11px] tracking-wider2 uppercase mb-2" style="color:var(--gold-dim);">Revenue</p>
          <div class="flex justify-between"><span class="text-gray-500">Occupied Rooms</span><span id="report3-occ-count">0</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Gross Revenue</span><span id="report3-gross">₱0.00</span></div>
        </div>

        <div class="col-span-1 space-y-2.5 text-sm font-mono">
          <p class="text-[11px] tracking-wider2 uppercase mb-2" style="color:var(--gold-dim);">Deductions</p>
          <div class="flex justify-between"><span class="text-gray-500">Tax (12%)</span><span id="report3-tax" class="text-red-600">− ₱0.00</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Maintenance Cut (3%)</span><span id="report3-maint" class="text-red-600">− ₱0.00</span></div>
          <div class="flex justify-between pt-2 border-t font-semibold" style="border-color:var(--line);"><span>Net Profit</span><span id="report3-net"></span></div>
        </div>

        <div class="col-span-1 space-y-2.5 text-sm font-mono">
          <p class="text-[11px] tracking-wider2 uppercase mb-2" style="color:var(--gold-dim);">Loan</p>
          <div class="flex justify-between"><span class="text-gray-500">Loan Principal</span><span id="report3-loan-principal">₱1,000,000.00</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Payment (2% of Profit)</span><span id="report3-loan-payment" class="text-red-600">− ₱0.00</span></div>
          <div class="flex justify-between pt-2 border-t font-semibold" style="border-color:var(--line);"><span>Remaining Balance</span><span id="report3-loan-remaining"></span></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('report3-chart').innerHTML = report3_renderLineChart(report3_buildMockSeries());
  document.getElementById('report3-export-btn').addEventListener('click', report3_exportExcel);
}

/* ---------- EXCEL EXPORT ---------- */
function report3_exportExcel(){
  if(typeof XLSX === 'undefined'){
    alert('Excel export library failed to load. Please check your internet connection and try again.');
    return;
  }

  const s = report3_computeSales();
  const rooms = (typeof ROOMS !== 'undefined') ? ROOMS : [];
  const now = new Date();
  const generated = now.toLocaleString('en-PH', { dateStyle:'long', timeStyle:'short' });

  const summaryRows = [
    ['Okada Manila — Hotel Sales Report'],
    ['Generated', generated],
    [],
    ['Room Status Summary'],
    ['Available', rooms.filter(r=>r.status==='available').length],
    ['Occupied', rooms.filter(r=>r.status==='occupied').length],
    ['Maintenance', rooms.filter(r=>r.status==='maintenance').length],
    [],
    ['Revenue'],
    ['Occupied Rooms', s.occupiedCount],
    ['Gross Revenue', s.grossRevenue],
    [],
    ['Deductions'],
    ['Tax (12%)', -s.tax],
    ['Maintenance Cut (3%)', -s.maintenanceCut],
    ['Net Profit', s.netProfit],
    [],
    ['Loan'],
    ['Loan Principal', s.loanPrincipal],
    ['Loan Payment (2% of Net Profit)', -s.loanPayment],
    ['Remaining Balance', s.remainingLoan],
  ];

  const occupiedDetailHeader = ['Room Code', 'Bed Type', 'Segment', 'Rate / Night (₱)', 'Booked At'];
  const occupiedDetailRows = rooms.filter(r=>r.status==='occupied').map(r=> [
    r.code, r.bedLabel, r.segment, r.rate, r.bookedAt ? new Date(r.bookedAt).toLocaleString('en-PH') : ''
  ]);

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Sales Report');

  const wsDetail = XLSX.utils.aoa_to_sheet([occupiedDetailHeader, ...occupiedDetailRows]);
  wsDetail['!cols'] = [{ wch:14 }, { wch:14 }, { wch:18 }, { wch:16 }, { wch:22 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Occupied Rooms');

  const filename = `Okada_Hotel_Sales_Report_${now.toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ---------- RENDER (live data, called every time the view opens) ---------- */
function renderReport3(){
  const rooms = (typeof ROOMS !== 'undefined') ? ROOMS : [];
  document.getElementById('report3-stat-available').textContent = rooms.filter(r=>r.status==='available').length;
  document.getElementById('report3-stat-occupied').textContent = rooms.filter(r=>r.status==='occupied').length;
  document.getElementById('report3-stat-maintenance').textContent = rooms.filter(r=>r.status==='maintenance').length;

  const s = report3_computeSales();
  document.getElementById('report3-occ-count').textContent = s.occupiedCount;
  document.getElementById('report3-gross').textContent = report3_peso(s.grossRevenue);
  document.getElementById('report3-tax').textContent = '− ' + report3_peso(s.tax);
  document.getElementById('report3-maint').textContent = '− ' + report3_peso(s.maintenanceCut);
  document.getElementById('report3-net').textContent = report3_peso(s.netProfit);
  document.getElementById('report3-loan-payment').textContent = '− ' + report3_peso(s.loanPayment);
  document.getElementById('report3-loan-remaining').textContent = report3_peso(s.remainingLoan);
}

/* ---------- MODULE NAV WIRING ---------- */
function openReport3(){
  ['view-rooms','view-booking','view-payment','view-success','view-activitylog','view-report3'].forEach(id=>{
    document.getElementById(id).classList.toggle('hidden', id!=='view-report3');
  });
  document.getElementById('page-eyebrow').textContent = 'Module 3 — Hotel Report';
  document.getElementById('page-title').textContent = 'Hotel Report';
  document.getElementById('nav-module3').classList.add('active');
  document.getElementById('nav-module1').classList.remove('active');
  document.getElementById('nav-module2').classList.remove('active');
  window.scrollTo({ top:0, behavior:'smooth' });

  if(!report3Built){
    buildReport3Shell();
    report3Built = true;
  }
  renderReport3();
}

document.getElementById('nav-module3').addEventListener('click', (e)=>{
  e.preventDefault();
  openReport3();
});
