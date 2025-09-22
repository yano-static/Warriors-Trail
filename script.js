// Initialize map
const map = L.map('map').setView([14.6070, 121.0040], 17); 
// Example: UE Manila approximate location

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Example marker
L.marker([14.6070, 121.0040])
  .addTo(map)
  .bindPopup("UE Manila - Lost & Found Center")
  .openPopup();
