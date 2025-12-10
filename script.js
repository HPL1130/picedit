document.addEventListener('DOMContentLoaded', () => {
    // 獲取所有 DOM 元素
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontFamilyControl = document.getElementById('fontFamily');
    const fontSizeControl = document.getElementById('fontSize');
    const fontWeightControl = document.getElementById('fontWeight');
    const fontColorControl = document.getElementById('fontColor');
    const textOrientationControl = document.getElementById('textOrientation');
    const downloadFormatControl = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');
    const deleteTextBtn = document.getElementById('deleteTextBtn'); 
    const placeholder = document.getElementById('canvasPlaceholder');
    const loadingIndicator = document.getElementById('loadingIndicator'); 

    let canvas = null;
    let currentTextObject = null;
    let originalImage = null;

    // --- 輔助函數 ---

    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            // 關鍵：釋放記憶體，避免手機崩潰
            canvas.dispose(); 
        }
        
        // 創建新的 Fabric.js 實例
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true 
        });
        
        // 確保初始狀態正確
        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'none'; 
        currentTextObject = null;
        originalImage = null;
        downloadBtn.disabled = true;
        deleteTextBtn.disabled = true; 
    }

    // [核心修改] 處理文字屬性更新和直式排版邏輯
    function updateTextProperties() {
        if (!canvas) return;
        
        const orientation = textOrientationControl.value;
        const textValue = textInput.value || "請輸入文字";
        const newFontSize = parseInt(fontSizeControl.value, 10);
        const newFontFamily = fontFamilyControl.value;
        const newFillColor = fontColorControl.value;
        const newFontWeight = fontWeightControl.value;
        const shadowStyle = '4px 4px 5px rgba(0,0,0,0.5)';
        const strokeColor = '#000000';
        const strokeWidth = 2;

        // 如果文字物件已經存在，先從 Canvas 上移除
        if (currentTextObject) {
            canvas.remove(currentTextObject);
            currentTextObject = null;
        }

        if (orientation === 'vertical') {
            // == [真正的直式排版]：創建單字物件群組 ==
            
            const lines = textValue.split('\n');
            const characterObjects = [];
            
            // 計算 Y 軸偏移
            let currentX = 0; 
            
            // 處理多行文字 (直式排版中，每行是一個垂直堆疊的字組)
            lines.forEach((line) => {
                if (!line) return;
                
                let lineGroupHeight = 0;
                
                // 將每個字元轉換為一個獨立的 Fabric.Text 物件
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const charObject = new fabric.Text(char, {
                        fontSize: newFontSize,
                        fontFamily: newFontFamily,
                        fill: newFillColor,
                        fontWeight: newFontWeight,
                        shadow: shadowStyle,
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        
                        // 定位：確保在 Group 內部正確堆疊
                        left: currentX, 
                        top: lineGroupHeight,
                        originX: 'center',
                        originY: 'top',
                    });
                    
                    characterObjects.push(charObject);
                    lineGroupHeight += newFontSize * 1.2; // 調整行距 (1.2倍字體大小)
                }
                
                // 每個垂直字組之間保持間距
                currentX += newFontSize * 1.5; 
            });
            
            // 將所有單字物件組合成一個群組
            currentTextObject = new fabric.Group(characterObjects, {
                // 將群組置於 Canvas 中央
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                hasControls: true, 
                lockScalingFlip: true 
            });

        } else {
            // == [橫式排版]：使用單個文字物件 (與之前邏輯一致) ==
            currentTextObject = new fabric.Text(textValue, {
                fontSize: newFontSize,
                fontFamily: newFontFamily,
                fill: newFillColor,
                fontWeight: newFontWeight,
                shadow: shadowStyle,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                
                left: canvas.width / 2,
                top: canvas.height / 2,
                textAlign: 'center',
                originX: 'center', 
                originY: 'center',
                hasControls: true, 
                lockScalingFlip: true 
            });
        }
        
        // 確保有物件時才加入和啟用按鈕
        if (currentTextObject) {
            canvas.add(currentTextObject);
            canvas.setActiveObject(currentTextObject);
            deleteTextBtn.disabled = false;
        } else {
            deleteTextBtn.disabled = true;
        }

        canvas.requestRenderAll();
    }
    
    // 核心函數：載入圖片到 Canvas
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 

        fabric.Image.fromURL(imgSource, function(img) {
            // == 載入成功時執行 ==
            loadingIndicator.style.display = 'none'; 
            
            originalImage = img;
            
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: 1, 
                scaleY: 1
            });
            
            // 初始化文字物件（重要：這裡不再創建文字，而是直接呼叫 updateTextProperties）
            updateTextProperties(); 
            
            downloadBtn.disabled = false;
            placeholder.style.display = 'none'; 

        }, { 
            crossOrigin: 'anonymous', 
            onError: function(err) {
                loadingIndicator.style.display = 'none'; 
                console.error("Fabric.js 載入 Base64 數據失敗！", err);
                placeholder.textContent = "👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。";
            }
        }); 
    }

    // --- 事件監聽器與初始化 ---

    // 1. 處理使用者上傳圖片
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("警告：圖片檔案超過 5MB，手機上可能載入失敗。請嘗試較小的圖片。");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            loadImageToCanvas(event.target.result); 
        };
        reader.onerror = () => {
            alert("檔案讀取失敗，請確認檔案類型或大小。");
        };
        reader.readAsDataURL(file);
    });

    // 2. 網頁載入後立即執行初始化
    initializeCanvas(); 
    
    // 3. 綁定控制項事件 (所有控制項現在都觸發更複雜的 updateTextProperties)
    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', updateTextProperties);
        control.addEventListener('change', updateTextProperties);
    });

    // 4. 刪除按鈕事件處理
    deleteTextBtn.addEventListener('click', () => {
        if (currentTextObject && confirm("確定要移除目前的文字物件嗎？")) {
            canvas.remove(currentTextObject);
            currentTextObject = null;
            canvas.renderAll();
            textInput.value = ""; 
            deleteTextBtn.disabled = true;
        }
    });

    // 5. 下載按鈕事件
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) {
            alert("請先上傳圖片！");
            return;
        }
        
        canvas.discardActiveObject(); 
        canvas.renderAll();

        const format = downloadFormatControl.value; 
        let fileExtension = format.split('/')[1];

        const dataURL = canvas.toDataURL({
            format: fileExtension,
            quality: fileExtension === 'jpeg' ? 0.9 : 1.0
        }); 

        const link = document.createElement('a');
        link.download = `圖像創意文字-${Date.now()}.${fileExtension}`; 
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 重新選中物件，方便繼續編輯
        if (currentTextObject) {
            canvas.setActiveObject(currentTextObject);
            canvas.renderAll();
        }
    });
});
