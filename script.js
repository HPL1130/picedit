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
    
    // [新增] 獲取間距和透明度控制項
    const charSpacingControl = document.getElementById('charSpacing');
    const opacityControl = document.getElementById('opacity');

    const STORAGE_KEY = 'image_editor_state';

    let canvas = null;
    let currentTextObject = null;
    let originalImage = null;
    let fontsLoaded = false;
    
    // --- 資料持久化函數 ---

    function saveCanvasState() {
        if (!canvas) return;
        
        canvas.discardActiveObject();
        canvas.renderAll();
        
        try {
            // 將整個 Canvas 狀態轉換為 JSON 字串並儲存
            const json = canvas.toJSON(['backgroundImage', 'objects']);
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
            
            // 重新建立 currentTextObject 引用 (只找第一個文字物件)
            const textObj = canvas.getObjects().find(obj => obj.type === 'text');
            if (textObj) {
                currentTextObject = textObj;
                canvas.setActiveObject(currentTextObject);
                deleteTextBtn.disabled = false;
                
                // 更新控制項狀態以匹配載入的物件
                textInput.value = currentTextObject.text;
                fontFamilyControl.value = currentTextObject.fontFamily;
                fontSizeControl.value = currentTextObject.fontSize;
                fontColorControl.value = currentTextObject.fill;
                fontWeightControl.value = currentTextObject.fontWeight;
                textOrientationControl.value = currentTextObject.angle === 90 ? 'vertical' : 'horizontal';
                
                // [新增] 載入間距和透明度值
                charSpacingControl.value = currentTextObject.charSpacing || 0;
                opacityControl.value = currentTextObject.opacity * 100 || 100;

            } else {
                deleteTextBtn.disabled = true;
            }
            alert('暫存狀態已成功載入！');
        }, function(o, object) {
            if (object && object.type === 'image') {
                originalImage = object; 
            }
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
            enablePointerEvents: true 
        });
        
        placeholder.style.display = 'block'; 
        placeholder.innerHTML = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        loadingIndicator.style.display = 'none'; 
        currentTextObject = null;
        originalImage = null;
        downloadBtn.disabled = true;
        deleteTextBtn.disabled = true; 
    }

    // [核心修改] updateTextProperties 函數 - 加入間距和透明度屬性
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
        
        // [關鍵] 獲取新的屬性值
        const newCharSpacing = parseInt(charSpacingControl.value, 10);
        const newOpacity = parseFloat(opacityControl.value / 100);

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
            
            // [關鍵] 應用新的屬性
            charSpacing: newCharSpacing, 
            opacity: newOpacity,
            
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
    
    // 核心函數：載入圖片到 Canvas (保持不變)
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 

        placeholder.style.display = 'block'; 
        loadingIndicator.style.display = 'block'; 
        placeholder.textContent = '正在載入圖片並初始化...';


        fabric.Image.fromURL(imgSource, function(img) {
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

    // 1. [Web Font] 等待字體載入完成，再進行初始化
    document.fonts.ready.then(() => {
        fontsLoaded = true;
        console.log("Web Fonts 載入完成！");
        initializeCanvas(); 
        checkLocalStorage();
    }).catch(err => {
        console.error("Web Fonts 載入失敗，使用系統字體。", err);
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
        reader.onerror = () => {
            alert("檔案讀取失敗，請確認檔案類型或大小。");
        };
        reader.readAsDataURL(file);
    });

    // 3. 綁定控制項事件 (新增間距和透明度控制項)
    [
        textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, 
        textOrientationControl, charSpacingControl, opacityControl 
    ].forEach(control => {
        control.addEventListener('input', updateTextProperties);
        control.addEventListener('change', updateTextProperties);
    });

    // 4. [持久化] 儲存與載入事件
    saveStateBtn.addEventListener('click', saveCanvasState);
    loadStateBtn.addEventListener('click', loadCanvasState);

    // 5. 刪除按鈕事件處理
    deleteTextBtn.addEventListener('click', () => {
        if (currentTextObject && confirm("確定要移除目前的文字物件嗎？")) {
            canvas.remove(currentTextObject);
            currentTextObject = null;
            canvas.renderAll();
            textInput.value = ""; 
            deleteTextBtn.disabled = true;
        }
    });

    // 6. 下載按鈕事件
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
