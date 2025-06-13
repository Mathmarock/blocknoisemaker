const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let originalImage;
let originalImageData;
let prevImageData;
let offscreenCanvas, offscreenCtx;
let imageFileName = 'image';
let transparentColor = null;
let untreansparantPixels;

const gifframes = [];

document.getElementById('imageLoader').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    imageFileName = file.name.replace(/\.[^/.]+$/, "");

    const reader = new FileReader();
    reader.onload = function (event) {
        untreansparantPixels = 0;
        originalImage = new Image();
        originalImage.onload = function () {
            offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = originalImage.width;
            offscreenCanvas.height = originalImage.height;
            offscreenCtx = offscreenCanvas.getContext('2d');
            offscreenCtx.drawImage(originalImage, 0, 0);
            originalImageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            prevImageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const data = originalImageData.data;
            for (let i = 0; i < offscreenCanvas.width * offscreenCanvas.height; i++) {
              if (data[i * 4 + 3] > 0) untreansparantPixels++;
            }
            updateDisplay();
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function updateDisplay() {
    const scaleX = canvas.width / offscreenCanvas.width;
    const scaleY = canvas.height / offscreenCanvas.height;
    const scale = Math.min(scaleX, scaleY);
    const displayWidth = offscreenCanvas.width * scale;
    const displayHeight = offscreenCanvas.height * scale;
    const offsetX = (canvas.width - displayWidth) / 2;
    const offsetY = (canvas.height - displayHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        offscreenCanvas,
        0, 0, offscreenCanvas.width, offscreenCanvas.height,
        offsetX, offsetY, displayWidth, displayHeight
    );
}

document.getElementById('execBtn').addEventListener('click', () => {
    makenoise(false);
});

document.getElementById('autoBtn').addEventListener('click', () => {
    if (!offscreenCanvas) return;
        
    setNumbers();
});

function setNumbers(){
    const w = offscreenCanvas.width;
    const h = offscreenCanvas.height;

    document.getElementById('n').value = Math.max(1, Math.floor(Math.pow(w, 0.7)));
    document.getElementById('regionW_min').value = Math.max(1, Math.floor(w * 0.1));
    document.getElementById('regionW_max').value = Math.max(1, Math.floor(w * 0.15));
    document.getElementById('regionH_min').value = Math.max(1, Math.floor(h * 0.008));
    document.getElementById('regionH_max').value = Math.max(1, Math.floor(h * 0.011));
    document.getElementById('offsetX_min').value = Math.max(1, Math.floor(w * 0.06));
    document.getElementById('offsetX_max').value = Math.max(1, Math.floor(w * 0.14));
    document.getElementById('offsetY_min').value = 0;
    document.getElementById('offsetY_max').value = Math.max(0, Math.floor(h * 0.008));
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!offscreenCanvas) return;
    const link = document.createElement('a');
    link.download = imageFileName + '_noise.png';
    link.href = offscreenCanvas.toDataURL('image/png');
    link.click();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (originalImageData && offscreenCtx) {
        offscreenCtx.putImageData(originalImageData, 0, 0);
        updateDisplay();
    }
});

document.getElementById('undoBtn').addEventListener('click', () => {
    if (prevImageData && offscreenCtx) {
        offscreenCtx.putImageData(prevImageData, 0, 0);
        updateDisplay();
    }
});

document.getElementById('fadeExecBtn').addEventListener('click', () => {
    if (!offscreenCanvas || offscreenCanvas.width > 800 || offscreenCanvas.height > 800) {
        alert("画像サイズが800×800pxを超えています。800×800px以内の画像を使用してください。");
        return;
    }
    const steps = Math.min(parseInt(document.getElementById('fadeSteps').value) - 1, 30);
    let duration = parseInt(document.getElementById('frameDuration').value);
    if (isNaN(duration) || duration < 50) duration = 50;

    if (!originalImageData) {
        alert("まず画像を読み込んでください！");
        return;
    }
    gifframes.length = 0;

    offscreenCtx.putImageData(originalImageData, 0, 0);
    gifframes.push(offscreenCanvas);

    setNumbers();

    let step = 0;
    function processStep() {
        if (step >= steps) {
            offscreenCtx.putImageData(originalImageData, 0, 0);
            updateDisplay();
            previewGif();
            return;
        }

        offscreenCtx.putImageData(originalImageData, 0, 0);
        document.getElementById('n').value = Math.ceil(1500 * (step / steps) * (step / steps) + 20);

        makenoise(true);

        if (step * 3 / 2 > steps) {
            make10PercentPixelsTransparent(step, steps);
        }

        let currentImageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = offscreenCanvas.width;
        frameCanvas.height = offscreenCanvas.height;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.putImageData(currentImageData, 0, 0);
        gifframes.push(frameCanvas);

        step++;
        setTimeout(processStep, 0);
    }
    processStep();
});

document.getElementById('downloadTileBtn').onclick = () => {
    if (gifframes.length === 0) return;
    steps = gifframes.length;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = offscreenCanvas.width * steps;
    tileCanvas.height = offscreenCanvas.height;
    const tileCtx = tileCanvas.getContext('2d');
    for (let i = 0; i < gifframes.length; i++) {
        tileCtx.drawImage(gifframes[i], i * offscreenCanvas.width, 0);
    }
    const link = document.createElement('a');
    link.download = imageFileName + '_noise.png';
    link.href = tileCanvas.toDataURL('image/png');
    link.click();
};

