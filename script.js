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
    let dragStartX, dragStartY;

    // 繪製所有的元素到 Canvas 上
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
        
        // 獲取控制項的值
        const fontFamily = fontFamilyControl.value;
        const fontSize = parseInt(fontSizeControl.value, 10);
        const fontWeight = fontWeightControl.value;
        const fontColor = fontColorControl.value;
        const orientation = textOrientationControl.value;
        
        // 核心修改：計算實際像素座標 (基於百分比)
        const x = canvas.width * (textX / 100);
        const y = canvas.height * (textY / 100);

        ctx.fillStyle = fontColor;
        // 注意：字體大小仍使用絕對像素值
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

    // --- 拖曳互動邏輯 (核心修改：計算縮放比例) ---
    
    // 獲取滑鼠在 Canvas 上的座標，並將其轉換為繪圖時的像素座標
    function getCanvasMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        
        // Canvas 在螢幕上顯示的寬度
        const displayWidth = rect.width; 
        // Canvas 的實際繪圖寬度 (圖片寬度)
        const actualWidth = canvas.width; 

        // 計算縮放比例：實際繪圖大小 / 顯示大小
        const scaleFactor = actualWidth / displayWidth; 

        return {
            // 點擊位置 - Canvas 左上角距離 * 縮放比例 = 繪圖座標
            x: (event.clientX - rect.left) * scaleFactor,
            y: (event.clientY - rect.top) * scaleFactor
        };
    }

    // 將滑鼠的像素座標轉換為百分比座標
    function getPercentCoords(pixelX, pixelY) {
        return {
            x: (pixelX / canvas.width) * 100,
            y: (pixelY / canvas.height) * 100
        };
    }


    // 滑鼠按下：開始拖曳
    canvas.addEventListener('mousedown', (e) => {
        if (!uploadedImage.src) return;
        
        isDragging = true;
        
        const pos = getCanvasMousePos(e);
        // 現在 dragStartX/Y 儲存的是繪圖區的像素座標
        dragStartX = pos.x; 
        dragStartY = pos.y;
        
        e.preventDefault(); 
    });

    // 滑鼠移動：計算新位置並重新繪製
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const pos = getCanvasMousePos(e);
        
        // 計算像素級別的位移
        const dx = pos.x - dragStartX;
        const dy = pos.y - dragStartY;
        
        // 獲取當前文字的百分比座標
        const currentTextX_px = canvas.width * (textX / 100);
        const currentTextY_px = canvas.height * (textY / 100);
        
        // 計算文字的新像素座標
        const newTextX_px = currentTextX_px + dx;
        const newTextY_px = currentTextY_px + dy;

        // 將新的像素座標轉換回百分比
        const newPercent = getPercentCoords(newTextX_px, newTextY_px);
        
        // 更新文字的百分比座標，並確保在 0% 到 100% 之間
        textX = Math.min(100, Math.max(0, newPercent.x));
        textY = Math.min(100, Math.max(0, newPercent.y));
        
        // 重新設置起始點，準備下一次移動
        dragStartX = pos.x;
        dragStartY = pos.y;

        drawCanvas();
    });

    // 滑鼠鬆開/離開 (保持不變)
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // --- 其他事件監聽器 (保持不變) ---

    // 圖片載入事件
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

    // 編輯器設定變更事件
    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', drawCanvas);
    });

    // 下載按鈕事件
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
