const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('memeText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const previewArea = document.getElementById('previewArea');
const setupPanel = document.getElementById('setupPanel');
const mainPanel = document.getElementById('mainPanel');
const normalFile = document.getElementById('normalFile');
const sadFile = document.getElementById('sadFile');
const normalStatus = document.getElementById('normalStatus');
const sadStatus = document.getElementById('sadStatus');
const normalUploadBtn = document.getElementById('normalUploadBtn');
const sadUploadBtn = document.getElementById('sadUploadBtn');

const DB_NAME = 'horiemonMemeDB';
const DB_VERSION = 1;
const STORE_NAME = 'templates';

const imageData = { normal: null, sad: null };

// --- IndexedDB ---
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveImage(key, dataURL) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataURL, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadImage(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

// --- UI state ---
function showSetup() {
    setupPanel.style.display = 'block';
    mainPanel.style.display = 'none';
    updateSetupStatus();
}

function showMain() {
    setupPanel.style.display = 'none';
    mainPanel.style.display = 'block';
}

function updateSetupStatus() {
    normalStatus.textContent = imageData.normal ? '登録済み ✓' : '未登録';
    normalStatus.className = 'upload-status' + (imageData.normal ? ' done' : '');
    sadStatus.textContent = imageData.sad ? '登録済み ✓' : '未登録';
    sadStatus.className = 'upload-status' + (imageData.sad ? ' done' : '');

    if (imageData.normal) normalUploadBtn.classList.add('loaded');
    if (imageData.sad) sadUploadBtn.classList.add('loaded');

    // Auto-transition to main when both are set
    if (imageData.normal && imageData.sad) {
        setTimeout(() => showMain(), 500);
    }
}

// --- Load cached images ---
async function init() {
    try {
        for (const key of ['normal', 'sad']) {
            const data = await loadImage(key);
            if (data) imageData[key] = data;
        }
    } catch (e) {
        // IndexedDB not available
    }

    if (imageData.normal && imageData.sad) {
        showMain();
    } else {
        showSetup();
    }
}

// --- File upload ---
function handleFileUpload(file, key) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        imageData[key] = e.target.result;
        try { await saveImage(key, e.target.result); } catch (err) {}
        updateSetupStatus();
    };
    reader.readAsDataURL(file);
}

normalFile.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0], 'normal');
});
sadFile.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0], 'sad');
});

// --- Reset (show setup again) ---
resetBtn.addEventListener('click', () => showSetup());

// --- Character count ---
textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
});

// --- Get selected version ---
function getSelectedVersion() {
    return document.querySelector('input[name="version"]:checked').value;
}

// --- Sample background color from edges of a row ---
function sampleBgColor(imgData, y, w) {
    // Sample pixels from left and right edges (avoid text in center)
    const samples = [];
    const sampleCols = [0, 1, 2, 3, 4, w - 5, w - 4, w - 3, w - 2, w - 1];
    for (const x of sampleCols) {
        const i = (y * w + x) * 4;
        samples.push([imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]]);
    }
    // Median of samples for each channel
    const r = samples.map(s => s[0]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    const g = samples.map(s => s[1]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    const b = samples.map(s => s[2]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    return [r, g, b];
}

// --- Erase subtitle by painting over with sampled background ---
function eraseSubtitle(textTop, textBottom) {
    const w = canvas.width;
    const imgData = ctx.getImageData(0, 0, w, canvas.height);

    // Gradient fade zone above the text area for smooth blending
    const fadeHeight = Math.floor((textBottom - textTop) * 0.15);
    const eraseTop = textTop - fadeHeight;

    for (let y = eraseTop; y < textBottom; y++) {
        const [r, g, b] = sampleBgColor(imgData, y, w);
        // Fade-in factor: 0 at eraseTop, 1 at textTop
        let alpha;
        if (y < textTop) {
            alpha = (y - eraseTop) / fadeHeight;
        } else {
            alpha = 1.0;
        }
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(0, y, w, 1);
    }
}

// --- Generate meme ---
function generateMeme() {
    const text = textInput.value.trim();
    if (!text) {
        alert('テキストを入力してください');
        return;
    }

    const version = getSelectedVersion();
    const data = imageData[version];
    if (!data) {
        alert('テンプレート画像が登録されていません');
        showSetup();
        return;
    }

    const img = new Image();
    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        // Erase original subtitle area (approx 73%–97% of image height)
        const textTop = Math.floor(canvas.height * 0.73);
        const textBottom = Math.floor(canvas.height * 0.97);
        eraseSubtitle(textTop, textBottom);

        // Draw new text in the same position as original
        drawMemeText(text, textTop, textBottom);

        previewArea.style.display = 'block';
        previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    img.src = data;
}

function drawMemeText(text, textTop, textBottom) {
    const maxWidth = canvas.width * 0.92;
    const centerX = canvas.width / 2;
    const centerY = textTop + (textBottom - textTop) * 0.5;

    // Start with a large font size, matching the original subtitle style
    let fontSize = Math.floor(canvas.height * 0.10);
    const fontFamily = "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif";
    ctx.font = `900 ${fontSize}px ${fontFamily}`;

    // Shrink if text is too wide
    while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `900 ${fontSize}px ${fontFamily}`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow layer (offset shadow like TV subtitles)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = fontSize * 0.15;
    ctx.shadowOffsetX = fontSize * 0.05;
    ctx.shadowOffsetY = fontSize * 0.05;

    // Black outline
    ctx.lineWidth = fontSize * 0.08;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(text, centerX, centerY);

    // Yellow fill (matching original: warm golden yellow)
    ctx.fillStyle = '#FFD700';
    ctx.fillText(text, centerX, centerY);
    ctx.restore();

    // Second pass without shadow for crisper text
    ctx.lineWidth = fontSize * 0.06;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, centerX, centerY);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(text, centerX, centerY);
}

// --- Events ---
generateBtn.addEventListener('click', generateMeme);
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateMeme();
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'horiemon-meme.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// --- Start ---
init();
