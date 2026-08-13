
function getIconURL(iconName,style) {
switch (style) {
case 'outlined':
return `https://fonts.gstatic.com/s/i/materialiconsoutlined/${iconName}/v6/24px.svg`;
case 'rounded':
return `https://fonts.gstatic.com/s/i/materialiconsround/${iconName}/v6/24px.svg`;
case 'twotone':
return `https://fonts.gstatic.com/s/i/materialiconstwotone/${iconName}/v6/24px.svg`;
default:
return `https://fonts.gstatic.com/s/i/materialicons/${iconName}/v6/24px.svg`;
}
}

function getFallbackIconSvg(iconName) {
var safeName=(iconName||'icon').replace(/[^a-z0-9_-]/gi,'');
var shapes={
favorite:'<path d="M12 21s-7-4.6-9.5-8.2C.2 9.4 2.1 5 6.1 5c2 0 3.4 1.1 4.2 2.3C11.1 6.1 12.5 5 14.5 5c4 0 5.9 4.4 3.6 7.8C15.6 16.4 12 21 12 21z"/>',
star_rate:'<path d="M12 2l3 6.4 7 .7-5.2 4.8 1.5 6.9L12 17.2 5.7 20.8l1.5-6.9L2 9.1l7-.7L12 2z"/>',
warning:'<path d="M12 3l10 18H2L12 3zm-1 6v6h2V9h-2zm0 8v2h2v-2h-2z"/>',
error:'<circle cx="12" cy="12" r="10"/><path d="M11 6h2v8h-2zM11 16h2v2h-2z" fill="#fff"/>',
bolt:'<path d="M13 2L4 14h7l-1 8 10-13h-7l0-7z"/>',
mood:'<circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="10" r="1.2" fill="#fff"/><circle cx="15.5" cy="10" r="1.2" fill="#fff"/><path d="M7 14c1.3 2 3 3 5 3s3.7-1 5-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'
};
return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-fallback-icon="'+safeName+'">'+
(shapes[safeName]||'<path d="M4 4h16v16H4z"/><path d="M7 7h10v10H7z" fill="#fff"/>')+
'</svg>';
}

function fetchIconSvg(iconName,style) {
const iconURL=getIconURL(iconName,style);
return fetch(iconURL)
.then(response=>response.ok?response.text():null)
.catch(()=>null)
.then(svgContent=>svgContent||getFallbackIconSvg(iconName));
}

function searchInitialIcons() {
const resultsDiv=$('svg_icon_results');
resultsDiv.innerHTML='';
const style=$('svg_icon_iconStyle').value;

initialIcons.forEach(iconName=>{
const iconURL=getIconURL(iconName,style);
fetchIconSvg(iconName,style)
.then(svgContent=>{
if (svgContent) {
//   console.log(`Fetched SVG content (${iconName}):`, svgContent);
displaySVG(svgContent,iconURL,iconName);
}
});
});
}

document.addEventListener('DOMContentLoaded',()=>{
searchInitialIcons();
});


function searchIcon() {
const query=$('svg_icon_searchInput').value.toLowerCase();
const resultsDiv=$('svg_icon_results');
resultsDiv.innerHTML='';
const style=$('svg_icon_iconStyle').value;

if (!query) {
searchInitialIcons();
return;
}

const matchedIcons=iconList.filter(iconName=>iconName.includes(query));

if (matchedIcons.length>0) {
matchedIcons.forEach(iconName=>{
const iconURL=getIconURL(iconName,style);
fetchIconSvg(iconName,style)
.then(svgContent=>{
if (svgContent) {
//   console.log(`Fetched SVG content (${iconName}):`, svgContent);
displaySVG(svgContent,iconURL,iconName);
}
});
});
} else {
const noResultsDiv=document.createElement('div');
noResultsDiv.textContent='No icons found!';
resultsDiv.appendChild(noResultsDiv);
}
}


