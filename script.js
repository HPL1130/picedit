document.addEventListener('DOMContentLoaded', () => {
    // 獲取所有 DOM 元素 (保持不變)
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

    // [新增] 檢查字體載入狀態的旗標
    let fontsLoaded = false;
    
    // --- 輔助函數 ---

    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true 
        });
        
        placeholder.style.display = 'block'; 
        // 初始佔位符提示字體狀態
        placeholder.innerHTML = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        loadingIndicator.style.display = 'none'; 
        currentTextObject = null;
        originalImage = null;
        downloadBtn.disabled = true;
        deleteTextBtn.disabled = true; 
    }

    // ... updateTextProperties 函數 (保持不變) ...
    // 由於此函數與效能優化版 script.js 內容一致，這裡省略以避免重複。
    // 請確保使用上一個步驟中提供的效能優化版 script.js 中的 updateTextProperties 內容。
    
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
        
        const textAngle = orientation === 'vertical' ? 90 : 0; 

        if (currentTextObject) {
            canvas.remove(currentTextObject);
            currentTextObject = null;
        }

        // 創建單個高性能的 fabric.Text 物件
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
            lockScalingFlip: true,
            
            angle: textAngle
        });
        
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
        // ... (保持不變) ...
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.innerHTML = '<span id="loadingIndicator">正在載入圖片並初始化... (需數秒)</span>';


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

    // 1. [關鍵] 等待字體載入完成，再進行初始化
    document.fonts.ready.then(() => {
        fontsLoaded = true;
        console.log("Web Fonts 載入完成！");
        // 初始化 Canvas
        initializeCanvas(); 
    }).catch(err => {
        // 如果字體載入失敗，仍然進行初始化
        console.error("Web Fonts 載入失敗，使用系統字體。", err);
        initializeCanvas();
    });

    // 2. 處理使用者上傳圖片
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("警告：圖片檔案超過 5MB，手機上可能載入失敗。請嘗試較小的圖片。");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // 確保字體載入後才開始載入圖片
            if (fontsLoaded) {
                loadImageToCanvas(event.target.result); 
            } else {
                alert("字體資源尚未載入完成，請稍後再試。");
            }
        };
        reader.onerror = () => {
            alert("檔案讀取失敗，請確認檔案類型或大小。");
        };
        reader.readAsDataURL(file);
    });

    // 3. 綁定控制項事件
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
        
        if (currentTextObject) {
            canvas.setActiveObject(currentTextObject);
            canvas.renderAll();
        }
    });
});
