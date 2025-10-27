// ---- Shared constants and emoji icons ----
const UE_CENTER = [14.6070, 121.0040];
const UE_BOUNDS = [
    [14.6050, 121.0020],
    [14.6090, 121.0060]
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
    let markers = []; // { marker, data }

    // 3. Place markers, render list, enable searching/filtering
    function addReportMarker(report) {
        const icon = ICONS[report.type] || ICONS.other;
        const marker = L.marker([report.lat, report.lng], { icon }).addTo(map);
        const time = report.timestamp ? new Date(report.timestamp).toLocaleString() : '';
        
        const ttsText = `Lost or found item: ${report.itemName}. Type: ${report.type}. ${report.description ? 'Description: ' + report.description + '.' : ''} ${report.contact ? 'Contact: ' + report.contact + '.' : ''} Reported on ${time}.`;
        
        marker.bindPopup(`
            <strong>${escapeHtml(report.itemName)}</strong> (${report.type})<br>
            ${report.description ? `<p>${escapeHtml(report.description)}</p>` : ''}
            ${report.contact ? `<p>Contact: ${escapeHtml(report.contact)}</p>` : ''}
            <small>${time}</small><br>
            <button class="tts-button" onclick="speakText('${escapeHtml(ttsText).replace(/'/g, "\\'")}')">🔊 Read Aloud</button>
        `);
        markers.push({ marker, data: report });
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
            activeReports.push(report);
            addReportMarker(report);
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
            li.innerHTML = `${ICONS[r.type].options.html} 
                <strong>${escapeHtml(r.itemName)}</strong> (${r.type})<br>
                ${escapeHtml(r.description || '')}<br>
                <small>${new Date(r.timestamp).toLocaleString()}</small>`;
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
                (r.contact && r.contact.toLowerCase().includes(q))
            );
            return matchesType && matchesQuery;
        });

        // Hide/show markers
        markers.forEach(({ marker, data }) => {
            if (filtered.includes(data)) marker.addTo(map);
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
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        // Validation
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

        console.log('Submitting to Firebase:', newReport);

        // Submit to Firebase
        firebase.database().ref("items").push(newReport)
            .then(() => {
                console.log('Report submitted successfully');
                alert('Report submitted! You can view it on the Map page.');
                form.reset();
                setPicker(UE_CENTER[0], UE_CENTER[1]);
                window.location.href = 'map.html';
            })
            .catch(error => {
                console.error('Firebase write error:', error);
                alert('Error submitting your report: ' + error.message);
            });
    });
}
