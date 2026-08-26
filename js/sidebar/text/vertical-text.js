
document.addEventListener('DOMContentLoaded',function() {
openButton=$("verticalText");
openButton.addEventListener("click",function () {
var selectedFont=fontManager.getSelectedFont("fontSelector");;
var fontsize=$("fontSizeSlider").value
var fontStrokeWidth=$("fontStrokeWidthSlider").value


const selectedValue=getSelectedValueByGroup("align_group");
let style={
top: 50,
left: 50,
fontSize: parseInt(fontsize,10)||32,
fontFamily: selectedFont,
fill: (typeof letteringPaintColor==="function"?letteringPaintColor("textColorPicker"):$("textColorPicker").value)||"rgba(0,0,0,1)",
stroke: typeof letteringPaintColor==="function"?letteringPaintColor("textOutlineColorPicker"):$("textOutlineColorPicker").value,
strokeWidth: parseInt(fontStrokeWidth,10)||0,
textBackgroundColor: typeof letteringPaintColor==="function"?letteringPaintColor("textBgColorPicker"):$("textBgColorPicker").value,
textAlign: selectedValue,

cornerSize: 8,
transparentCorners: false,
cornerStyle: 'circle',
borderScaleFactor: 2,
padding: 10,

};

const cjkText=new VerticalTextbox("new",style);
canvas.add(cjkText);
canvas.setActiveObject(cjkText);
canvas.renderAll();
});
});

fabric.VerticalTextbox=VerticalTextbox;