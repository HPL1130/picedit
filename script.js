document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素獲取
    const imageLoader = document.getElementById('imageLoader');
    const textInput = document.getElementById('textInput');
    const fontFamilyControl = document.getElementById('fontFamily'); // 新增
    const fontSizeControl = document.getElementById('fontSize');
    const fontColorControl = document.getElementById('fontColor');
    const textXControl = document.getElementById('textX'); // 新增
    const textYControl = document.getElementById('textY'); // 新增
    const downloadFormatControl = document.getElementById('downloadFormat'); // 新增
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('imageCanvas');
    const placeholder = document.getElementById('canvasPlaceholder');
    const ctx = canvas.getContext('2d');

    let uploadedImage = new Image();

    // 繪製所有的元素到 Canvas 上
    function drawCanvas() {
        if (!uploadedImage.src) return;

        // 1. 設定 Canvas 尺寸與圖片一致
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        
        // 2. 繪製圖片
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // 3. 繪製文字
        const text = textInput.value || "在此輸入文字";
        
        // 獲取所有控制項的值
        const fontFamily = fontFamilyControl.value; // 字型
        const fontSize = parseInt(fontSizeControl.value, 10);
        const fontColor = fontColorControl.value;
        const textXPercent = parseFloat(textXControl.value) / 100; // X 座標 (百分比轉小數)
        const textYPercent = parseFloat(textYControl.value) / 100; // Y 座標 (百分比轉小數)
        
        // 計算實際像素座標
        const x = canvas.width * textXPercent;
        const y = canvas.height * textYPercent;

        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px ${fontFamily}`; // 套用字型
        ctx.textAlign = 'center'; // 文字對齊方式
        ctx.textBaseline = 'middle';

        // 處理多行文字
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.2; // 行高
        
        // 計算起始 Y 座標，使其整體居中於 Y 座標點
        let currentY = y - (lines.length - 1) * lineHeight / 2; 

        lines.forEach(line => {
            // 繪製文字描邊/陰影，使其更清晰
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.fillText(line, x, currentY);
            
            // 清除陰影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            currentY += lineHeight;
        });

        downloadBtn.disabled = false;
    }

    // --- 事件監聽器 ---

    // 圖片載入事件
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage.onload = () => {
                placeholder.style.display = 'none';
                canvas.style.display = 'block';
                drawCanvas();
            };
            uploadedImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 編輯器設定變更事件 (監聽所有控制項)
    [textInput, fontFamilyControl, fontSizeControl, fontColorControl, textXControl, textYControl].forEach(control => {
        control.addEventListener('input', drawCanvas);
    });

    // 下載按鈕事件
    downloadBtn.addEventListener('click', () => {
        if (!uploadedImage.src) {
            alert("請先上傳圖片！");
            return;
        }
        
        // 獲取選擇的格式
        const format = downloadFormatControl.value; 
        let dataURL;

        if (format === 'image/jpeg') {
            // JPEG 格式通常需要指定品質 (0.0 - 1.0)
            dataURL = canvas.toDataURL('image/jpeg', 0.9); 
        } else {
            // 預設為 PNG
            dataURL = canvas.toDataURL('image/png'); 
        }

        const link = document.createElement('a');
        const fileExtension = format.split('/')[1]; // 取得 png 或 jpeg
        
        // 設置下載檔案名稱
        link.download = `圖像創意文字-${Date.now()}.${fileExtension}`; 
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
