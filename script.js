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
    const placeholder = document.getElementById('canvasPlaceholder');
    // const defaultImageElement = document.getElementById('defaultImage'); // <-- 移除此行

    // 聲明為 let (保持不變)
    let canvas = null;
    let currentTextObject = null;
    let originalImage = null;

    // --- 輔助函數 (保持不變) ---

    function initializeCanvas() {
        const canvasElement = document.getElementById('imageCanvas');
        
        if (canvas) {
            canvas.clear();
            canvas.dispose(); 
        }
        
        // 創建新的 Fabric.js 實例
        canvas = new fabric.Canvas(canvasElement, {
            enablePointerEvents: true 
        });
        
        // 由於沒有預載圖片，Canvas 初始尺寸為 0，佔位符應該顯示
        placeholder.style.display = 'block'; 
        currentTextObject = null;
        originalImage = null;
        downloadBtn.disabled = true;
    }

    function updateTextProperties() {
        if (!currentTextObject) return;

        const orientation = textOrientationControl.value;
        const textValue = textInput.value || "請輸入文字";

        currentTextObject.set({
            text: textValue,
            fontFamily: fontFamilyControl.value,
            fontSize: parseInt(fontSizeControl.value, 10),
            fill: fontColorControl.value,
            fontWeight: fontWeightControl.value,
            shadow: '4px 4px 5px rgba(0,0,0,0.5)', 
            angle: orientation === 'vertical' ? 90 : 0, 
            width: orientation === 'vertical' ? currentTextObject.fontSize * 1.5 : undefined,
            textAlign: 'center'
        });
        canvas.requestRenderAll();
    }
    
    // 核心函數：載入圖片到 Canvas
    function loadImageToCanvas(imgSource) {
        initializeCanvas(); 

        placeholder.style.display = 'none';

        // 使用 Fabric.Image.fromURL 載入 Base64 數據
        fabric.Image.fromURL(imgSource, function(img) {
            originalImage = img;
            
            // 根據圖片尺寸設定 Canvas 尺寸
            canvas.setDimensions({ 
                width: img.width, 
                height: img.height 
            });

            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: 1, 
                scaleY: 1
            });
            
            // 創建文字物件
            currentTextObject = new fabric.Text(textInput.value || '點擊我並輸入文字', {
                left: img.width / 2, 
                top: img.height / 2,
                fill: fontColorControl.value,
                fontSize: parseInt(fontSizeControl.value, 10),
                textAlign: 'center',
                originX: 'center', 
                originY: 'center',
                hasControls: true, 
                lockScalingFlip: true 
            });
            
            canvas.add(currentTextObject);
            canvas.setActiveObject(currentTextObject);
            
            updateTextProperties(); 
            downloadBtn.disabled = false;
        }, { crossOrigin: 'anonymous' }); 
    }

    // --- 事件監聽器與初始化 ---

    // 1. 處理使用者上傳圖片
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            // 將 Base64 數據傳遞給載入函數
            loadImageToCanvas(event.target.result); 
        };
        reader.onerror = () => {
            alert("檔案讀取失敗，請確認檔案類型或大小。");
        };
        reader.readAsDataURL(file);
    });

    // 2. 網頁載入後立即執行初始化
    initializeCanvas(); 
    
    // 3. 綁定控制項事件 (保持不變)
    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', updateTextProperties);
        control.addEventListener('change', updateTextProperties);
    });

    // 4. 下載按鈕事件 (保持不變)
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
        
        canvas.setActiveObject(currentTextObject);
        canvas.renderAll();
    });
});
