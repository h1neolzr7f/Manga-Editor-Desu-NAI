function imageControlTogglePanel(panelId) {
var panel=$(panelId);
if (panel) {
var content=panel.querySelector('.controls-mini');
if (content) {
uiLogger.debug("imageControlTogglePanel hidden");
content.classList.toggle('hidden');
} else {
uiLogger.error('Element with class "control-content" not found in panel:',panelId);
}
} else {
uiLogger.error('Panel with ID not found:',panelId);
}
}
