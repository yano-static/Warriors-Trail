// --- Page: report.html ---
if (document.getElementById('reportForm') && location.pathname.endsWith('report.html')) {
  const UE_CENTER = [14.6070, 121.0040];
  const UE_BOUNDS = [
    [14.6050, 121.0020],
    [14.6090, 121.0060]
  ];

  const ICONS = {
    phone: L.divIcon({ className: 'custom-emoji-icon', html: '📱', iconSize: [28, 28], iconAnchor: [14, 28] }),
    wallet: L.divIcon({ className: 'custom-emoji-icon', html: '💼', iconSize: [28, 28], iconAnchor: [14, 28] }),
    keys: L.divIcon({ className: 'custom-emoji-icon', html: '🔑', iconSize: [28, 28], iconAnchor: [14, 28] }),
    other: L.divIcon({ className: 'custom-emoji-icon', html: '📦', iconSize: [28, 28], iconAnchor: [14, 28] })
  };

  const form = document.getElementById('reportForm');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');

  // mini map for picking location
  const miniMap = L.map('miniMap', { minZoom: 16, maxZoom: 20 }).setView(UE_CENTER, 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
  miniMap.setMaxBounds(UE_BOUNDS);
  miniMap.on('drag', () => miniMap.panInsideBounds(UE_BOUNDS, { animate: true }));

  let pickMarker = null;
  function setPicker(lat, lng) {
    latInput.value = lat;
    lngInput.value = lng;
    if (pickMarker) pickMarker.setLatLng([lat, lng]);
    else pickMarker = L.marker([lat, lng], { icon: ICONS.other }).addTo(miniMap);
    miniMap.panTo([lat, lng]);
  }

  // Map click: pick location
  miniMap.on('click', function(e) {
    setPicker(e.latlng.lat, e.latlng.lng);
  });
  setPicker(UE_CENTER[0], UE_CENTER[1]);

  // Submit to Firebase
  form.addEventListener('submit', function(evt) {
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

    const newReport = {
      type,
      itemName,
      contact,
      description,
      lat,
      lng,
      timestamp: Date.now()
    };

    db.ref("items").push(newReport, function(error) {
      if (error) {
        alert('Failed to save report. Please try again.');
      } else {
        alert('Report submitted! You can view it on the Map page.');
        window.location.href = 'map.html';
      }
    });
  });
}
