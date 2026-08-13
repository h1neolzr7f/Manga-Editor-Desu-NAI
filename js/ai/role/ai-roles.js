// NovelAI-only role definitions.
const AI_ROLES={
Text2Image: "Text2Image",
Image2Image: "Image2Image",
Image2Prompt_DEEPDOORU: "Image2Prompt_DEEPDOORU",
Image2Prompt_CLIP: "Image2Prompt_CLIP",
RemoveBG: "RemoveBG",
ADetailer: "ADetailer",
Upscaler: "Upscaler",
Inpaint: "Inpaint",
PutPrompt: "PutPrompt",
PutSeed: "PutSeed",
I2I_Angle: "I2I_Angle",
Temp: "Temp",
};

const roles={
NOVELAI: [
AI_ROLES.Text2Image,
AI_ROLES.Image2Image
]
};

const ROLE_ASSIGNABLE_ROLES=[
AI_ROLES.Text2Image,
AI_ROLES.Image2Image
];

function hasNotRole(role) {
return!(hasRole(role));
}

function hasRole(role) {
if(providerRegistry.getProviderForRole(role)!==null){
return true;
}
return false;
}
