let svgHttp="http://www.w3.org/2000/svg";
const baseStylesDefault="";

function createSvgElement(type) {
return document.createElementNS(svgHttp,type);
}
function setAttributes(element,attrs) {
Object.entries(attrs).forEach(([key,value])=>
element.setAttribute(key,value)
);
}

function createFilterElement(type,attrs,children=[]) {
const element=createSvgElement(type);
setAttributes(element,attrs);
children.forEach((child)=>{
const childElement=createSvgElement(child.type);
setAttributes(childElement,child.attrs);
element.appendChild(childElement);
});
return element;
}


function getFirstNCharsDefault(textarea) {
return getFirstNChars(textarea,20);
}

function getFirstNChars(textarea,maxChars) {
if (!textarea.value) return '';
return textarea.value.replace(/\n/g,' ').slice(0,maxChars);
}