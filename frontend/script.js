// DOM Elements
const permissionCard = document.getElementById('permission-card');
const cameraSection = document.getElementById('camera-section');
const enableBtn = document.getElementById('enable-btn');
const stopBtn = document.getElementById('stop-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusBadge = document.getElementById('status-badge');
const instructionText = document.getElementById('instruction-text');
const galleryGrid = document.getElementById('gallery-grid');

// Dock Navigation Elements
const dockBtns = document.querySelectorAll('.dock-btn');
const tabContents = document.querySelectorAll('.tab-content');

// State Variables
let db;
let stream = null;
let isCameraEnabled = false;
let isCapturing = false;
let captureInterval = null;

// --- 0. Dock Navigation Logic ---
dockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update Buttons
        dockBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update Tabs
        const targetId = btn.getAttribute('data-target');
        tabContents.forEach(tab => {
            tab.classList.remove('active');
            setTimeout(() => {
                if(tab.id !== targetId) tab.classList.add('hidden');
            }, 50); // small delay for animation
        });
        
        const activeTab = document.getElementById(targetId);
        activeTab.classList.remove('hidden');
        setTimeout(() => activeTab.classList.add('active'), 50);

        // Load gallery if gallery tab clicked
        if(targetId === 'tab-gallery') loadGallery();
    });
});

// --- 1. IndexedDB Initialization ---
const initDB = () => {
    const request = indexedDB.open('sann404_security', 1);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = (event) => { db = event.target.result; loadGallery(); };
    request.onerror = (event) => { console.error("IndexedDB error:", event.target.error); };
};
initDB();

// --- 2. Camera System ---
enableBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" },
            audio: false 
        });
        
        video.srcObject = stream;
        isCameraEnabled = true;
        
        permissionCard.classList.add('hidden');
        cameraSection.classList.remove('hidden');
        
        // UI UPDATE: Tetap pertahankan elemen span untuk animasi pulse
        statusBadge.innerHTML = '<span class="pulse-dot"></span> Kamera Aktif';
        statusBadge.className = "badge active";
        
    } catch (err) {
        alert("Akses kamera ditolak. Izinkan kamera di pengaturan browser Anda.");
    }
});

// --- 3. Auto Photo Capture (Touch Activated) ---
document.addEventListener("touchstart", (e) => {
    if (e.target.closest('.btn') || e.target.closest('.modern-dock')) return;

    if (isCameraEnabled && !isCapturing) {
        startCaptureSequence();
    }
}, { passive: true });

function startCaptureSequence() {
    isCapturing = true;
    statusBadge.innerHTML = '<span class="pulse-dot"></span> Security Active';
    statusBadge.className = "badge active";
    instructionText.innerText = "Merekam setiap 5 detik...";
    stopBtn.classList.remove('hidden');
    
    takePhoto(); 
    captureInterval = setInterval(takePhoto, 5000);
}

stopBtn.addEventListener('click', () => {
    if (isCapturing) {
        clearInterval(captureInterval);
        isCapturing = false;
        statusBadge.innerHTML = '<span class="pulse-dot"></span> Kamera Aktif';
        statusBadge.className = "badge standby";
        instructionText.innerText = "Sentuh layar di area mana saja untuk memicu mode pelacakan.";
        stopBtn.classList.add('hidden');
    }
});

function takePhoto() {
    if (!stream) return;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.6);
    savePhotoLocally(imageData);
}

// --- 4. Local Storage (IndexedDB saving) ---
function savePhotoLocally(imageData) {
    if (!db) return;
    const transaction = db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');
    
    store.add({
        timestamp: new Date().getTime(),
        imageData: imageData
    }).onsuccess = () => {
        if(document.getElementById('tab-gallery').classList.contains('active')) {
            loadGallery(); 
        }
    };
}

// --- 5. Photo Gallery & Download ---
function loadGallery() {
    if (!db) return;
    const transaction = db.transaction(['photos'], 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.getAll();

    request.onsuccess = () => {
        const photos = request.result;
        galleryGrid.innerHTML = '';

        if(photos.length === 0) {
            galleryGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 40px 20px; color: var(--text-muted); background: var(--surface); border-radius: var(--radius-md); border: 1px dashed var(--border-color);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 10px; opacity: 0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><br>Belum ada data bukti forensik yang terekam.</div>';
            return;
        }

        photos.reverse().forEach(photo => {
            const dateObj = new Date(photo.timestamp);
            const timeStr = `${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
            
            const card = document.createElement('div');
            card.className = 'photo-card';
            
            // UI UPDATE ONLY: Menghapus emoji, menggunakan struktur class modern & ikon SVG. Logika download tetap murni asli.
            card.innerHTML = `
                <img src="${photo.imageData}" alt="Evidence">
                <div class="photo-meta">
                    <span class="photo-time">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${timeStr}
                    </span>
                </div>
                <a href="${photo.imageData}" download="SANN404_${photo.timestamp}.jpg" class="download-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 
                    Unduh
                </a>
            `;
            galleryGrid.appendChild(card);
        });
    };
}
