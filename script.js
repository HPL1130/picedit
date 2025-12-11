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
    
    // 定義一個初始的 Canvas 尺寸，確保未載圖時也能看到文字
    const DEFAULT_CANVAS_WIDTH = 600;
    const DEFAULT_CANVAS_HEIGHT = 400;

    // --- 輔助函數 ---

    // 處理佔位符顯示
    function showPlaceholder(message, showLoadingIndicator = false) {
        if (!placeholder.parentNode) {
            canvasWrapper.appendChild(placeholder);
        }
        
        canvasWrapper.classList.add('loading-state');
        placeholder.style.display = 'flex'; 

        let indicatorHTML = '';
        if (showLoadingIndicator) {
            // 使用內聯樣式定義藍色載入指示器
            indicatorHTML = '<span style="color: #007bff; margin-top: 10px; font-weight: bold;">正在載入...</span>';
        }
        placeholder.innerHTML = message + indicatorHTML;
    }

    // 處理佔位符隱藏
    function hidePlaceholder() {
        canvasWrapper.classList.remove('loading-state');
        placeholder.style.display = 'none'; // 強制隱藏
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
        } else {
            textInput.value = '請選中 Canvas 上的物件進行編輯'; 
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
    
    // [修復點 1] initializeCanvas: 修正初始尺寸
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true,
            selection: true,
            // 預設為固定尺寸，確保在圖片載入前有可見區域
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT 
        });
        
        canvas.on({
            'selection:created': (e) => toggleControls(e.selected[0]),
            'selection:updated': (e) => toggleControls(e.selected[0]),
            'selection:cleared': () => toggleControls(null),
            'object:modified': (e) => {
                if (e.target && e.target.type === 'text') {
                     syncControlsFromObject(e.target);
                }
            }
        });
        
        // 確保 Canvas 容器具有預設尺寸
        canvasWrapper.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
        canvasWrapper.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;

        // 初始狀態：顯示就緒提示
        const initialMessage = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        showPlaceholder(initialMessage, false); 
        
        // 如果字體已載入，且 Canvas 尚未有內容，則顯示就緒提示 (不帶載入動畫)
        if (fontsLoaded) {
            showPlaceholder('👆 請先選擇一張圖片，然後點擊文字進行拖曳', false); 
        }
            
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
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
            
            // 將位置設定在 Canvas 中央
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
        
        canvas.fire('selection:created', { target: newText }); 
    }
    
    // [核心修復點] loadImageToCanvas: 新增縮放計算
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 
        
        // 載入時，顯示載入動畫
        showPlaceholder('正在載入圖片並初始化...', true);

        fabric.Image.fromURL(imgSource, function(img) {
            
            originalImage = img;
            
            // -----------------------------------------------------
            // 💡 手機自適應計算邏輯 (核心修正)
            // -----------------------------------------------------
            const containerWidth = canvasWrapper.clientWidth;
            let scale = 1;

            // 只有當圖片寬度大於容器寬度時，才進行縮放
            if (img.width > containerWidth) {
                scale = containerWidth / img.width;
            }
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // 1. 設定 Canvas 的實際尺寸（Canvas 內部尺寸，保持原圖像素以供下載）
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            // 2. 設定 Canvas 容器的顯示尺寸（DOM 尺寸，使用縮放後的尺寸適應螢幕）
            canvasWrapper.style.width = `${scaledWidth}px`;
            canvasWrapper.style.height = `${scaledHeight}px`;

            // 3. 縮放 Canvas 內容 (縮放所有繪圖內容，使其適應容器大小)
            canvas.setZoom(scale);
            // -----------------------------------------------------
            
            canvas.setBackgroundImage(img, function() {
                canvas.renderAll(); 
                
                // 載入完成，隱藏提示
                hidePlaceholder(); 
                
                // 載入圖片後，自動新增第一個文字物件
                addNewTextObject(); 
            
                downloadBtn.disabled = false;

            }, { 
                // 背景圖不需要額外縮放，因為我們已經縮放了整個 Canvas 
                scaleX: 1, 
                scaleY: 1
            });

        }, { 
            crossOrigin: 'anonymous', 
            onError: function(err) {
                // 載入失敗處理
                showPlaceholder("👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。", false);
                console.error("Fabric.js 載入 Base64 數據失敗！", err);
                downloadBtn.disabled = true;
            }
        }); 
    }
    
    // [持久化載入] 確保狀態清理
    function loadCanvasState() {
        const jsonString = localStorage.getItem(STORAGE_KEY);
        if (!jsonString) {
            alert('找不到任何暫存的編輯狀態。');
            return;
        }

        const json = JSON.parse(jsonString);
        
        initializeCanvas(); 

        // 顯示載入狀態
        showPlaceholder('正在載入暫存狀態...', true);

        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            
            // 載入完成，隱藏提示
            hidePlaceholder();
            
            downloadBtn.disabled = false;
            
            const firstTextObj = canvas.getObjects().find(obj => obj.type === 'text');
            if (firstTextObj) {
                canvas.setActiveObject(firstTextObj);
                canvas.fire('selection:created', { target: firstTextObj });
            }
            toggleControls(firstTextObj);
            
            alert('暫存狀態已成功載入！');
        });
    }

    // 7. 持久化狀態保存
    function saveCanvasState() {
        if (!canvas) {
            alert('請先載入圖片開始編輯！');
            return;
        }
        // 清除選區，確保 JSON 乾淨
        canvas.discardActiveObject(); 
        canvas.renderAll();
        
        const json = canvas.toJSON(['scaleX', 'scaleY', 'angle', 'opacity', 'charSpacing', 'stroke', 'strokeWidth', 'fontWeight']);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        checkLocalStorage();
        alert('編輯狀態已暫存到您的瀏覽器中！');
    }

    // --- 事件監聽器與初始化 (保持不變) ---

    // 1. [Web Font] 
    document.fonts.ready.then(() => {
        fontsLoaded = true;
        initializeCanvas(); 
        checkLocalStorage();
    }).catch(err => {
        initializeCanvas();
        checkLocalStorage(); 
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
            if (fontsLoaded) {
                loadImageToCanvas(event.target.result); 
            } else {
                alert("字體資源尚未載入完成，請稍後再試。");
            }
        };
        reader.readAsDataURL(file);
    });

    // 3. 綁定控制項事件 (略)
    [
        textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, 
        textOrientationControl, charSpacingControl, opacityControl 
    ].forEach(control => {
        control.addEventListener('input', updateActiveObjectProperties);
        control.addEventListener('change', updateActiveObjectProperties);
    });

    // 4. 圖層控制事件 (略)
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

    // 5. 刪除按鈕事件處理 (略)
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

        // 由於 Canvas 內容在畫面上是縮小的 (canvas.setZoom)，
        // toDataURL 會使用原始尺寸 (img.width/height) 輸出，確保下載是高解析度。
        
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
    });
});
