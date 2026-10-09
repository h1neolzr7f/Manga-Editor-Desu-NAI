function openWindow(url) {
var width=700;
var height=700;
var left=(screen.width/2)-(width/2);
var top=(screen.height/2)-(height/2);
window.open(url,'ShareWindow','toolbar=no, location=no, status=no, menubar=no, scrollbars=no, resizable=no, width='+width+', height='+height+', top='+top+', left='+left);
}

