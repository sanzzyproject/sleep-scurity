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
        statusBadge.innerText = "Kamera Aktif";
        
    } catch (err) {
        alert("Akses kamera ditolak. Izinkan kamera di pengaturan browser Anda.");
    }
});

// --- 3. Auto Photo Capture (Touch Activated) ---
// Memulai pemotretan saat layar disentuh (hanya jika kamera sudah aktif)
document.addEventListener("touchstart", (e) => {
    // Jangan trigger jika yang disentuh adalah tombol stop atau dock
    if (e.target.closest('.btn') || e.target.closest('.bottom-dock')) return;

    if (isCameraEnabled && !isCapturing) {
        startCaptureSequence();
    }
}, { passive: true });

function startCaptureSequence() {
    isCapturing = true;
    statusBadge.innerText = "Mode Security Active";
    statusBadge.className = "badge active";
    instructionText.innerText = "Merekam setiap 5 detik...";
    stopBtn.classList.remove('hidden');
    
    takePhoto(); 
    captureInterval = setInterval(takePhoto, 5000);
}

// Fitur Baru: Tombol Hentikan Pemotretan
stopBtn.addEventListener('click', () => {
    if (isCapturing) {
        clearInterval(captureInterval);
        isCapturing = false;
        statusBadge.innerText = "Kamera Aktif";
        statusBadge.className = "badge standby";
        instructionText.innerText = "Sentuh layar di mana saja untuk memulai kembali.";
        stopBtn.classList.add('hidden');
    }
});

function takePhoto() {
    if (!stream) return;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.6); // Kompresi 0.6 agar tidak berat
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
        // Jika sedang di tab galeri, update realtime
        if(document.getElementById('tab-gallery').classList.contains('active')) {
            loadGallery(); 
        }
    };
}

// --- 5. Photo Gallery & Download (Grid 2 Kolom) ---
function loadGallery() {
    if (!db) return;
    const transaction = db.transaction(['photos'], 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.getAll();

    request.onsuccess = () => {
        const photos = request.result;
        galleryGrid.innerHTML = '';

        if(photos.length === 0) {
            galleryGrid.innerHTML = '<p style="grid-column: span 2; color: var(--text-muted); padding: 20px;">Belum ada foto yang direkam.</p>';
            return;
        }

        photos.reverse().forEach(photo => {
            const dateObj = new Date(photo.timestamp);
            const timeStr = `${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
            
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.innerHTML = `
                <img src="${photo.imageData}" alt="Evidence">
                <div class="photo-info">${timeStr}</div>
                <a href="${photo.imageData}" download="SANN404_${photo.timestamp}.jpg" class="download-btn">⬇ Unduh</a>
            `;
            galleryGrid.appendChild(card);
        });
    };
}

// Catatan: Fungsi `visibilitychange` yang mematikan kamera saat keluar web sudah dihapus sesuai permintaan.
// Namun, perhatikan bahwa Chrome/Safari di HP secara bawaan sistem akan tetap "menjeda" akses hardware kamera 
// jika browser diminimize atau layar dikunci.
