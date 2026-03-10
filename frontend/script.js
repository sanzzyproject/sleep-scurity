// DOM Elements
const permissionCard = document.getElementById('permission-card');
const cameraSection = document.getElementById('camera-section');
const enableBtn = document.getElementById('enable-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusText = document.getElementById('status-text');
const galleryGrid = document.getElementById('gallery-grid');

// State Variables
let db;
let stream = null;
let isCameraEnabled = false;
let isCapturing = false;
let captureInterval = null;

// --- 1. IndexedDB Initialization ---

const initDB = () => {
    const request = indexedDB.open('hp_security_camera', 1);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadGallery(); // Load existing photos on startup
    };

    request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
    };
};

initDB();

// --- 2. Camera System ---
enableBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, // Front camera
            audio: false 
        });
        
        video.srcObject = stream;
        isCameraEnabled = true;
        
        // Update UI
        permissionCard.classList.add('hidden');
        cameraSection.classList.remove('hidden');
        statusText.innerText = "System Armed - Waiting for touch";
        
    } catch (err) {
        alert("Camera permission denied or camera not found.");
        console.error(err);
    }
});

// --- 3. Auto Photo Capture (Touch Activated) ---
document.addEventListener("touchstart", () => {
    if (isCameraEnabled && !isCapturing) {
        startCaptureSequence();
    }
}, { passive: true }); // passive flag for better scrolling performance

function startCaptureSequence() {
    isCapturing = true;
    statusText.innerText = "Security Triggered - Capturing...";
    statusText.classList.add('active');
    
    // Capture immediately, then every 5 seconds
    takePhoto(); 
    captureInterval = setInterval(takePhoto, 5000);
}

function takePhoto() {
    if (!stream) return;

    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image blob/base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    savePhotoLocally(imageData);
}

// --- 4. Local Storage (IndexedDB saving) ---
function savePhotoLocally(imageData) {
    if (!db) return;

    const transaction = db.transaction(['photos'], 'readwrite');
    const store = transaction.objectStore('photos');
    
    const photoRecord = {
        timestamp: new Date().toISOString(),
        imageData: imageData
    };

    const request = store.add(photoRecord);
    
    request.onsuccess = () => {
        loadGallery(); // Update gallery view immediately
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

        // Display newest first
        photos.reverse().forEach(photo => {
            const dateStr = new Date(photo.timestamp).toLocaleString();
            
            const card = document.createElement('div');
            card.className = 'photo-card';
            
            card.innerHTML = `
                <img src="${photo.imageData}" alt="Security Capture">
                <div class="photo-info">${dateStr}</div>
                <a href="${photo.imageData}" download="Security_Capture_${photo.timestamp}.jpg" class="download-btn">Download Image</a>
            `;
            
            galleryGrid.appendChild(card);
        });
    };
}

// --- 6. Auto Stop Camera (Page Visibility) ---
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') {
        stopCaptureSequence();
    }
});

function stopCaptureSequence() {
    if (isCapturing) {
        clearInterval(captureInterval);
        isCapturing = false;
        statusText.innerText = "System Armed - Waiting for touch";
        statusText.classList.remove('active');
    }
}
