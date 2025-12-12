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
    
    // 獲取佔位符相關元素
    const canvasWrapper = document.querySelector('.canvas-wrapper'); 
    let placeholder = document.getElementById('canvasPlaceholder'); 
    
    const saveStateBtn = document.getElementById('saveStateBtn');
    const loadStateBtn = document.getElementById('loadStateBtn');
    const charSpacingControl = document.getElementById('charSpacing');
    const opacityControl = document.getElementById('opacity');
    
    const addTextBtn = document.getElementById('addTextBtn');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');
    const deleteTextBtn = document.getElementById('deleteTextBtn'); 

    const STORAGE_KEY = 'image_editor_state';

    let canvas = null;
    let originalImage = null;
    let fontsLoaded = false;
    
    const DEFAULT_CANVAS_WIDTH = 600;
    const DEFAULT_CANVAS_HEIGHT = 400;

    // --- 輔助函數 ---

    function showPlaceholder(message, showLoadingIndicator = false) {
        if (!placeholder.parentNode) {
            canvasWrapper.appendChild(placeholder);
        }
        
        canvasWrapper.classList.add('loading-state');
        placeholder.style.display = 'flex'; 

        let indicatorHTML = '';
        if (showLoadingIndicator) {
            indicatorHTML = '<span style="color: #007bff; margin-top: 10px; font-weight: bold;">正在載入...</span>';
        }
        placeholder.innerHTML = message + indicatorHTML;
    }

    function hidePlaceholder() {
        canvasWrapper.classList.remove('loading-state');
        placeholder.style.display = 'none'; 
        placeholder.innerHTML = ''; 
    }
    
    function toggleControls(activeObject) {
        const isText = activeObject && activeObject.type === 'text';
        
        [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, 
         fontColorControl, textOrientationControl, charSpacingControl, opacityControl].forEach(control => {
            control.disabled = !isText;
        });
        
        deleteTextBtn.disabled = !activeObject;
        bringToFrontBtn.disabled = !activeObject;
        sendToBackBtn.disabled = !activeObject;
        
        if (isText) {
             syncControlsFromObject(activeObject);
        } 
    }

    function syncControlsFromObject(obj) {
        textInput.value = obj.text;
        fontFamilyControl.value = obj.fontFamily;
        fontSizeControl.value = obj.fontSize;
        fontColorControl.value = obj.fill;
        fontWeightControl.value = obj.fontWeight;
        textOrientationControl.value = obj.angle === 90 ? 'vertical' : 'horizontal';
        charSpacingControl.value = obj.charSpacing || 0;
        opacityControl.value = obj.opacity * 100 || 100;
    }
    
    function updateActiveObjectProperties() {
        const activeObject = canvas.getActiveObject();
        if (!activeObject || activeObject.type !== 'text') return;
        
        const orientation = textOrientationControl.value;
        const textValue = textInput.value || "請輸入文字"; 
        
        const newFontSize = parseInt(fontSizeControl.value, 10);
        const newFontFamily = fontFamilyControl.value;
        const newFillColor = fontColorControl.value;
        const newFontWeight = fontWeightControl.value;
        const newCharSpacing = parseInt(charSpacingControl.value, 10);
        const newOpacity = parseFloat(opacityControl.value / 100);
        const textAngle = orientation === 'vertical' ? 90 : 0; 

        activeObject.set({
            text: textValue, 
            fontSize: newFontSize,
            fontFamily: newFontFamily,
            fill: newFillColor,
            fontWeight: newFontWeight,
            charSpacing: newCharSpacing,
            opacity: newOpacity,
            angle: textAngle,
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
        });

        activeObject.setCoords(); 
        canvas.requestRenderAll(); 
    }


    function checkLocalStorage() {
        if (localStorage.getItem(STORAGE_KEY)) {
            loadStateBtn.disabled = false;
        } else {
            loadStateBtn.disabled = true;
        }
    }

    // --- 核心與初始化函數 ---
    
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true,
            selection: true,
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT 
        });
        
        canvas.on({
            'selection:created': (e) => toggleControls(e.selected ? e.selected[0] : null),
            'selection:updated': (e) => toggleControls(e.selected ? e.selected[0] : null),
            'selection:cleared': () => toggleControls(null),
            'object:modified': (e) => {
                if (e.target && e.target.type === 'text') {
                     syncControlsFromObject(e.target);
                }
            }
        });
        
        canvasWrapper.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
        canvasWrapper.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;

        // 初始狀態：僅顯示「正在載入字體」或初始提示
        if (!fontsLoaded) {
            showPlaceholder('正在載入字體，請稍候...'); 
        } else {
            showPlaceholder('👆 請先選擇一張圖片，然後點擊文字進行拖曳');
        }
            
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
        
        textInput.value = '請選中 Canvas 上的物件進行編輯';
    }
    
    function addNewTextObject() {
        if (!canvas || !originalImage) {
            alert('請先載入圖片！');
            return;
        }
        
        const newText = new fabric.Text("新增的文字", {
            fontSize: 48,
            fontFamily: fontFamilyControl.value,
            fill: fontColorControl.value,
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
            
            left: canvas.width / 2, 
            top: canvas.height / 2,
            textAlign: 'center',
            originX: 'center', 
            originY: 'center',
            hasControls: true, 
            lockScalingFlip: true,
            angle: 0
        });
        
        canvas.add(newText);
        canvas.setActiveObject(newText);
        canvas.renderAll();
        
        canvas.fire('selection:created', { selected: [newText] }); 
    }
    
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 
        
        showPlaceholder('正在載入圖片並初始化...', true);

        fabric.Image.fromURL(imgSource, function(img) {
            
            originalImage = img;
            
            const containerWidth = canvasWrapper.clientWidth;
            let scale = 1;

            if (img.width > containerWidth) {
                scale = containerWidth / img.width;
            }
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            canvasWrapper.style.width = `${scaledWidth}px`;
            canvasWrapper.style.height = `${scaledHeight}px`;

            canvas.setZoom(scale);
            
            canvas.setBackgroundImage(img, function() {
                canvas.renderAll(); 
                
                hidePlaceholder(); 
                
                // 載入完成後，新增文字物件並啟用下載按鈕
                addNewTextObject(); 
            
                downloadBtn.disabled = false; 

            }, { 
                scaleX: 1, 
                scaleY: 1
            });

        }, { 
            crossOrigin: 'anonymous', 
            onError: function(err) {
                showPlaceholder("👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。", false);
                console.error("Fabric.js 載入 Base64 數據失敗！", err);
                downloadBtn.disabled = true;
            }
        }); 
    }
    
    function loadCanvasState() {
        const jsonString = localStorage.getItem(STORAGE_KEY);
        if (!jsonString) {
            alert('找不到任何暫存的編輯狀態。');
            return;
        }

        const json = JSON.parse(jsonString);
        
        initializeCanvas(); 

        showPlaceholder('正在載入暫存狀態...', true);

        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            
            hidePlaceholder();
            
            downloadBtn.disabled = false;
            
            const firstTextObj = canvas.getObjects().find(obj => obj.type === 'text');
            if (firstTextObj) {
                canvas.setActiveObject(firstTextObj);
                canvas.fire('selection:created', { selected: [firstTextObj] }); 
            }
            toggleControls(firstTextObj);
            
            alert('暫存狀態已成功載入！');
        });
    }

    function saveCanvasState() {
        if (!canvas) {
            alert('請先載入圖片開始編輯！');
            return;
        }
        canvas.discardActiveObject(); 
        canvas.renderAll();
        
        const json = canvas.toJSON(['scaleX', 'scaleY', 'angle', 'opacity', 'charSpacing', 'stroke', 'strokeWidth', 'fontWeight']);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        checkLocalStorage();
        alert('編輯狀態已暫存到您的瀏覽器中！');
    }

    // --- 事件監聽器與初始化 ---

    // 1. [Web Font] 
    document.fonts.ready.then(() => {
        fontsLoaded = true;
        // 修正：字體載入完成後，更新提示
        if (!originalImage) {
            showPlaceholder('👆 請先選擇一張圖片，然後點擊文字進行拖曳');
        }
        checkLocalStorage();
    }).catch(err => {
        console.error("字體載入失敗:", err);
        checkLocalStorage(); 
    });
    
    // 確保 Canvas 在 DOM 準備好後立即初始化
    initializeCanvas();

    // 2. 處理使用者上傳圖片 (修正點：移除對 fontsLoaded 的檢查，直接執行)
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("警告：圖片檔案超過 5MB，手機上可能載入失敗。請嘗試較小的圖片。");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // 不再檢查 fontsLoaded，直接開始圖片載入，讓 loadImageToCanvas 處理後續
            loadImageToCanvas(event.target.result); 
        };
        reader.readAsDataURL(file);
    });

    // 3. 綁定控制項事件 
    [
        textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, 
        textOrientationControl, charSpacingControl, opacityControl 
    ].forEach(control => {
        control.addEventListener('input', updateActiveObjectProperties);
        control.addEventListener('change', updateActiveObjectProperties);
    });

    // 4. 圖層控制事件 
    addTextBtn.addEventListener('click', addNewTextObject);
    
    bringToFrontBtn.addEventListener('click', () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.bringToFront(activeObject);
            canvas.renderAll();
        }
    });

    sendToBackBtn.addEventListener('click', () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            const backgroundObject = canvas.getObjects()[0];
            if (activeObject !== backgroundObject) {
                 canvas.sendBackwards(activeObject, true);
                 canvas.renderAll();
            }
        }
    });

    // 5. 刪除按鈕事件處理 
    deleteTextBtn.addEventListener('click', () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && confirm("確定要移除選中的物件嗎？")) {
            canvas.remove(activeObject);
            canvas.renderAll();
            canvas.discardActiveObject();
            toggleControls(null);
        }
    });

    // 6. 持久化與下載事件 
    saveStateBtn.addEventListener('click', saveCanvasState);
    loadStateBtn.addEventListener('click', loadCanvasState);

    downloadBtn.addEventListener('click', () => {
        if (!originalImage) {
            alert("請先上傳圖片！");
            return;
        }
        
        canvas.discardActiveObject(); 
        canvas.renderAll();

        const format = downloadFormatControl.value; 
        let fileExtension = format.split('/')[1];
        const mimeType = format === 'image/jpeg' ? 'image/jpeg' : 'image/png'; 

        try {
            const dataURL = canvas.toDataURL({
                format: fileExtension,
                quality: fileExtension === 'jpeg' ? 0.9 : 1.0,
                mimeType: mimeType
            }); 

            const link = document.createElement('a');
            link.download = `圖像創意文字-${Date.now()}.${fileExtension}`; 
            link.href = dataURL;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                if (link.href.length < 50) { 
                    console.error("下載連結生成異常或被瀏覽器阻止，嘗試新視窗打開。");
                    window.open(dataURL, '_blank');
                    alert("下載未自動開始。圖片已在新視窗中打開，請手動右鍵儲存。");
                }
            }, 100); 

        } catch (error) {
            alert("下載失敗：無法將 Canvas 轉換為圖片數據。請確保您使用的是本地上傳的圖片。");
            console.error("下載錯誤:", error);
        }
    });
});
