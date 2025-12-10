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
    const saveStateBtn = document.getElementById('saveStateBtn');
    const loadStateBtn = document.getElementById('loadStateBtn');
    const charSpacingControl = document.getElementById('charSpacing');
    const opacityControl = document.getElementById('opacity');
    
    // [新增] 獲取新的圖層控制項
    const addTextBtn = document.getElementById('addTextBtn');
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    const sendToBackBtn = document.getElementById('sendToBackBtn');

    const STORAGE_KEY = 'image_editor_state';

    let canvas = null;
    let originalImage = null;
    let fontsLoaded = false;
    
    // --- 輔助函數：啟用/禁用控制項 ---

    // 根據選中物件的類型，啟用或禁用控制面板
    function toggleControls(activeObject) {
        // 假設控制項應預設禁用
        const isText = activeObject && activeObject.type === 'text';
        
        // 文字屬性控制
        [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, 
         fontColorControl, textOrientationControl, charSpacingControl, opacityControl].forEach(control => {
            control.disabled = !isText;
        });
        
        // 刪除按鈕
        deleteTextBtn.disabled = !activeObject;
        
        // 圖層按鈕
        bringToFrontBtn.disabled = !activeObject;
        sendToBackBtn.disabled = !activeObject;
        
        if (isText) {
             // 將選中物件的屬性同步到控制項
             syncControlsFromObject(activeObject);
        } else {
            // 如果沒有選中文字物件，清空輸入框
            textInput.value = '';
        }
    }

    // 將物件的屬性同步到控制面板
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

    // --- 資料持久化函數 (微調，以支援多物件) ---

    function saveCanvasState() {
        if (!canvas) return;
        canvas.discardActiveObject();
        canvas.renderAll();
        
        try {
            // 儲存整個 Canvas 狀態
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
            
            // 嘗試選中第一個文字物件，並同步控制項
            const firstTextObj = canvas.getObjects().find(obj => obj.type === 'text');
            if (firstTextObj) {
                canvas.setActiveObject(firstTextObj);
                canvas.fire('selection:created', { target: firstTextObj }); // 手動觸發選中事件
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

    // --- 核心與初始化函數 ---
    
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true,
            selection: true // 確保可以選擇多個物件
        });
        
        // 綁定 Fabric.js 事件監聽器
        canvas.on({
            'selection:created': (e) => toggleControls(e.selected[0]),
            'selection:updated': (e) => toggleControls(e.selected[0]),
            'selection:cleared': () => toggleControls(null),
            'object:modified': (e) => {
                // 當物件移動或縮放時，更新控制項狀態（主要用於確保屬性是最新的）
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
        
        // 初始禁用所有控制項
        toggleControls(null);
    }

    // [修改] 現在此函數是更新選中的物件
    function updateActiveObjectProperties() {
        const activeObject = canvas.getActiveObject();
        if (!activeObject || activeObject.type !== 'text') return;
        
        const orientation = textOrientationControl.value;
        const textValue = textInput.value || "請輸入文字";
        
        // 取得所有控制項的值
        const newFontSize = parseInt(fontSizeControl.value, 10);
        const newFontFamily = fontFamilyControl.value;
        const newFillColor = fontColorControl.value;
        const newFontWeight = fontWeightControl.value;
        const newCharSpacing = parseInt(charSpacingControl.value, 10);
        const newOpacity = parseFloat(opacityControl.value / 100);
        const textAngle = orientation === 'vertical' ? 90 : 0; 

        // 批量設定屬性
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
        
        // 確保陰影和描邊屬性保持一致
        activeObject.set({
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
        });

        // Fabric.js 需要這兩行來重新計算大小和渲染
        activeObject.setCoords(); 
        canvas.requestRenderAll();
    }
    
    // [新增] 新增文字物件的函數
    function addNewTextObject() {
        if (!canvas || !originalImage) {
            alert('請先載入圖片！');
            return;
        }
        
        const newText = new fabric.Text("新增的文字", {
            fontSize: 48,
            fontFamily: fontFamilyControl.value, // 使用當前選單中的字體
            fill: fontColorControl.value,        // 使用當前選單中的顏色
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
            
            left: canvas.width / 2 + 20, // 稍微偏移，避免與第一個物件重疊
            top: canvas.height / 2 + 20,
            textAlign: 'center',
            originX: 'center',
