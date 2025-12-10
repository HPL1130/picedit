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
    
    // --- 輔助函數 ---

    // [新輔助函數] 處理佔位符顯示
    function showPlaceholder(message, showLoadingIndicator = false) {
        // 確保佔位符在 DOM 中
        if (!placeholder.parentNode) {
            canvasWrapper.appendChild(placeholder);
        }
        
        // 使用 CSS Class 控制顯示層級和樣式
        canvasWrapper.classList.add('loading-state');
        placeholder.style.display = 'flex'; // 確保顯示

        // 更新提示內容，並控制藍色載入指示器
        let indicatorHTML = '';
        if (showLoadingIndicator) {
            indicatorHTML = '<span style="color: #007bff; margin-top: 10px; font-weight: bold;">正在載入...</span>';
        }
        placeholder.innerHTML = message + indicatorHTML;
    }

    // [新輔助函數] 處理佔位符隱藏
    function hidePlaceholder() {
        // 關鍵步驟：載入成功後，移除 CSS 類別並強制隱藏元素
        canvasWrapper.classList.remove('loading-state');
        placeholder.style.display = 'none'; // 強制隱藏
        placeholder.innerHTML = ''; // 清空內容
    }

    function toggleControls(activeObject) {
        // ... (保持不變)
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
        // ... (保持不變)
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
    
    // [修復點 1] initializeCanvas: 重置 Canvas 狀態
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
        
        // 初始狀態：顯示就緒提示
        const initialMessage = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        showPlaceholder(initialMessage, !fontsLoaded); // 字體未載入時顯示藍色載入指示器
            
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
        
        // 如果字體已載入，且 Canvas 尚未有內容，則隱藏載入指示器
        if (fontsLoaded && !originalImage) {
             hidePlaceholder();
             // 重新顯示就緒提示 (不帶載入動畫)
             showPlaceholder('👆 請先選擇一張圖片，然後點擊文字進行拖曳', false); 
        }
    }
    
    function addNewTextObject() {
        // ... (保持不變)
        if (!canvas || !originalImage) {
            alert('請先載入圖片！');
            return;
        }
        // ... (略)
    }
    
    // [核心修復點] loadImageToCanvas
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 
        
        // 顯示載入狀態
        showPlaceholder('正在載入圖片並初始化...', true);

        fabric.Image.fromURL(imgSource, function(img) {
            
            originalImage = img;
            
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            // 關鍵：將 Canvas 容器調整為圖片大小，確保覆蓋整個佔位符區域
            canvasWrapper.style.width = `${img.width}px`;
            canvasWrapper.style.height = `${img.height}px`;

            canvas.setBackgroundImage(img, function() {
                canvas.renderAll(); 
                
                addNewTextObject(); 
            
                downloadBtn.disabled = false;
                
                // 關鍵修復：載入和初始化完成，強制隱藏提示！
                hidePlaceholder();

            }, { 
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
    // ... (其餘函數保持不變)
    
    // 4. 圖層控制事件 (略)
    // ...
    
    // 5. 刪除按鈕事件處理 (略)
    // ...

    // 6. 持久化與下載事件 (略)
    // ...
});
