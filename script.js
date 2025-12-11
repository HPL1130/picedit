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
    
    const DEFAULT_CANVAS_WIDTH = 600;
    const DEFAULT_CANVAS_HEIGHT = 400;

    // --- 輔助函數 ---

    function showPlaceholder(message, showLoadingIndicator = false) {
        if (!placeholder.parentNode) {
            canvasWrapper.appendChild(placeholder);
        }
        
        canvasWrapper.classList.add('loading-state');
        placeholder.style.display = 'flex'; 

        let indicatorHTML = '';
        if (showLoadingIndicator) {
            indicatorHTML = '<span style="color: #007bff; margin-top: 10px; font-weight: bold;">正在載入...</span>';
        }
        placeholder.innerHTML = message + indicatorHTML;
    }

    function hidePlaceholder() {
        canvasWrapper.classList.remove('loading-state');
        placeholder.style.display = 'none'; 
        placeholder.innerHTML = ''; 
    }
    
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
            angle: textAngle,
            shadow: '4px 4px 5px rgba(0,0,0,0.5)',
            stroke: '#000000',
            strokeWidth: 2,
        });

        activeObject.setCoords(); 
        canvas.requestRenderAll(); 
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
            selection: true,
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT 
        });
        
        // 🚨 修正點 1: 確保在 selection:created 事件中檢查 e.selected 是否存在
        canvas.on({
            'selection:created': (e) => toggleControls(e.selected ? e.selected[0] : null),
            'selection:updated': (e) => toggleControls(e.selected ? e.selected[0] : null),
            'selection:cleared': () => toggleControls(null),
            'object:modified': (e) => {
                if (e.target && e.target.type === 'text') {
                     syncControlsFromObject(e.target);
                }
            }
        });
        
        canvasWrapper.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
        canvasWrapper.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;

        const initialMessage = fontsLoaded 
            ? '👆 請先選擇一張圖片，然後點擊文字進行拖曳'
            : '正在載入字體，請稍候...';
            
        showPlaceholder(initialMessage, false); 
        
        if (fontsLoaded) {
            showPlaceholder('👆 請先選擇一張圖片，然後點擊文字進行拖曳', false); 
        }
            
        originalImage = null;
        downloadBtn.disabled = true;
        
        toggleControls(null);
        
        textInput.value = '請選中 Canvas 上的物件進行編輯';
    }
    
    function addNewTextObject() {
        if (!canvas || !originalImage) {
            alert('請先載入圖片！');
            return;
        }
        
        const newText = new fabric.Text("新增的文字",
