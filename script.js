const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('memeText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewArea = document.getElementById('previewArea');

// Preload images
const images = {
    normal: new Image(),
    sad: new Image()
};
images.normal.src = 'images/normal.png';
images.sad.src = 'images/sad.png';

// Character count
textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
});

// Get selected version
function getSelectedVersion() {
    return document.querySelector('input[name="version"]:checked').value;
}

// Draw meme on canvas
function generateMeme() {
    const text = textInput.value.trim();
    if (!text) {
        alert('テキストを入力してください');
        return;
    }

    const version = getSelectedVersion();
    const img = images[version];

    if (!img.complete || img.naturalWidth === 0) {
        alert('画像の読み込みに失敗しました。images/ フォルダにnormal.pngとsad.pngを配置してください。');
        return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw the template image
    ctx.drawImage(img, 0, 0);

    // Black out the original text area (bottom portion of image)
    const textAreaTop = Math.floor(canvas.height * 0.72);
    const textAreaHeight = canvas.height - textAreaTop;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, textAreaTop, canvas.width, textAreaHeight);

    // Draw new text
    drawMemeText(text, textAreaTop, textAreaHeight);

    // Show preview
    previewArea.style.display = 'block';
    previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Generate button click
generateBtn.addEventListener('click', generateMeme);

// Also generate on Enter key
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        generateMeme();
    }
});

// Download
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'horiemon-meme.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});
