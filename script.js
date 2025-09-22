// Create map centered on UE Manila
const map = L.map('map', {
  minZoom: 16,
  maxZoom: 20,
}).setView([14.6070, 121.0040], 17);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Restrict map bounds to UE campus
const ueBounds = [
  [14.6050, 121.0020], // Southwest corner
  [14.6090, 121.0060]  // Northeast corner
];
map.setMaxBounds(ueBounds);
map.on('drag', function () {
  map.panInsideBounds(ueBounds, { animate: true });
});

// Example marker
L.marker([14.6070, 121.0040])
  .addTo(map)
  .bindPopup("<b>UE Manila</b><br>Lost & Found Center");
