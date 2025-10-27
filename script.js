// ---- Shared constants and emoji icons ----
// CORRECTED coordinates for UE Manila: 2219 C.M. Recto Avenue, Sampaloc, Manila
const UE_CENTER = [14.6042, 120.9933];
const UE_BOUNDS = [
    [14.6020, 120.9910],
    [14.6065, 120.9955]
];

function createIcon(emoji) {
    return L.divIcon({
        className: 'custom-emoji-icon',
        html: `${emoji}`,
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

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// ---- Text-to-Speech Function ----
let currentUtterance = null;

function speakText(text) {
    if (!('speechSynthesis' in window)) {
        alert('Text-to-Speech is not supported in your browser.');
        return;
    }

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    currentUtterance.lang = 'en-US';

    currentUtterance.onstart = () => {
        console.log('TTS started');
    };

    currentUtterance.onend = () => {
        console.log('TTS ended');
    };

    currentUtterance.onerror = (event) => {
        console.error('TTS error:', event.error);
    };

    window.speechSynthesis.speak(currentUtterance);
}

// ---- Mark Item as Claimed ----
function markAsClaimed(itemId) {
    if (confirm('Mark this item as claimed? This action cannot be undone.')) {
        firebase.database().ref(`items/${itemId}`).update({
            claimed: true,
            claimedDate: Date.now()
        })
        .then(() => {
            alert('✅ Item marked as claimed!');
            location.reload();
        })
        .catch(error => {
            console.error('Error marking as claimed:', error);
            alert('Error updating item status: ' + error.message);
        });
    }
}

// ---- MAP PAGE ----
if (document.getElementById('map') && location.pathname.endsWith('map.html')) {
    console.log('Initializing map page...');
    
    // 1. Set up map
    const map = L.map('map', { minZoom: 16, maxZoom: 20 }).setView(UE_CENTER, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    map.setMaxBounds(UE_BOUNDS);
    map.on('drag', () => map.panInsideBounds(UE_BOUNDS, { animate: true }));

    // 2. Marker/bookkeeping arrays
    let activeReports = []; // List of visible items
    let markers = []; // { marker, data, id }

    // 3. Place markers, render list, enable searching/filtering
    function addReportMarker(report, itemId) {
        const icon = ICONS[report.type] || ICONS.other;
        const marker = L.marker([report.lat, report.lng], { icon }).addTo(map);
        
        const reportedDate = report.dateReported ? new Date(report.dateReported).toLocaleDateString() : 'N/A';
        const timestamp = report.timestamp ? new Date(report.timestamp).toLocaleString() : '';
        
        // Build TTS text
        const ttsText = `${report.claimed ? 'Claimed item' : 'Lost or found item'}: ${report.itemName}. Type: ${report.type}. ${report.description ? 'Description: ' + report.description + '.' : ''} ${report.pickupLocation ? 'Pickup location: ' + report.pickupLocation + '.' : ''} ${report.contact ? 'Contact: ' + report.contact + '.' : ''} Date reported: ${reportedDate}. Submitted on ${timestamp}.`;
        
        // Build popup HTML
        let popupHTML = `
            <div style="min-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #B50014;">
                    ${report.claimed ? '✅ ' : ''}${escapeHtml(report.itemName)}
                </h3>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${report.type}</p>
                ${report.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${escapeHtml(report.description)}</p>` : ''}
                ${report.pickupLocation ? `<p style="margin: 5px 0;"><strong>📍 Pickup/Drop-off Location:</strong> ${escapeHtml(report.pickupLocation)}</p>` : ''}
                ${report.contact ? `<p style="margin: 5px 0;"><strong>📞 Contact:</strong> ${escapeHtml(report.contact)}</p>` : ''}
                <p style="margin: 5px 0;"><strong>📅 Date Found/Lost:</strong> ${reportedDate}</p>
                <p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Submitted:</strong> ${timestamp}</p>
                ${report.claimed ? `<p style="margin: 10px 0; padding: 8px; background: #d4edda; border-radius: 4px; color: #155724;"><strong>✅ Item Claimed</strong><br><small>Claimed on ${new Date(report.claimedDate).toLocaleString()}</small></p>` : `<button onclick="markAsClaimed('${itemId}')" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; font-weight: 600;">✅ Mark as Claimed</button>`}
                <button class="tts-button" onclick="speakText('${escapeHtml(ttsText).replace(/'/g, "\\'")}')">🔊 Read Aloud</button>
            </div>
        `;
        
        marker.bindPopup(popupHTML, { maxWidth: 300 });
        markers.push({ marker, data: report, id: itemId });
    }

    // Listen for Firebase data
    console.log('Setting up Firebase listener...');
    firebase.database().ref("items").on("value", snapshot => {
        console.log('Firebase data received:', snapshot.val());
        // Clear all markers
        markers.forEach(obj => map.removeLayer(obj.marker));
        markers = [];
        activeReports = [];

        snapshot.forEach(child => {
            const report = child.val();
            const itemId = child.key;
            activeReports.push({ ...report, id: itemId });
            addReportMarker(report, itemId);
        });
        renderList(activeReports);
    }, error => {
        console.error('Firebase read error:', error);
    });

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
            li.classList.add('report-card');
            if (r.claimed) {
                li.style.opacity = '0.6';
                li.style.borderLeft = '4px solid #28a745';
            }
            const reportedDate = r.dateReported ? new Date(r.dateReported).toLocaleDateString() : 'N/A';
            li.innerHTML = `${ICONS[r.type].options.html} 
                <strong>${r.claimed ? '✅ ' : ''}${escapeHtml(r.itemName)}</strong> (${r.type})<br>
                ${escapeHtml(r.description || '')}<br>
                <small>📅 ${reportedDate} | Submitted: ${new Date(r.timestamp).toLocaleString()}</small>`;
            li.addEventListener('click', () => map.panTo([r.lat, r.lng]));
            list.appendChild(li);
        });
    }

    // Filtering/search logic
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
                (r.contact && r.contact.toLowerCase().includes(q)) ||
                (r.pickupLocation && r.pickupLocation.toLowerCase().includes(q))
            );
            return matchesType && matchesQuery;
        });

        // Hide/show markers
        markers.forEach(({ marker, data }) => {
            const matchesFilter = filtered.some(f => f.id === data.id || (f.timestamp === data.timestamp && f.itemName === data.itemName));
            if (matchesFilter) marker.addTo(map);
            else map.removeLayer(marker);
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
}

// ---- REPORT FORM PAGE ----
if (document.getElementById('reportForm') && location.pathname.endsWith('report.html')) {
    console.log('Initializing report form page...');
    
    const form = document.getElementById('reportForm');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    // Mini map picker for report.html
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

    miniMap.on('click', e => setPicker(e.latlng.lat, e.latlng.lng));
    setPicker(UE_CENTER[0], UE_CENTER[1]);

    form.addEventListener('submit', function(evt) {
        evt.preventDefault();
        console.log('Form submitted');

        const type = document.getElementById('itemType').value;
        const itemName = document.getElementById('itemName').value.trim();
        const contact = document.getElementById('contact').value.trim();
        const description = document.getElementById('description').value.trim();
        const pickupLocation = document.getElementById('pickupLocation').value.trim();
        const dateReported = document.getElementById('dateReported').value;
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        // Validation
        if (!itemName || !lat || !lng || !dateReported) {
            alert('Please provide item name, date found/lost, and pick a location on the map.');
            return;
        }

        const newReport = {
            type, 
            itemName, 
            contact, 
            description,
            pickupLocation,
            dateReported,
            lat, 
            lng, 
            timestamp: Date.now(),
            claimed: false
        };

        console.log('Submitting to Firebase:', newReport);

        // Submit to Firebase
        firebase.database().ref("items").push(newReport)
            .then(() => {
                console.log('Report submitted successfully');
                alert('✅ Report submitted! You can view it on the Map page.');
                form.reset();
                setPicker(UE_CENTER[0], UE_CENTER[1]);
                window.location.href = 'map.html';
            })
            .catch(error => {
                console.error('Firebase write error:', error);
                alert('❌ Error submitting your report: ' + error.message);
            });
    });
}