function displaySVG(svgContent,iconURL,iconName) {

const resultsDiv=$('svg_icon_results');
const svgElement=document.createElement('div');
svgElement.innerHTML=svgContent;
svgElement.className='icon-result';
svgElement.addEventListener('click',()=>addToCanvas(iconURL,iconName));
resultsDiv.appendChild(svgElement);

const svg=svgElement.querySelector('svg');
removeUnnecessaryElements(svg);
updateSVGElementStyles(svg);
}

function updateSVGElementStyles(svgElement) {
const lineColor=$('svg_icon_lineColor').value;
const fillColor=$('svg_icon_fillColor').value;
const fillOpacity=parseFloat($('svg_icon_fillOpacity').value);
const lineWidth=parseInt($('svg_icon_lineWidth').value,10);

svgElement.setAttribute('stroke',lineColor);
svgElement.setAttribute('fill',fillColor);
svgElement.setAttribute('fill-opacity',fillOpacity);
svgElement.setAttribute('stroke-width',lineWidth);
}

function updateSVGStyles() {
const iconResults=document.querySelectorAll('.icon-result svg');
iconResults.forEach(svgElement=>{
updateSVGElementStyles(svgElement);
});
}

function removeUnnecessaryElements(svgElement) {
const unnecessaryPaths=svgElement.querySelectorAll('path[d="M0 0h24v24H0z"], path[d="M0,0h24v24H0V0z"], path[d="M0 0h24v24H0V0z"], path[d="M0 0h24v24H0V0zm0 0h24v24H0V0z"]');
unnecessaryPaths.forEach(path=>path.remove());
const unnecessaryRects=svgElement.querySelectorAll('rect[fill="none"][height="24"][width="24"]');
unnecessaryRects.forEach(rect=>rect.remove());
}

function addToCanvas(iconURL,iconName) {
const lineColor=$('svg_icon_lineColor').value;
const fillColor=$('svg_icon_fillColor').value;
const fillOpacity=parseFloat($('svg_icon_fillOpacity').value);
const lineWidth=parseInt($('svg_icon_lineWidth').value,10);
const shadowColor=$('svg_icon_shadowColor').value;
const shadowBlur=parseInt($('svg_icon_shadowBlur').value,10);
const shadowOffsetX=parseInt($('svg_icon_shadowOffsetX').value,10);
const shadowOffsetY=parseInt($('svg_icon_shadowOffsetY').value,10);

var style=$('svg_icon_iconStyle')?$('svg_icon_iconStyle').value:'filled';
fetchIconSvg(iconName,style)
.then(svgContent=>{
const parser=new DOMParser();
const svgDoc=parser.parseFromString(svgContent,'image/svg+xml');
const svgElement=svgDoc.documentElement;

// Remove unnecessary <path> and <rect> elements
removeUnnecessaryElements(svgElement);

svgElement.setAttribute('stroke',lineColor);
svgElement.setAttribute('fill',fillColor);
svgElement.setAttribute('fill-opacity',fillOpacity);
svgElement.setAttribute('stroke-width',lineWidth);

const serializer=new XMLSerializer();
const newSvgContent=serializer.serializeToString(svgElement);
uiLogger.debug("newSvgContent",newSvgContent);

// Add to Fabric.js canvas
fabric.loadSVGFromString(newSvgContent,function (objects,options) {
const obj=fabric.util.groupSVGElements(objects,options);
obj.set({
left: 50,
top: 50,
shadow: new fabric.Shadow({
color: shadowColor,
blur: shadowBlur,
offsetX: shadowOffsetX,
offsetY: shadowOffsetY
}),
isIcon: true,
name: iconName,
originalSvg: newSvgContent
});
obj.scaleToWidth(50);
canvas.setActiveObject(obj);
canvas.add(obj).renderAll();
});
})
.catch(error=>uiLogger.error(`Error fetching SVG: ${error}`));
}
