document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素獲取
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontFamilyControl = document.getElementById('fontFamily');
    const fontSizeControl = document.getElementById('fontSize');
    const fontWeightControl = document.getElementById('fontWeight'); // 新增
    const fontColorControl = document.getElementById('fontColor');
    const textOrientationControl = document.getElementById('textOrientation'); // 新增
    const downloadFormatControl = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('imageCanvas');
    const placeholder = document.getElementById('canvasPlaceholder');
    const ctx = canvas.getContext('2d');

    let uploadedImage = new Image();
    
    // 文字位置狀態 (預設為 Canvas 上的百分比，圖片載入後會轉換為像素)
    let textX = 50; // 初始 X 座標 (百分比)
    let textY = 50; // 初始 Y 座標 (百分比)
    
    // 拖曳狀態變數
    let isDragging = false;
    let dragStartX, dragStartY;

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
        
        // 獲取所有控制項的值
        const fontFamily = fontFamilyControl.value;
        const fontSize = parseInt(fontSizeControl.value, 10);
        const fontWeight = fontWeightControl.value; // 粗體
        const fontColor = fontColorControl.value;
        const orientation = textOrientationControl.value; // 排版
        
        // 計算實際像素座標
        const x = canvas.width * (textX / 100);
        const y = canvas.height * (textY / 100);

        ctx.fillStyle = fontColor;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`; // 套用粗體和字型
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 處理多行文字
        const lines = text.split('\n');
        
        // 設置陰影（保持文字清晰）
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.save(); // 儲存當前 Canvas 狀態

        if (orientation === 'vertical') {
            // == 垂直排版邏輯 ==
            
            // 將 Canvas 旋轉 90 度 (繪圖空間從橫式變為直式)
            // 將原點平移到文字的起始點
            ctx.translate(x, y);
            
            const charSpacing = fontSize * 1.5; // 字元間距
            let lineX = 0; // 垂直排版時，X 座標是行距
            
            lines.forEach((line, lineIndex) => {
                // 每行往右移動
                lineX = lineIndex * (fontSize + 10); 
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    // 繪製單個字元 (從上到下)
                    ctx.fillText(char, lineX, i * charSpacing);
                }
            });
            
        } else {
            // == 橫式排版邏輯 ==
            
            const lineHeight = fontSize * 1.2;
            let currentY = y - (lines.length - 1) * lineHeight / 2; // 讓多行文字在 Y 點居中

            lines.forEach(line => {
                ctx.fillText(line, x, currentY);
                currentY += lineHeight;
            });
        }
        
        ctx.restore(); // 恢復 Canvas 狀態，取消旋轉/平移

        // 清除陰影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        downloadBtn.disabled = false;
    }

    // --- 拖曳互動邏輯 (核心) ---
    
    // 獲取滑鼠在 Canvas 上的座標 (考慮邊界和縮放)
    function getCanvasMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // 滑鼠按下：開始拖曳
    canvas.addEventListener('mousedown', (e) => {
        if (!uploadedImage.src) return;
        
        // 判斷是否在可拖曳的文字區域內 (這裡只做簡單檢查，即點擊 Canvas 即視為要拖曳文字)
        isDragging = true;
        
        // 計算拖曳起始點 (用於計算偏移量)
        const pos = getCanvasMousePos(e);
        dragStartX = pos.x;
        dragStartY = pos.y;
        
        // 避免瀏覽器預設拖曳圖片行為
        e.preventDefault(); 
    });

    // 滑鼠移動：計算新位置並重新繪製
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const pos = getCanvasMousePos(e);
        
        // 計算像素級別的位移
        const dx = pos.x - dragStartX;
        const dy = pos.y - dragStartY;
        
        // 將像素位移轉換為百分比位移
        const dXPercent = (dx / canvas.width) * 100;
        const dYPercent = (dy / canvas.height) * 100;

        // 更新文字的百分比座標
        textX = Math.min(100, Math.max(0, textX + dXPercent));
        textY = Math.min(100, Math.max(0, textY + dYPercent));
        
        // 重新設置起始點，準備下一次移動
        dragStartX = pos.x;
        dragStartY = pos.y;

        drawCanvas(); // 重新繪製以顯示拖曳效果
    });

    // 滑鼠鬆開：結束拖曳
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 滑鼠離開 Canvas 時也停止拖曳
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // --- 其他事件監聽器 ---

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

    // 編輯器設定變更事件 (監聽所有控制項)
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
