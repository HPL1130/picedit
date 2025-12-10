document.addEventListener('DOMContentLoaded', () => {
    // 獲取所有 DOM 元素 (與之前一致)
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

    let canvas = null;
    let currentTextObject = null;
    let originalImage = null;

    // --- 輔助函數 ---

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

        placeholder.style.display = 'block'; // 載入開始時顯示載入中...

        // 使用 Fabric.Image.fromURL 載入 Base64 數據
        fabric.Image.fromURL(imgSource, function(img) {
            // == 載入成功時執行 ==
            console.log("Fabric.js 圖片載入成功！"); 
            
            originalImage = img;
            
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
            placeholder.style.display = 'none'; // 載入成功後隱藏

        }, { 
            crossOrigin: 'anonymous', 
            // [新增] 載入失敗的回調函數，用於明確診斷錯誤
            onError: function(err) {
                console.error("Fabric.js 載入 Base64 數據失敗！請檢查圖片檔案是否損壞或過大。", err);
                placeholder.textContent = "👆 載入失敗！請確認圖片格式 (PNG/JPG) 及檔案大小 (建議小於 5MB)。";
            }
        }); 
    }

    // --- 事件監聽器與初始化 ---

    // 1. 處理使用者上傳圖片
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 如果檔案超過 5MB，給予警告 (常見的手機限制)
        if (file.size > 5 * 1024 * 1024) {
            alert("警告：圖片檔案超過 5MB，手機上可能載入失敗。請嘗試較小的圖片。");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // [關鍵] 將 Base64 數據傳遞給載入函數
            loadImageToCanvas(event.target.result); 
        };
        reader.onerror = () => {
            alert("檔案讀取失敗，請確認檔案類型或大小。");
        };
        reader.readAsDataURL(file);
    });

    // 2. 網頁載入後立即執行初始化
    initializeCanvas(); 
    
    // 3. 綁定控制項事件
    [textInput, fontFamilyControl, fontSizeControl, fontWeightControl, fontColorControl, textOrientationControl].forEach(control => {
        control.addEventListener('input', updateTextProperties);
        control.addEventListener('change', updateTextProperties);
    });

    // 4. 下載按鈕事件
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
