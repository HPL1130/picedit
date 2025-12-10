document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素獲取
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontFamilyControl = document.getElementById('fontFamily');
    const fontSizeControl = document.getElementById('fontSize');
    const fontWeightControl = document.getElementById('fontWeight');
    const fontColorControl = document.getElementById('fontColor');
    const textOrientationControl = document.getElementById('textOrientation');
    const downloadFormatControl = document.getElementById('downloadFormat');
    const downloadBtn = document.getElementById('downloadBtn');
    const placeholder = document.getElementById('canvasPlaceholder');

    // 聲明為 let，以便在圖片載入時可以重新賦值 (用於記憶體優化)
    let canvas = null;
    let currentTextObject = null;
    let originalImage = null;

    // 輔助函數：初始化或重新初始化 Fabric Canvas
    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        // 如果舊的實例存在，先銷毀以釋放手機記憶體
        if (canvas) {
            canvas.clear();
            canvas.dispose();
        }
        
        // 創建新的 Fabric.js 實例
        canvas = new fabric.Canvas(canvasElement, {
            // 啟用所有指針事件，確保手機觸控可用
            enablePointerEvents: true 
        });
        
        // 重設狀態
        currentTextObject = null;
        originalImage = null;
    }

    // 將所有控制項的事件都綁定到這個函數，用於更新文字物件
    function updateTextProperties() {
        if (!currentTextObject) return;

        const orientation = textOrientationControl.value;
        const textValue = textInput.value || "請輸入文字";

        // 更新文字的內容和樣式
        currentTextObject.set({
            text: textValue,
            fontFamily: fontFamilyControl.value,
            fontSize: parseInt(fontSizeControl.value, 10),
            fill: fontColorControl.value,
            fontWeight: fontWeightControl.value,
            
            // 陰影設定
            shadow: '4px 4px 5px rgba(0,0,0,0.5)', 
            
            // 直式排版的核心處理：旋轉 90 度
            angle: orientation === 'vertical' ? 90 : 0, 
            
            // 處理多行文字寬度，讓文字物件可以被直式旋轉
            width: orientation === 'vertical' ? currentTextObject.fontSize * 1.5 : undefined,
            textAlign: 'center'
        });

        // 必須呼叫 renderAll 才能在 Canvas 上看到變化
        canvas.requestRenderAll();
    }
    
    // 初始化 Canvas (網頁剛載入時)
    initializeCanvas(); 

    // 載入圖片並初始化 Canvas
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 重新初始化 Canvas 實例以釋放舊圖片佔用的記憶體
        initializeCanvas(); 

        placeholder.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (event) => {
            
            // 使用 Fabric.js 載入圖片
            fabric.Image.fromURL(event.target.result, function(img) {
                originalImage = img;
                
                // 讓 Canvas 的尺寸與圖片尺寸一致 (確保匯出是高解析度)
                canvas.setDimensions({ 
                    width: img.width, 
                    height: img.height 
                });

                // 設置背景圖片
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: 1, 
                    scaleY: 1
                });
                
                // 創建或重設文字物件
                currentTextObject = new fabric.Text(textInput.value || '點擊我並輸入文字', {
                    left: img.width / 2, 
                    top: img.height / 2,
                    fill: fontColorControl.value,
                    fontSize: parseInt(fontSizeControl.value, 10),
                    textAlign: 'center',
                    originX: 'center', // 設定物件的中心點為 left/top 座標
                    originY: 'center',
                    
                    hasControls: true, 
                    lockScalingFlip: true 
                });
                
                canvas.add(currentTextObject);
                canvas.setActiveObject(currentTextObject);
                
                updateTextProperties(); // 套用當前的文字設定
                downloadBtn.disabled = false;
            });
        };
        reader.readAsDataURL(file);
    });

    // 綁定所有控制項事件到更新函數
    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', updateTextProperties);
        control.addEventListener('change', updateTextProperties);
    });

    // 下載按鈕事件
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) {
            alert("請先上傳圖片！");
            return;
        }
        
        // 必須先取消選中物件，否則會把控制框一起匯出
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
        
        // 重新選中物件，方便使用者繼續編輯
        canvas.setActiveObject(currentTextObject);
        canvas.renderAll();
    });
});
