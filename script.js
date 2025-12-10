document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素獲取 (保持不變)
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontFamilyControl = document.getElementById('fontFamily');
    const fontSizeControl = document.getElementById('fontSize');
    const fontWeightControl = document.getElementById('fontWeight');
    const fontColorControl = document.getElementById('fontColor');
    const textOrientationControl = document.getElementById('textOrientation');
    const downloadFormatControl = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('imageCanvas');
    const placeholder = document.getElementById('canvasPlaceholder');
    const ctx = canvas.getContext('2d');

    let uploadedImage = new Image();
    
    // 文字位置狀態：始終使用百分比 (0-100)
    let textX = 50; 
    let textY = 50; 
    
    // 拖曳狀態變數
    let isDragging = false;
    let dragStartX_percent; // 儲存拖曳起始點的百分比 X 座標
    let dragStartY_percent; // 儲存拖曳起始點的百分比 Y 座標

    // 繪製所有的元素到 Canvas 上 (此函數保持與上次一致，它負責將百分比座標轉換為實際像素)
    function drawCanvas() {
        if (!uploadedImage.src) return;

        // 1. 設定 Canvas 尺寸與圖片一致 (確保匯出時是原始解析度)
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        
        // 2. 繪製圖片
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // 3. 繪製文字
        const text = textInput.value || "在此輸入文字";
        
        const fontFamily = fontFamilyControl.value;
        const fontSize = parseInt(fontSizeControl.value, 10);
        const fontWeight = fontWeightControl.value;
        const fontColor = fontColorControl.value;
        const orientation = textOrientationControl.value;
        
        // 核心計算：將百分比座標轉換為實際像素座標
        const x = canvas.width * (textX / 100);
        const y = canvas.height * (textY / 100);

        ctx.fillStyle = fontColor;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 設置陰影
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.save(); 

        if (orientation === 'vertical') {
            // == 垂直排版邏輯 (保持不變) ==
            ctx.translate(x, y);
            
            const charSpacing = fontSize * 1.5;
            let lineX = 0; 
            
            const lines = text.split('\n'); // 需在 local scope 重新定義
            lines.forEach((line, lineIndex) => {
                lineX = lineIndex * (fontSize + 10); 
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    ctx.fillText(char, lineX, i * charSpacing);
                }
            });
            
        } else {
            // == 橫式排版邏輯 (保持不變) ==
            const lines = text.split('\n');
            const lineHeight = fontSize * 1.2;
            let currentY = y - (lines.length - 1) * lineHeight / 2;

            lines.forEach(line => {
                ctx.fillText(line, x, currentY);
                currentY += lineHeight;
            });
        }
        
        ctx.restore(); 

        // 清除陰影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        downloadBtn.disabled = false;
    }

    // --- 拖曳互動邏輯 (修復核心) ---
    
    // 獲取滑鼠在 Canvas 上的繪圖像素座標
    function getCanvasMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width; 
        const actualWidth = canvas.width; 
        const scaleFactor = actualWidth / displayWidth; 

        return {
            x: (event.clientX - rect.left) * scaleFactor,
            y: (event.clientY - rect.top) * scaleFactor
        };
    }

    // 將像素座標轉換為百分比座標
    function getPercentCoords(pixelX, pixelY) {
        return {
            x: (pixelX / canvas.width) * 100,
            y: (pixelY / canvas.height) * 100
        };
    }

    // 滑鼠按下：開始拖曳
    canvas.addEventListener('mousedown', (e) => {
        if (!uploadedImage.src) return;
        
        // [簡化判定] 只要點擊 Canvas，就進入拖曳狀態
        isDragging = true;
        
        // 獲取滑鼠的像素座標
        const pos = getCanvasMousePos(e);

        // [關鍵修復] 儲存的是當前滑鼠點擊點的 *百分比* 座標。
        // 我們將用這個百分比座標，減去文字的百分比座標，計算出「偏移量」。
        const percentPos = getPercentCoords(pos.x, pos.y);

        // 儲存滑鼠點擊點與文字錨點的百分比座標差 (偏移量)
        dragStartX_percent = percentPos.x - textX;
        dragStartY_percent = percentPos.y - textY;
        
        e.preventDefault(); 
    });

    // 滑鼠移動：計算新位置並重新繪製
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // 獲取當前滑鼠位置的百分比座標
        const pos = getCanvasMousePos(e);
        const percentPos = getPercentCoords(pos.x, pos.y);
        
        // [關鍵修復] 新的文字位置 = 當前滑鼠位置 - 偏移量
        let newTextX = percentPos.x - dragStartX_percent;
        let newTextY = percentPos.y - dragStartY_percent;

        // 更新文字的百分比座標，並確保在 0% 到 100% 之間
        textX = Math.min(100, Math.max(0, newTextX));
        textY = Math.min(100, Math.max(0, newTextY));
        
        drawCanvas();
    });

    // 滑鼠鬆開/離開 (保持不變)
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        // 繪製最後一次，確保釋放後狀態穩定
        drawCanvas(); 
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // --- 其他事件監聽器 (保持不變) ---

    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.onload = () => {
                placeholder.style.display = 'none';
                canvas.style.display = 'block';
                // 重設文字位置到預設中央
                textX = 50; 
                textY = 50;
                drawCanvas();
            };
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', drawCanvas);
    });

    downloadBtn.addEventListener('click', () => {
        if (!uploadedImage.src) {
            alert("請先上傳圖片！");
            return;
        }
        
        const format = downloadFormatControl.value; 
        let dataURL;

        if (format === 'image/jpeg') {
            dataURL = canvas.toDataURL('image/jpeg', 0.9); 
        } else {
            dataURL = canvas.toDataURL('image/png'); 
        }

        const link = document.createElement('a');
        const fileExtension = format.split('/')[1];
        
        link.download = `圖像創意文字-${Date.now()}.${fileExtension}`; 
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