function makenoise(forTransparent = false){
    if (!offscreenCtx) return;
    const width = offscreenCanvas.width;
    const height = offscreenCanvas.height;

    prevImageData = offscreenCtx.getImageData(0, 0, width, height);

    let n = parseInt(document.getElementById('n').value);
    if (n > 9999){
        n = 9999;
    }
    const regionW_min = parseInt(document.getElementById('regionW_min').value);
    const regionW_max = parseInt(document.getElementById('regionW_max').value);
    const regionH_min = parseInt(document.getElementById('regionH_min').value);
    const regionH_max = parseInt(document.getElementById('regionH_max').value);
    const offsetX_min = parseInt(document.getElementById('offsetX_min').value);
    const offsetX_max = parseInt(document.getElementById('offsetX_max').value);
    const offsetY_min = parseInt(document.getElementById('offsetY_min').value);
    const offsetY_max = parseInt(document.getElementById('offsetY_max').value);

    const imgData = offscreenCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const pixels = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const alpha = data[i + 3];
        if (!forTransparent) {
            pixels.push({ x, y });
        }else if(forTransparent && (alpha > 0)){
            pixels.push({ x, y });
        }
        }
    }

    for (let i = 0; i < n; i++) {
        const p = pixels[Math.floor(Math.random() * pixels.length)];

        const regionW = randInRange(regionW_min, regionW_max);
        const regionH = randInRange(regionH_min, regionH_max);
        let offsetX = randInRange(offsetX_min, offsetX_max);
        let offsetY = randInRange(offsetY_min, offsetY_max);
        if (Math.random() < 0.5) offsetX *= -1;
        if (Math.random() < 0.5) offsetY *= -1;

        const srcX = Math.max(0, p.x - Math.floor(regionW / 2));
        const srcY = Math.max(0, p.y - Math.floor(regionH / 2));
        const w = Math.min(regionW, width - srcX);
        const h = Math.min(regionH, height - srcY);

        const dstX = Math.min(width - w, Math.max(0, srcX + offsetX));
        const dstY = Math.min(height - h, Math.max(0, srcY + offsetY));

        const region = new Uint8ClampedArray(w * h * 4);
        for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
                const si = ((srcY + yy) * width + (srcX + xx)) * 4;
                const ri = (yy * w + xx) * 4;
                region[ri] = data[si];
                region[ri + 1] = data[si + 1];
                region[ri + 2] = data[si + 2];
                region[ri + 3] = data[si + 3];
            }
        }

        for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
                const di = ((dstY + yy) * width + (dstX + xx)) * 4;
                const ri = (yy * w + xx) * 4;
                data[di] = region[ri];
                data[di + 1] = region[ri + 1];
                data[di + 2] = region[ri + 2];
                data[di + 3] = region[ri + 3];
            }
        }

        if (forTransparent) {
            for (let yy = 0; yy < h; yy++) {
                for (let xx = 0; xx < w; xx++) {
                const si = ((srcY + yy) * width + (srcX + xx)) * 4;
                data[si + 3] = 0;
                }
            }
        }
    }

    offscreenCtx.putImageData(imgData, 0, 0);

    updateDisplay();
}

function randInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function make10PercentPixelsTransparent(step, steps) {

    const width = offscreenCanvas.width;
    const height = offscreenCanvas.height;

    imageData = offscreenCtx.getImageData(0, 0, width, height);

    const data = imageData.data;
    const indices = [];
    for (let i = 0; i < width * height; i++) {
        if (data[i * 4 + 3] > 0) indices.push(i);
    }
    let count = Math.ceil( indices.length / (steps - step));
    for (let i = 0; i < count; i++) {
        const index = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
        data[index * 4 + 3] = 0;
    }

    offscreenCtx.putImageData(imageData, 0, 0);
}

let gifBlobUrl = null;

function previewGif() {
    if (gifframes.length === 0) return;
    const duration = parseInt(document.getElementById('frameDuration').value);

    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: gifframes[0].width,
        height: gifframes[0].height,
        workerScript: 'gif.worker.js',
        transparent: 'rgba(0,0,0,0)'
    });

    for (let i = 0; i < gifframes.length; i++) {
        gif.addFrame(gifframes[i], {delay: duration, copy: true});
    }

    gif.on('finished', function(blob) {
        if (gifBlobUrl) {
        URL.revokeObjectURL(gifBlobUrl);
    }
        gifBlobUrl = URL.createObjectURL(blob);
        document.getElementById('gifPreview').src = gifBlobUrl;
    });

    gif.render();
}

document.getElementById('downloadGifBtn').addEventListener('click', () => {
    if (!gifBlobUrl) {
        alert('まず「実行」を押してGIFを生成してください');
        return;
    }
    const link = document.createElement('a');
    link.href = gifBlobUrl;
    link.download = imageFileName + '_noise.gif';
    link.click();
});

function showTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.tab-buttons button').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
}
