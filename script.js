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

    // 1. 初始化 Fabric.js Canvas
    const canvasElement = document.getElementById('imageCanvas');
    const canvas = new fabric.Canvas(canvasElement);

    let currentTextObject = null;
    let originalImage = null;

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
            
            // 簡化陰影設定 (Fabric.js 內建)
            shadow: '4px 4px 5px rgba(0,0,0,0.5)', 
            
            // 直式排版的核心處理
            angle: orientation === 'vertical' ? 90 : 0, // 旋轉 90 度
            // 如果是直式，文字寬度應該很小
            width: orientation === 'vertical' ? currentTextObject.fontSize * 1.5 : undefined 
        });

        canvas.requestRenderAll();
    }

    // 載入圖片並初始化 Canvas
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

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

                // 清空 Canvas 並設置背景圖片
                canvas.clear();
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: 1, // 不縮放，讓 Canvas 顯示圖片原始大小
                    scaleY: 1
                });
                
                // 如果是第一次載入，新增文字物件
                if (!currentTextObject) {
                    currentTextObject = new fabric.Text('點擊我並輸入文字', {
                        left: img.width / 2, // 初始位置
                        top: img.height / 2,
                        fill: fontColorControl.value,
                        fontSize: parseInt(fontSizeControl.value, 10),
                        textAlign: 'center',
                        originX: 'center', // 讓物件中心點作為 left/top
                        originY: 'center',
                        
                        // 讓使用者可以拖曳和縮放
                        hasControls: true, 
                        lockScalingFlip: true 
                    });
                    canvas.add(currentTextObject);
                } else {
                    // 如果圖片更新，重新設定文字位置
                    currentTextObject.set({ left: img.width / 2, top: img.height / 2 });
                    canvas.add(currentTextObject);
                }
                
                canvas.setActiveObject(currentTextObject);
                updateTextProperties();
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
        
        // 確保文字物件被取消選擇，以避免控制框被匯出
        canvas.discardActiveObject(); 
        canvas.renderAll();

        const format = downloadFormatControl.value; 
        let dataURL;
        let fileExtension = format.split('/')[1];

        if (format === 'image/jpeg') {
            dataURL = canvas.toDataURL({
                format: 'jpeg',
                quality: 0.9
            }); 
        } else {
            dataURL = canvas.toDataURL({
                format: 'png'
            }); 
        }

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
