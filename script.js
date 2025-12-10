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
    const canvasWrapper = document.querySelector('.canvas-wrapper'); // <--- 新增：獲取父容器
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
        
        // ... (toggleControls 保持不變)
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
        // ... (syncControlsFromObject 保持不變)
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
        
        // 關鍵修復：每次初始化時，將佔位符父容器標記為顯示
        canvasWrapper.classList.add('loading-state');
        
        loadingIndicator.style.display = 'none';
        placeholder.innerHTML = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
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
    
    // [修復點 2] loadImageToCanvas: 嚴格控制載入狀態
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); // 重置 Canvas 和狀態
        
        // 顯示載入狀態
        canvasWrapper.classList.add('loading-state');
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入圖片並初始化...';

        fabric.Image.fromURL(imgSource, function(img) {
            
            originalImage = img;
            
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            canvas.setBackgroundImage(img, function() {
                canvas.renderAll(); 
                
                addNewTextObject(); 
            
                downloadBtn.disabled = false;
                
                // 關鍵修復：載入和初始化完成，移除父容器上的載入標記
                loadingIndicator.style.display = 'none'; 
                canvasWrapper.classList.remove('loading-state'); // <-- 移除遮罩
                placeholder.textContent = ''; // <-- 清空提示文字
                placeholder.style.display = 'none'; // <-- 確保元素隱藏

            }, { 
                scaleX: 1, 
                scaleY: 1
            });

        }, { 
            crossOrigin: 'anonymous', 
            onError: function(err) {
                // 載入失敗處理
                loadingIndicator.style.display = 'none'; 
                canvasWrapper.classList.remove('loading-state'); // 失敗也要移除遮罩
                placeholder.textContent = "👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。";
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
        canvasWrapper.classList.add('loading-state');
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入暫存狀態...';

        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            
            // 載入完成，隱藏提示
            loadingIndicator.style.display = 'none'; 
            canvasWrapper.classList.remove('loading-state'); // <-- 移除遮罩
            placeholder.textContent = ''; 
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


    // --- 事件監聽器與初始化 (其餘保持不變) ---

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

    // 6. 持久化與下載事件 (略)
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
