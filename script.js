document.addEventListener('DOMContentLoaded', () => {
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontSizeControl = document.getElementById('fontSize');
    const fontColorControl = document.getElementById('fontColor');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('imageCanvas');
    const placeholder = document.getElementById('canvasPlaceholder');
    const ctx = canvas.getContext('2d');

    let uploadedImage = new Image();
    let originalText = ""; // 儲存輸入的文字

    // 繪製所有的元素到 Canvas 上
    function drawCanvas() {
        if (!uploadedImage.src) return;

        // 1. 設定 Canvas 尺寸與圖片一致
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        
        // 2. 繪製圖片
        ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空 Canvas
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // 3. 繪製文字
        const text = textInput.value || "在此輸入文字";
        const fontSize = parseInt(fontSizeControl.value, 10);
        const fontColor = fontColorControl.value;
        
        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 設置文字位置 (預設置中)
        const x = canvas.width / 2;
        const y = canvas.height * 0.8; // 放在圖片下方的 80% 高度處

        // 處理多行文字
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.2; // 行高
        let currentY = y - (lines.length - 1) * lineHeight / 2; // 計算起始 Y 座標，使其整體居中

        lines.forEach(line => {
            // 繪製帶有黑色陰影的文字，使其在各種背景上都清晰
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillText(line, x, currentY);
            
            // 清除陰影，確保後續繪圖不受影響 (雖然這裡沒有後續繪圖)
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            currentY += lineHeight;
        });

        downloadBtn.disabled = false; // 允許下載
    }

    // --- 事件監聽器 ---

    // 圖片載入事件
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.onload = () => {
                placeholder.style.display = 'none'; // 隱藏佔位符
                canvas.style.display = 'block';    // 顯示 Canvas
                drawCanvas();
            };
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 編輯器設定變更事件 (文字輸入、大小、顏色)
    [textInput, fontSizeControl, fontColorControl].forEach(control => {
        control.addEventListener('input', drawCanvas);
    });

    // 下載按鈕事件
    downloadBtn.addEventListener('click', () => {
        if (!uploadedImage.src) {
            alert("請先上傳圖片！");
            return;
        }

        // 獲取 Canvas 數據並建立下載連結
        const dataURL = canvas.toDataURL('image/png'); 
        const link = document.createElement('a');
        link.download = `早安圖-${Date.now()}.png`; // 設置下載檔案名稱
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});