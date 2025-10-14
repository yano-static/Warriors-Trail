if (document.getElementById('map') && location.pathname.endsWith('map.html')) {
  // ... [Leaflet map and ICON setup stays unchanged] ...

  let activeReports = [];  // Local list for searching/filtering
  let markers = [];        // Track { marker, data } for hide/show

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'''}[c]));
  }

  function addReportMarker(report) {
    const icon = ICONS[report.type] || ICONS.other;
    const marker = L.marker([report.lat, report.lng], { icon }).addTo(map);
    const time = report.timestamp
      ? new Date(report.timestamp).toLocaleString()
      : '';
    marker.bindPopup(`
      <strong>${escapeHtml(report.itemName)}</strong> <em>(${report.type})</em><br/>
      ${report.description ? `<div>${escapeHtml(report.description)}</div>` : ''}
      ${report.contact ? `<div><small>Contact: ${escapeHtml(report.contact)}</small></div>` : ''}
      <div style="margin-top:6px"><small>${time}</small></div>
    `);
    markers.push({ marker, data: report });
  }

  // Listen for Firebase updates
  db.ref("items").on("value", snapshot => {
    markers.forEach(obj => map.removeLayer(obj.marker));
    markers = [];
    activeReports = [];
    snapshot.forEach(child => {
      const report = child.val();
      activeReports.push(report);
      addReportMarker(report);
    });
    renderList(activeReports);
  });

  // List rendering and filtering
  function renderList(filtered) {
    const list = document.getElementById('reportsList');
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li>No reports found.</li>';
      return;
    }
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    filtered.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${escapeHtml(r.itemName)}</strong> <small>(${r.type})</small>
        <div>${escapeHtml(r.description || '')}</div>
        <div style="margin-top:6px"><small>${new Date(r.timestamp).toLocaleString()}</small></div>`;
      li.addEventListener('click', () => {
        map.panTo([r.lat, r.lng]);
      });
      list.appendChild(li);
    });
  }

  // Filtering/search event logic
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const clearBtn = document.getElementById('clearBtn');

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const type = filterType.value;
    const filtered = activeReports.filter(r => {
      const matchesType = (type === 'all') || (r.type === type);
      const matchesQuery = q === '' || (
        (r.itemName && r.itemName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.contact && r.contact.toLowerCase().includes(q))
      );
      return matchesType && matchesQuery;
    });
    // Hide/show markers
    markers.forEach(({ marker, data }) => {
      if (filtered.includes(data)) {
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

  // Optional: fit map bounds to visible markers after filtering
}
