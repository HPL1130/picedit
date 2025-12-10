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
    const saveStateBtn = document.getElementById('saveStateBtn');
    const loadStateBtn = document.getElementById('loadStateBtn');
    const charSpacingControl = document.getElementById('charSpacing');
    const opacityControl = document.getElementById('opacity');
    
    const addTextBtn = document.getElementById('addTextBtn');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');

    const STORAGE_KEY = 'image_editor_state';

    let canvas = null;
    let originalImage = null;
    let fontsLoaded = false;
    
    // --- 輔助函數 ---

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

    function checkLocalStorage() {
        if (localStorage.getItem(STORAGE_KEY)) {
            loadStateBtn.disabled = false;
        } else {
            loadStateBtn.disabled = true;
        }
    }

    // --- 核心與初始化函數 ---
    
    // [修復點 1] initializeCanvas: 清理並設定為正確的初始狀態
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true,
            selection: true
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
        
        // 核心修復：確保初始狀態是「請先選擇圖片」
        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'none'; // 預設隱藏載入指示器
        placeholder.innerHTML = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...'; // 僅在載入字體時顯示載入
            
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
    }
    
    function updateActiveObjectProperties() {
        // ... (保持不變)
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
            
            left: canvas.width / 2 + 20, 
            top: canvas.height / 2 + 20,
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
    
    // [修復點 2] loadImageToCanvas: 確保載入流程順序正確
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); // 重置 Canvas 和狀態
        
        // 立即顯示載入狀態
        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入圖片並初始化...';

        fabric.Image.fromURL(imgSource, function(img) {
            
            // 載入成功，設定 Canvas 尺寸和背景
            originalImage = img;
            
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            canvas.setBackgroundImage(img, function() {
                canvas.renderAll(); 
                
                // 載入圖片後，自動新增第一個文字物件
                addNewTextObject(); 
            
                downloadBtn.disabled = false;
                
                // 載入和初始化完成，隱藏所有提示
                loadingIndicator.style.display = 'none'; 
                placeholder.style.display = 'none'; 

            }, { 
                scaleX: 1, 
                scaleY: 1
            });

        }, { 
            crossOrigin: 'anonymous', 
            onError: function(err) {
                // 載入失敗處理
                loadingIndicator.style.display = 'none'; 
                console.error("Fabric.js 載入 Base64 數據失敗！", err);
                placeholder.textContent = "👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。";
            }
        }); 
    }
    
    // --- 資料持久化函數 (微調載入流程) ---
    function loadCanvasState() {
        const jsonString = localStorage.getItem(STORAGE_KEY);
        if (!jsonString) {
            alert('找不到任何暫存的編輯狀態。');
            return;
        }

        const json = JSON.parse(jsonString);
        
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入暫存狀態...';

        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            
            // 載入完成，隱藏提示
            loadingIndicator.style.display = 'none'; 
            placeholder.style.display = 'none';
            
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

    // --- 事件監聽器與初始化 ---

    // 1. [Web Font] 等待字體載入完成，再進行初始化
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

    // 3. 綁定控制項事件 (保持不變)
    [
        textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, 
        textOrientationControl, charSpacingControl, opacityControl 
    ].forEach(control => {
        control.addEventListener('input', updateActiveObjectProperties);
        control.addEventListener('change', updateActiveObjectProperties);
    });

    // 4. 圖層控制事件 (保持不變)
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

    // 5. 刪除按鈕事件處理 (保持不變)
    deleteTextBtn.addEventListener('click', () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && confirm("確定要移除選中的物件嗎？")) {
            canvas.remove(activeObject);
            canvas.renderAll();
            canvas.discardActiveObject();
            toggleControls(null);
        }
    });

    // 6. 持久化與下載事件 (保持不變)
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
});ocument.addEventListener('DOMContentLoaded', () => {
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
    const saveStateBtn = document.getElementById('saveStateBtn');
    const loadStateBtn = document.getElementById('loadStateBtn');
    const charSpacingControl = document.getElementById('charSpacing');
    const opacityControl = document.getElementById('opacity');
    
    const addTextBtn = document.getElementById('addTextBtn');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');

    const STORAGE_KEY = 'image_editor_state';

    let canvas = null;
    let originalImage = null;
    let fontsLoaded = false;
    
    // --- 輔助函數：啟用/禁用控制項 (保持不變) ---

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

    // --- 資料持久化函數 (保持不變) ---

    function saveCanvasState() {
        if (!canvas) return;
        canvas.discardActiveObject();
        canvas.renderAll();
        
        try {
            const json = canvas.toJSON(['backgroundImage', 'objects', 'originalImage']);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
            alert('編輯狀態已成功暫存於瀏覽器！');
            checkLocalStorage();
        } catch (error) {
            console.error('儲存狀態失敗:', error);
            alert('儲存編輯狀態失敗，可能檔案太大。');
        }
    }

    function loadCanvasState() {
        const jsonString = localStorage.getItem(STORAGE_KEY);
        if (!jsonString) {
            alert('找不到任何暫存的編輯狀態。');
            return;
        }

        const json = JSON.parse(jsonString);
        
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入暫存狀態...';

        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            loadingIndicator.style.display = 'none'; 
            placeholder.style.display = 'none';
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

    function checkLocalStorage() {
        if (localStorage.getItem(STORAGE_KEY)) {
            loadStateBtn.disabled = false;
        } else {
            loadStateBtn.disabled = true;
        }
    }

    // --- 核心與初始化函數 (保持不變) ---
    
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true,
            selection: true
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
        
        placeholder.style.display = 'block'; 
        placeholder.innerHTML = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        loadingIndicator.style.display = 'none';
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
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
            angle: textAngle
        });
        
        activeObject.set({
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
        });

        activeObject.setCoords(); 
        canvas.requestRenderAll();
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
            
            left: canvas.width / 2 + 20, 
            top: canvas.height / 2 + 20,
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
    
    // [最終修復點] 核心函數：loadImageToCanvas
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入圖片並初始化...';


        fabric.Image.fromURL(imgSource, function(img) {
            
            // 載入成功，立即隱藏指示器
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
            
            // 載入圖片後，自動新增第一個文字物件
            addNewTextObject(); 
            
            downloadBtn.disabled = false;
            
            // [關鍵修復] 無論如何，最後強制隱藏佔位符
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

    // --- 事件監聽器與初始化 (保持不變) ---

    document.fonts.ready.then(() => {
        fontsLoaded = true;
        initializeCanvas(); 
        checkLocalStorage();
    }).catch(err => {
        initializeCanvas();
        checkLocalStorage(); 
    });

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

    [
        textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, 
        textOrientationControl, charSpacingControl, opacityControl 
    ].forEach(control => {
        control.addEventListener('input', updateActiveObjectProperties);
        control.addEventListener('change', updateActiveObjectProperties);
    });

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

    deleteTextBtn.addEventListener('click', () => {
        const activeObject = canvas.getActiveObject();
        if (activeObject && confirm("確定要移除選中的物件嗎？")) {
            canvas.remove(activeObject);
            canvas.renderAll();
            canvas.discardActiveObject();
            toggleControls(null);
        }
    });

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

