// shared constants: UE Manila approximate bounds and center
const UE_CENTER = [14.6070, 121.0040];
const UE_BOUNDS = [
  [14.6050, 121.0020],
  [14.6090, 121.0060]
];

const STORAGE_KEY = 'warrior_reports_v1';

// tiny helper: load saved reports (array)
function loadReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load reports', e);
    return [];
  }
}

function saveReports(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
}

// icons dictionary (simple emoji markers)
function createIcon(emoji) {
  return L.divIcon({
    className: 'custom-emoji-icon',
    html: `<div style="font-size:20px">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

const ICONS = {
  phone: createIcon('📱'),
  wallet: createIcon('💼'),
  keys: createIcon('🔑'),
  other: createIcon('📦')
};

// --- Page: map.html ---
if (document.getElementById('map') && location.pathname.endsWith('map.html')) {
  // init map
  const map = L.map('map', { minZoom: 16, maxZoom: 20 }).setView(UE_CENTER, 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  map.setMaxBounds(UE_BOUNDS);
  map.on('drag', () => map.panInsideBounds(UE_BOUNDS, { animate: true }));

  // load markers
  let reports = loadReports();
  const markers = []; // store marker objects for filter

  function addReportMarker(report) {
    const icon = ICONS[report.type] || ICONS.other;
    const m = L.marker([report.lat, report.lng], { icon }).addTo(map);
    const time = new Date(report.timestamp).toLocaleString();
    const popupHtml = `
      <strong>${report.itemName}</strong> <em>(${report.type})</em><br/>
      ${report.description ? `<div>${report.description}</div>` : ''}
      ${report.contact ? `<div><small>Contact: ${report.contact}</small></div>` : ''}
      <div style="margin-top:6px"><small>${time}</small></div>
    `;
    m.bindPopup(popupHtml);
    markers.push({ marker: m, data: report });
  }

  // add all
  reports.forEach(addReportMarker);

  // populate recent list
  function renderList(filtered) {
    const list = document.getElementById('reportsList');
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li>No reports found.</li>';
      return;
    }
    // sort descending time
    filtered.sort((a,b) => b.timestamp - a.timestamp);
    filtered.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(r.itemName)}</strong> <small>(${r.type})</small>
        <div>${escapeHtml(r.description || '')}</div>
        <div style="margin-top:6px"><small>${new Date(r.timestamp).toLocaleString()}</small></div>
      `;
      li.addEventListener('click', () => {
        map.panTo([r.lat, r.lng]);
      });
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  renderList(reports);

  // search + filter logic
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const clearBtn = document.getElementById('clearBtn');

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const type = filterType.value;
    // filter reports
    const filtered = reports.filter(r => {
      const matchesType = (type === 'all') || (r.type === type);
      const matchesQuery = q === '' || (
        (r.itemName && r.itemName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.contact && r.contact.toLowerCase().includes(q))
      );
      return matchesType && matchesQuery;
    });
    // hide/show markers
    markers.forEach(({marker, data}) => {
      const keep = filtered.includes(data);
      if (keep) {
        marker.addTo(map);
      } else {
        map.removeLayer(marker);
      }
    });
    renderList(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  filterType.addEventListener('change', applyFilters);
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterType.value = 'all';
    applyFilters();
  });

  // fit map bounds if markers exist
  if (markers.length) {
    const group = L.featureGroup(markers.map(m=>m.marker));
    map.fitBounds(group.getBounds().pad(0.3));
  }
}

// --- Page: report.html ---
if (document.getElementById('reportForm') && location.pathname.endsWith('report.html')) {
  const form = document.getElementById('reportForm');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');

  // mini map setup (click to pick coords)
  const miniMap = L.map('miniMap', { minZoom: 16, maxZoom: 20 }).setView(UE_CENTER, 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
  miniMap.setMaxBounds(UE_BOUNDS);
  miniMap.on('drag', () => miniMap.panInsideBounds(UE_BOUNDS, { animate: true }));

  let pickMarker = null;
  function setPicker(lat,lng) {
    latInput.value = lat;
    lngInput.value = lng;
    if (pickMarker) pickMarker.setLatLng([lat,lng]);
    else pickMarker = L.marker([lat,lng], {icon: ICONS.other}).addTo(miniMap);
    miniMap.panTo([lat,lng]);
  }

  // click event to pick location
  miniMap.on('click', function(e){
    setPicker(e.latlng.lat, e.latlng.lng);
  });

  // quick default: center location
  setPicker(UE_CENTER[0], UE_CENTER[1]);

  form.addEventListener('submit', function(evt){
    evt.preventDefault();
    const type = document.getElementById('itemType').value;
    const itemName = document.getElementById('itemName').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const description = document.getElementById('description').value.trim();
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);

    if (!itemName || !lat || !lng) {
      alert('Please provide item name and pick a location on the map.');
      return;
    }

    const reports = loadReports();
    const newReport = {
      id: Date.now(),
      type, itemName, contact, description,
      lat, lng,
      timestamp: Date.now()
    };
    reports.push(newReport);
    saveReports(reports);
    alert('Report saved locally. You can view it on the Map page.');
    // redirect to map
    window.location.href = 'map.html';
  });
}

// Helper: escapeHtml used in map context above (ensures safe display in popups)
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
