const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('memeText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.getElementById('previewArea');
const normalFile = document.getElementById('normalFile');
const sadFile = document.getElementById('sadFile');
const normalStatus = document.getElementById('normalStatus');
const sadStatus = document.getElementById('sadStatus');
const normalUploadBtn = document.getElementById('normalUploadBtn');
const sadUploadBtn = document.getElementById('sadUploadBtn');

const DB_NAME = 'horiemonMemeDB';
const DB_VERSION = 1;
const STORE_NAME = 'templates';

// Image data stored in memory
const imageData = { normal: null, sad: null };

// --- IndexedDB helpers ---
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME);
        };
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

// --- Load cached images on startup ---
async function loadCachedImages() {
    try {
        for (const key of ['normal', 'sad']) {
            const dataURL = await loadImage(key);
            if (dataURL) {
                imageData[key] = dataURL;
                const statusEl = key === 'normal' ? normalStatus : sadStatus;
                const btnEl = key === 'normal' ? normalUploadBtn : sadUploadBtn;
                statusEl.textContent = '設定済み';
                btnEl.classList.add('loaded');
                btnEl.querySelector('input').nextSibling
                    ? (btnEl.childNodes.forEach(n => {
                        if (n.nodeType === 3) n.textContent = '変更';
                    }))
                    : null;
                // Update button text
                Array.from(btnEl.childNodes).forEach(n => {
                    if (n.nodeType === Node.TEXT_NODE) n.textContent = '変更';
                });
            }
        }
    } catch (e) {
        // IndexedDB not available, continue without cache
    }
}

// --- File upload handlers ---
function handleFileUpload(file, key) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataURL = e.target.result;
            imageData[key] = dataURL;

            const statusEl = key === 'normal' ? normalStatus : sadStatus;
            const btnEl = key === 'normal' ? normalUploadBtn : sadUploadBtn;
            statusEl.textContent = '設定済み';
            btnEl.classList.add('loaded');
            Array.from(btnEl.childNodes).forEach(n => {
                if (n.nodeType === Node.TEXT_NODE) n.textContent = '変更';
            });

            try {
                await saveImage(key, dataURL);
            } catch (e) {
                // Cache save failed, still works for this session
            }
            resolve();
        };
        reader.readAsDataURL(file);
    });
}

normalFile.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0], 'normal');
});

sadFile.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0], 'sad');
});

// --- Character count ---
textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
});

// --- Get selected version ---
function getSelectedVersion() {
    return document.querySelector('input[name="version"]:checked').value;
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
        const label = version === 'normal' ? '通常（ドヤ顔）' : '悲しい顔';
        alert(`「${label}」のテンプレート画像を先にアップロードしてください`);
        return;
    }

    const img = new Image();
    img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw the template image
        ctx.drawImage(img, 0, 0);

        // Black out the original text area (bottom portion)
        const textAreaTop = Math.floor(canvas.height * 0.72);
        const textAreaHeight = canvas.height - textAreaTop;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, textAreaTop, canvas.width, textAreaHeight);

        // Draw new text
        drawMemeText(text, textAreaTop, textAreaHeight);

        // Show preview
        previewArea.style.display = 'block';
        previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    img.src = data;
}

function drawMemeText(text, areaTop, areaHeight) {
    const maxWidth = canvas.width * 0.9;
    const centerX = canvas.width / 2;
    const centerY = areaTop + areaHeight * 0.55;

    // Auto-size font to fit
    let fontSize = Math.floor(canvas.height * 0.09);
    ctx.font = `bold ${fontSize}px 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif`;

    // Shrink font if text is too wide
    while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif`;
    }

    // Text stroke (black outline)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = fontSize * 0.12;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, centerX, centerY);

    // Text fill (yellow)
    ctx.fillStyle = '#FFD700';
    ctx.fillText(text, centerX, centerY);
}

// --- Event listeners ---
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

// --- Init ---
loadCachedImages();
