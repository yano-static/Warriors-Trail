// --- Page: map.html ---
if (document.getElementById('map') && location.pathname.endsWith('map.html')) {
  // shared constants
  const UE_CENTER = [14.6070, 121.0040];
  const UE_BOUNDS = [
    [14.6050, 121.0020],
    [14.6090, 121.0060]
  ];

  // icon dictionary
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

  // map setup
  const map = L.map('map', { minZoom: 16, maxZoom: 20 }).setView(UE_CENTER, 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  map.setMaxBounds(UE_BOUNDS);
  map.on('drag', () => map.panInsideBounds(UE_BOUNDS, { animate: true }));

  // helper for safe HTML
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'''}[c]));
  }

  // show Firebase items on map
  function addReportMarker(report) {
    const icon = ICONS[report.type] || ICONS.other;
    const marker = L.marker([report.lat, report.lng], { icon }).addTo(map);
    const time = report.timestamp
      ? new Date(report.timestamp).toLocaleString()
      : '';
    const popupHtml = `
      <strong>${escapeHtml(report.itemName)}</strong> <em>(${report.type})</em><br/>
      ${report.description ? `<div>${escapeHtml(report.description)}</div>` : ''}
      ${report.contact ? `<div><small>Contact: ${escapeHtml(report.contact)}</small></div>` : ''}
      <div style="margin-top:6px"><small>${time}</small></div>
    `;
    marker.bindPopup(popupHtml);
  }

  db.ref("items").on("value", (snapshot) => {
    // Remove markers only
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    // Display reports from Firebase
    snapshot.forEach(child => addReportMarker(child.val()));
  });
}
