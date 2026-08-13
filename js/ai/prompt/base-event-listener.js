function bindBasePromptChange(id,handler){
var el=$(id);
if(el)$on(el,'change',handler);
}
bindBasePromptChange('basePrompt_prompt',(e)=>{basePrompt.text2img_prompt=e.target.value;});
bindBasePromptChange('basePrompt_negative',(e)=>{basePrompt.text2img_negative=e.target.value;});
bindBasePromptChange('basePrompt_width',(e)=>{basePrompt.text2img_width=e.target.value;});
bindBasePromptChange('basePrompt_height',(e)=>{basePrompt.text2img_height=e.target.value;});
bindBasePromptChange('basePrompt_seed',(e)=>{basePrompt.text2img_seed=e.target.value;});
