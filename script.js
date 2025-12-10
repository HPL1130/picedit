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
    
    // 文字位置狀態：改回使用**繪圖時的像素座標**，在圖片載入時計算初始值。
    let textX_px = 0; 
    let textY_px = 0; 
    
    // 拖曳狀態變數
    let isDragging = false;
    let dragStartX_px, dragStartY_px; // 儲存拖曳起始點的像素座標

    // 輔助函數：將 Canvas 顯示座標轉換為繪圖座標 (用於拖曳)
    function getCanvasMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width; 
        const actualWidth = canvas.width; 
        
        // 如果還沒上傳圖片，寬度可能為 0，進行保護
        if (actualWidth === 0 || displayWidth === 0) return { x: 0, y: 0 };

        const scaleFactor = actualWidth / displayWidth; 

        return {
            // 點擊位置 - Canvas 左上角距離 * 縮放比例 = 繪圖座標
            x: (event.clientX - rect.left) * scaleFactor,
            y: (event.clientY - rect.top) * scaleFactor
        };
    }

    // 繪製所有的元素到 Canvas 上
    function drawCanvas() {
        if (!uploadedImage.src) return;

        // 1. 設定 Canvas 尺寸與圖片一致
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
        
        // 核心：使用當前儲存的像素座標進行繪圖
        const x = textX_px;
        const y = textY_px;

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
            // == 垂直排版邏輯 (修復版) ==
            const lines = text.split('\n');
            const charSpacing = fontSize * 1.5; 
            
            // 垂直排版通常是從右往左寫，從上往下讀
            ctx.textAlign = 'start'; // 改為靠左對齊
            ctx.textBaseline = 'top';  // 從頂部開始

            // 將原點移動到文字塊的起始點 (讓 textX_px, textY_px 作為文字塊的左上角)
            ctx.translate(x, y);

            lines.forEach((line, lineIndex) => {
                // 將每個字元旋轉 90 度，使其直立
                // 整個行塊的位置 (往右移動)
                const lineBlockX = lineIndex * (fontSize + 15); 
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    ctx.save();
                    // 將座標原點移動到當前字元的位置 (X: 行塊位置, Y: 字元間距)
                    ctx.translate(lineBlockX, i * charSpacing);
                    
                    // 旋轉 90 度 (π/2)
                    // 對中文來說，旋轉 0 即可，因為字體本身是方形的，但我們用 translate 實現直排效果
                    // 如果需要字元本身轉向，才需要 ctx.rotate(Math.PI / 2);
                    
                    ctx.fillText(char, 0, 0);
                    ctx.restore();
                }
            });
            
        } else {
            // == 橫式排版邏輯 (保持不變) ==
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
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

    // --- 拖曳互動邏輯 (修復核心：使用像素差，更穩定) ---
    
    // 滑鼠按下：開始拖曳
    canvas.addEventListener('mousedown', (e) => {
        if (!uploadedImage.src) return;
        
        isDragging = true;
        
        // 獲取滑鼠的繪圖像素座標
        const pos = getCanvasMousePos(e);
        dragStartX_px = pos.x; 
        dragStartY_px = pos.y;
        
        e.preventDefault(); 
    });

    // 滑鼠移動：計算新位置並重新繪製
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const pos = getCanvasMousePos(e);
        
        // 計算像素級別的位移
        const dx = pos.x - dragStartX_px;
        const dy = pos.y - dragStartY_px;
        
        // [核心修復] 直接使用像素差來更新文字的像素位置
        textX_px += dx;
        textY_px += dy;
        
        // 確保下次移動時計算正確的差值
        dragStartX_px = pos.x; 
        dragStartY_px = pos.y;

        drawCanvas();
    });

    // 滑鼠鬆開/離開
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // --- 其他事件監聽器 ---

    // 圖片載入事件：計算初始像素座標
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.onload = () => {
                placeholder.style.display = 'none';
                canvas.style.display = 'block';
                
                // [重要] 圖片載入後，初始化文字的像素座標到中央
                textX_px = uploadedImage.width / 2; 
                textY_px = uploadedImage.height / 2;
                
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

    // 下載按鈕事件 (保持不變)
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
