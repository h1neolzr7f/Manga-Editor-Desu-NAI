
const CJK_CHAR_RE = /[\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
const LATIN_ONLY_TOAST_COOLDOWN_MS = 4000;
let lastLatinOnlyToastAt = 0;

const CJK_SYSTEM_FONTS = [
  { name: "Microsoft YaHei", aliases: ["Microsoft YaHei", "微软雅黑"] },
  { name: "Microsoft YaHei UI", aliases: ["Microsoft YaHei UI", "微软雅黑 UI"] },
  { name: "SimHei", aliases: ["SimHei", "黑体"] },
  { name: "SimSun", aliases: ["SimSun", "宋体"] },
  { name: "NSimSun", aliases: ["NSimSun", "新宋体"] },
  { name: "KaiTi", aliases: ["KaiTi", "楷体"] },
  { name: "FangSong", aliases: ["FangSong", "仿宋"] },
  { name: "YouYuan", aliases: ["YouYuan", "幼圆"] },
  { name: "LiSu", aliases: ["LiSu", "隶书"] },
  { name: "STXingkai", aliases: ["STXingkai", "华文行楷"] },
  { name: "STCaiyun", aliases: ["STCaiyun", "华文彩云"] },
  { name: "STHupo", aliases: ["STHupo", "华文琥珀"] },
  { name: "STLiti", aliases: ["STLiti", "华文隶书"] },
  { name: "STXinwei", aliases: ["STXinwei", "华文新魏"] },
  { name: "STZhongsong", aliases: ["STZhongsong", "华文中宋"] },
  { name: "DengXian", aliases: ["DengXian", "等线"] },
  { name: "Microsoft JhengHei", aliases: ["Microsoft JhengHei", "微軟正黑體"] },
  { name: "MingLiU", aliases: ["MingLiU", "細明體"] },
  { name: "PMingLiU", aliases: ["PMingLiU", "新細明體"] },
  { name: "DFKai-SB", aliases: ["DFKai-SB", "標楷體"] },
  { name: "Yu Gothic", aliases: ["Yu Gothic", "YuGothic"] },
  { name: "Yu Mincho", aliases: ["Yu Mincho", "YuMincho"] },
  { name: "Meiryo", aliases: ["Meiryo"] },
  { name: "MS Gothic", aliases: ["MS Gothic"] },
  { name: "MS Mincho", aliases: ["MS Mincho"] },
  { name: "MS PGothic", aliases: ["MS PGothic"] },
  { name: "MS PMincho", aliases: ["MS PMincho"] },
  { name: "Malgun Gothic", aliases: ["Malgun Gothic"] },
  { name: "Noto Sans SC", aliases: ["Noto Sans SC", "NotoSansSC"] },
  { name: "Noto Sans TC", aliases: ["Noto Sans TC", "NotoSansTC"] },
  { name: "Noto Sans JP", aliases: ["Noto Sans JP", "NotoSansJP"] },
  { name: "Noto Sans KR", aliases: ["Noto Sans KR", "NotoSansKR"] },
  { name: "Noto Serif SC", aliases: ["Noto Serif SC", "NotoSerifSC"] },
  { name: "Noto Serif TC", aliases: ["Noto Serif TC", "NotoSerifTC"] },
  { name: "Noto Serif JP", aliases: ["Noto Serif JP", "NotoSerifJP"] },
  { name: "ZCOOL KuaiLe", aliases: ["ZCOOL KuaiLe"] },
  { name: "ZCOOL XiaoWei", aliases: ["ZCOOL XiaoWei"] },
  { name: "ZCOOL QingKe HuangYou", aliases: ["ZCOOL QingKe HuangYou"] },
  { name: "Ma Shan Zheng", aliases: ["Ma Shan Zheng"] },
  { name: "Zhi Mang Xing", aliases: ["Zhi Mang Xing"] },
  { name: "Liu Jian Mao Cao", aliases: ["Liu Jian Mao Cao"] },
  { name: "Long Cang", aliases: ["Long Cang"] },
  { name: "Zen Maru Gothic", aliases: ["Zen Maru Gothic"] },
  { name: "Zen Kaku Gothic New", aliases: ["Zen Kaku Gothic New"] },
  { name: "Sawarabi Gothic", aliases: ["Sawarabi Gothic"] },
  { name: "Sawarabi Mincho", aliases: ["Sawarabi Mincho"] },
  { name: "Kosugi Maru", aliases: ["Kosugi Maru"] },
  { name: "Kosugi", aliases: ["Kosugi"] },
  { name: "M PLUS 1p", aliases: ["M PLUS 1p"] },
  { name: "M PLUS Rounded 1c", aliases: ["M PLUS Rounded 1c"] }
];

function fontClassName(fontName) {
  return String(fontName || "").replace(/[^\w\u4e00-\u9fff-]/g, "_");
}

function hasCjkChars(text) {
  return CJK_CHAR_RE.test(text || "");
}

let fmFontData = {
  UserFont: {
   color: "#9f4aff",
   fonts: [],
  },
  CJKFont: {
   color: "#ff6bb5",
   fonts: [
    { name: "Microsoft YaHei", scripts: "cjk" },
    { name: "Microsoft YaHei UI", scripts: "cjk" },
    { name: "SimHei", scripts: "cjk" },
    { name: "SimSun", scripts: "cjk" },
    { name: "NSimSun", scripts: "cjk" },
    { name: "KaiTi", scripts: "cjk" },
    { name: "FangSong", scripts: "cjk" },
    { name: "YouYuan", scripts: "cjk" },
    { name: "LiSu", scripts: "cjk" },
    { name: "STXingkai", scripts: "cjk" },
    { name: "STCaiyun", scripts: "cjk" },
    { name: "STHupo", scripts: "cjk" },
    { name: "STLiti", scripts: "cjk" },
    { name: "STXinwei", scripts: "cjk" },
    { name: "STZhongsong", scripts: "cjk" },
    { name: "DengXian", scripts: "cjk" },
    { name: "Microsoft JhengHei", scripts: "cjk" },
    { name: "MingLiU", scripts: "cjk" },
    { name: "PMingLiU", scripts: "cjk" },
    { name: "DFKai-SB", scripts: "cjk" },
    { name: "Klee One", bundled: true, scripts: "cjk" },
    { name: "DotGothic16", bundled: true, scripts: "cjk" },
    { name: "851_MkPOP", bundled: true, scripts: "cjk" },
    { name: "Chalk", bundled: true, scripts: "cjk" },
    { name: "Ohisama", bundled: true, scripts: "cjk" },
    { name: "DokiDokiFantasia", bundled: true, scripts: "cjk" },
    { name: "Rampart One", bundled: true, scripts: "cjk" },
    { name: "Stick", bundled: true, scripts: "cjk" },
    { name: "Train One", bundled: true, scripts: "cjk" },
    { name: "851_YOWAKU", bundled: true, scripts: "cjk" },
    { name: "851_KAKUKAKU", bundled: true, scripts: "cjk" },
    { name: "851_DZUYOKU", bundled: true, scripts: "cjk" }
   ],
  },
  QuoteFont: {
   color: "#4a9eff",
   fonts: [
    { name: "Arial Narrow" },
    { name: "Klee One", bundled: true, scripts: "cjk" },
    { name: "ZCOOL KuaiLe" },
    { name: "ZCOOL XiaoWei" },
    { name: "Do Hyeon" },
    { name: "East Sea Dokdo" },
    { name: "Architects Daughter" },
    { name: "Comic Neue" },
    { name: "Zen Maru Gothic" },
    { name: "Verdana" },
    { name: "Malgun Gothic" },
    { name: "KleeOne" },
    { name: "Century Gothic" },
    { name: "Yu Gothic" },
    { name: "Meiryo" },
    { name: "Segoe UI" },
    { name: "Arial" },
    { name: "Tahoma" },
    { name: "Trebuchet MS" },
    { name: "Calibri" },
    { name: "Cambria" },
    { name: "Candara" },
    { name: "Century" },
    { name: "Consolas" },
    { name: "Constantia" },
    { name: "Corbel" },
    { name: "Ebrima" },
    { name: "Gabriola" },
    { name: "Gadugi" },
    { name: "Georgia" },
    { name: "Lucida Console" },
    { name: "Lucida Sans Unicode" },
    { name: "Microsoft Sans Serif" },
    { name: "MS Sans Serif" },
    { name: "MS Serif" },
    { name: "Palatino Linotype" },
    { name: "Segoe Print" },
    { name: "Segoe Script" },
    { name: "SimSun" },
    { name: "YuGothic" },
    { name: "YuMincho" },
    { name: "Meiryo UI" },
    { name: "UD Digi Kyokasho NK-R" },
    { name: "UDDigiKyokashoN-R" },
    { name: "Roboto" },
    { name: "Open Sans" },
    { name: "Lato" },
    { name: "Montserrat" },
    { name: "Source Sans Pro" },
    { name: "Raleway" },
    { name: "PT Sans" },
    { name: "Noto Sans" },
    { name: "Nunito" },
    { name: "Ubuntu" },
    { name: "Noto Sans JP" },
    { name: "M PLUS 1p" },
    { name: "M PLUS Rounded 1c" },
    { name: "Sawarabi Gothic" },
    { name: "Kosugi Maru" },
    { name: "Kosugi" },
    { name: "Zen Kaku Gothic New" },
    { name: "Noto Sans KR" },
    { name: "Nanum Gothic" },
    { name: "Gugi" },
    { name: "Hi Melody" },
    { name: "Poor Story" },
    { name: "Noto Sans SC" },
    { name: "Noto Sans TC" },
    { name: "Gothic A1" },
    { name: "Noto Sans HK" }
   ],
  },
  DescriptionFont: {
   color: "#4aff4a",
   fonts: [
    { name: "Times New Roman" },
    { name: "Yu Mincho" },
    { name: "Helvetica" },
    { name: "Franklin Gothic Medium" },
    { name: "Courier" },
    { name: "Courier New" },
    { name: "MS Mincho" },
    { name: "MS PMincho" },
    { name: "HGMinchoE" },
    { name: "HGPMinchoE" },
    { name: "Noto Serif JP" },
    { name: "Sawarabi Mincho" },
    { name: "Shippori Mincho" },
    { name: "Zen Old Mincho" },
    { name: "Kaisei Decol" },
    { name: "Kaisei Opti" },
    { name: "Kaisei Tokumin" },
    { name: "Nanum Myeongjo" },
    { name: "Song Myung" },
    { name: "Noto Serif SC" },
    { name: "Noto Serif TC" },
    { name: "Ma Shan Zheng" },
    { name: "Zhi Mang Xing" },
    { name: "Liu Jian Mao Cao" },
    { name: "Noto Serif Korean" },
    { name: "Cormorant Garamond" },
    { name: "Garamond" },
    { name: "Baskerville" }
   ],
  },
  OnomatopoeiaFont: {
   color: "#ff4a4a",
   fonts: [
    { name: "Bangers", bundled: true, scripts: "latin" },
    { name: "Impact", scripts: "latin" },
    { name: "851_DZUYOKU", bundled: true, scripts: "cjk" },
    { name: "851_YOWAKU", bundled: true, scripts: "cjk" },
    { name: "851_KAKUKAKU", bundled: true, scripts: "cjk" },
    { name: "851_MkPOP", bundled: true, scripts: "cjk" },
    { name: "Arial Black" },
    { name: "HGGothicE" },
    { name: "HGGyoshotai" },
    { name: "HGKyokashotai" },
    { name: "HGMaruGothicMPRO" },
    { name: "HGPGothicE" },
    { name: "HGPGyoshotai" },
    { name: "HGPKyokashotai" },
    { name: "HGPSoeiKakugothicUB" },
    { name: "HGPSoeiKakupoptai" },
    { name: "HGSeikaishotaiPRO" },
    { name: "HGSoeiKakugothicUB" },
    { name: "HGSoeiKakupoptai" },
    { name: "Black Han Sans" },
    { name: "ZCOOL QingKe HuangYou" },
    { name: "Didot" },
    { name: "Deutsche Zierschrift" },
    { name: "Anton" },
    { name: "Russo One" },
    { name: "Black Ops One" },
    { name: "Luckiest Guy" },
    { name: "Creepster" },
    { name: "Segoe UI Black" },
    { name: "Yu Gothic" },
    { name: "Meiryo" },
    { name: "STXingkai" },
    { name: "LiSu" },
    { name: "YouYuan" },
    { name: "FZShuTi" }
   ],
  },
  CustomFont: {
   color: "#ff9f4a",
   fonts: [
    { name: "DotGothic16", bundled: true, scripts: "cjk" },
    { name: "Chalk", bundled: true, scripts: "cjk" },
    { name: "Rampart One", bundled: true, scripts: "cjk" },
    { name: "Stick", bundled: true, scripts: "cjk" },
    { name: "Train One", bundled: true, scripts: "cjk" },
    { name: "Kalam", bundled: true, scripts: "latin" },
    { name: "DokiDokiFantasia", bundled: true, scripts: "cjk" },
    { name: "Ohisama", bundled: true, scripts: "cjk" },
    { name: "Bungee Shade" },
    { name: "Rubik Mono One" },
    { name: "Permanent Marker" },
    { name: "Comic Sans MS" },
    { name: "MS Gothic" },
    { name: "MS PGothic" },
    { name: "Webdings" },
    { name: "Wingdings" },
    { name: "Batang" },
    { name: "BatangChe" },
    { name: "Dotum" },
    { name: "DotumChe" },
    { name: "Gulim" },
    { name: "GulimChe" },
    { name: "Gungsuh" },
    { name: "GungsuhChe" },
    { name: "DFKai-SB" },
    { name: "FangSong" },
    { name: "KaiTi" },
    { name: "Microsoft JhengHei" },
    { name: "Microsoft YaHei" },
    { name: "MingLiU" },
    { name: "NSimSun" },
    { name: "PMingLiU" },
    { name: "SimHei" },
    { name: "SimKai" },
    { name: "Fraktur" },
    { name: "Long Cang" },
    { name: "Petit Formal Script" },
    { name: "Alte Schwabacher" }
   ],
  }
 };
 const fontManager = {
  existsFont(fontName) {
    return Object.keys(fmFontData).some(key => 
      fmFontData[key].fonts.some(font => font.name === fontName)
    );
  },

  async init() {
    fmFontRepository.init();
    await this.loadSavedFonts();
    await this.setUserFontData();
  },

  async setUserFontData() {
    const userFonts = await this.getFontList();
    fmFontData["UserFont"].fonts = userFonts.map(font => ({
      name: font.name,
      type: font.type,
      url: font.url
    }));
  },

  async loadSavedFonts() {
    const fonts = await fmFontRepository.getAllFonts();
    for (const font of fonts) {
      await this.loadFont(font);
    }
  },

  async loadFont(fontData) {
    try {
      let fontFace;
      if (fontData.type === "upload") {
        fontFace = new FontFace(fontData.name, fontData.buffer);
      } else if (fontData.type === "local") {
        fontFace = new FontFace(fontData.name, `local("${fontData.name}")`);
      } else if (fontData.type === "web") {
        await this.loadWebFontStylesheet(fontData.url);
        return;
      }
      if (fontFace) {
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);
      }
      this.addFontOption(fontData);
    } catch (error) {
      fontLogger.error(fontData.name, error);
    }
  },

  async addFontOption(fontData) {
    const id = `fm-font-${fontData.name}`;
    if (!$(id)) {
      const fontArray = await this.getFontList();
      if (!fontArray.some((font) => font.name === fontData.name)) {
        const fontOption = document.createElement("option");
        fontOption.id = id;
        fontOption.value = fontData.name;
        fontOption.textContent = fontData.name;
        fontOption.style.fontFamily = fontData.name;
        fontOption.dataset.type = fontData.type;
        $("fm-userFontGroup").appendChild(fontOption);

        fmFontData["UserFont"].fonts.push({
          name: fontData.name,
          type: fontData.type,
          url: fontData.url
        });
      }
    }
  },

  async getFontList() {
    return await fmFontRepository.getAllFonts();
  },

  async registerLocalFont() {
    const fontNames = $("fm-localFontInput")
        .value.trim()
        .split("\n")
        .filter((name) => name.trim());

    for (const fontName of fontNames) {
        if (this.existsFont(fontName)) {
            createToastError(getText("alreadyRegisteredFont"), fontName);
            continue;
        }
        
        const fontVariants = [
            fontName,
            fontName.replace(/\s+/g, ''),
            fontName.split(' ').join(''),
            fontName.replace(/[^\x00-\x7F]/g, '').trim()
        ];

        let loaded = false;
        for (const variant of fontVariants) {
            if (loaded) break;
            
            try {
                const fontFace = new FontFace(fontName, `local("${variant}")`);
                await fontFace.load();
                document.fonts.add(fontFace);
                await fmFontRepository.saveLocalFont(fontName);
                this.addFontOption({ name: fontName, type: "local" });
                loaded = true;
            } catch (error) {
                fontLogger.error(`${variant}`, error);
                if (variant === fontVariants[fontVariants.length - 1]) {
                    createToastError("Register font is error", error);
                }
            }
        }
    }

    await this.setUserFontData();
    FontSelectorManager.reloadAll();
    fmUserFontManager.updateFontList();
    $("fm-localFontInput").value = "";
},



  async registerWebFont(url = null) {
    const urls = url
      ? [url]
      : $("fm-webFontUrlInput")
        .value.trim()
        .split("\n")
        .filter((url) => url.trim());
    for (const fontUrl of urls) {
      try {
        const fontMatch = fontUrl.match(/family=([^&]+)/);
        if (!fontMatch) throw new Error(i18next.t("error.invalidUrl"));
        const fontName = fontMatch[1].split(":")[0];
        
        if (this.existsFont(fontName)) {
          createToastError(getText("alreadyRegisteredFont"), fontName);
          continue;
        }

        await this.loadWebFontStylesheet(fontUrl);
        await fmFontRepository.saveWebFont(fontName, fontUrl);
        this.addFontOption({ name: fontName, type: "web", url: fontUrl });
      } catch (error) {
        fontLogger.error(fontUrl, error);
      }
    }
    await this.setUserFontData();
    FontSelectorManager.reloadAll();
    fmUserFontManager.updateFontList();
    if (!url) $("fm-webFontUrlInput").value = "";
  },

  async loadWebFontStylesheet(url) {
    const linkElement = document.createElement("link");
    linkElement.href = url;
    linkElement.rel = "stylesheet";
    return new Promise((resolve, reject) => {
      linkElement.onload = resolve;
      linkElement.onerror = reject;
      document.head.appendChild(linkElement);
    });
  },

  async registerFontFromBuffer(buffer, fontName) {
    if (this.existsFont(fontName)) {
      createToastError(getText("alreadyRegisteredFont"), fontName);
      return;
    }

    try {
      const fontFace = new FontFace(fontName, buffer);
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      await fmFontRepository.saveUploadedFont(fontName, buffer);
      this.addFontOption({ name: fontName, type: "upload" });
      await this.setUserFontData();
      FontSelectorManager.reloadAll();
      fmUserFontManager.updateFontList();
    } catch (error) {
      fontLogger.error(fontName, error);
    }
  },

  async unregisterFont(fontData) {
    // console.log("unregisterFont fontData", JSON.stringify(fontData));
    await fmFontRepository.deleteFont(fontData.value);

    const userFonts = fmFontData["UserFont"].fonts;
    const index = userFonts.findIndex(font => font.name === fontData.value);
    if (index !== -1) {
      userFonts.splice(index, 1);
    }
    FontSelectorManager.reloadAll();
  },

  _fontManagerFocusTrap:null,
  openUserFontManager() {
    if (!$("fm-fontManagerModal")) {
      fmUserFontManager.createModal();
    }
    $("fm-modalOverlay").style.display = "block";
    $("fm-fontManagerModal").style.display = "block";
    fmUserFontManager.updateFontList();
    var modal=$("fm-fontManagerModal");
    if(modal){
      this._fontManagerFocusTrap=FocusTrap.create(modal,()=>this.closeUserFontManager());
      FocusTrap.activate(this._fontManagerFocusTrap);
    }
  },

  closeUserFontManager() {
    FocusTrap.deactivate(this._fontManagerFocusTrap);
    this._fontManagerFocusTrap=null;
    $("fm-modalOverlay").style.display = "none";
    $("fm-fontManagerModal").style.display = "none";
  },

  defaultFont: "Klee One",

  getDefaultFont() {
    return this.defaultFont || "Klee One";
  },

  getSelectedFont(id) {
    const el = $("fm-selected-font-" + id);
    const currentFont = el ? String(el.textContent || "").trim() : "";
    if (!currentFont || currentFont === "Font") {
      return this.getDefaultFont();
    }
    return currentFont;
  },

  getFontMeta(fontName) {
    for (const data of Object.values(fmFontData)) {
      const found = data.fonts.find((font) => font.name === fontName);
      if (found) return found;
    }
    return null;
  },

  resolveTextObject(obj) {
    if (!obj) return null;
    if (typeof isSpeechBubbleSVG === "function" && isSpeechBubbleSVG(obj) &&
        typeof getSpeechBubbleTextBySVG === "function") {
      return getSpeechBubbleTextBySVG(obj) || null;
    }
    if (typeof isText === "function" && isText(obj)) return obj;
    return null;
  },

  applyFontToObject(obj, fontName) {
    const textObj = this.resolveTextObject(obj);
    if (!textObj || !fontName) return false;
    textObj.set("fontFamily", fontName);
    if (textObj.styles) {
      Object.keys(textObj.styles).forEach((lineKey) => {
        const line = textObj.styles[lineKey];
        if (!line) return;
        Object.keys(line).forEach((charKey) => {
          if (line[charKey]) {
            line[charKey].fontFamily = fontName;
          }
        });
      });
    }
    textObj.set("dirty", true);
    if (typeof textObj.initDimensions === "function") textObj.initDimensions();
    if (typeof textObj.updateDimensions === "function") textObj.updateDimensions();
    if (typeof textObj.setCoords === "function") textObj.setCoords();
    return true;
  },

  applyToActiveObject(fontName) {
    if (typeof canvas === "undefined" || !canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const targets = (active.type === "activeSelection" && active.getObjects)
      ? active.getObjects()
      : [active];
    let applied = null;
    targets.forEach((obj) => {
      if (this.applyFontToObject(obj, fontName)) {
        applied = this.resolveTextObject(obj) || applied;
      }
    });
    const meta = this.getFontMeta(fontName);
    if (applied && meta && meta.scripts === "latin" && hasCjkChars(applied.text)) {
      const now = Date.now();
      if (now - lastLatinOnlyToastAt > LATIN_ONLY_TOAST_COOLDOWN_MS &&
          typeof createToast === "function") {
        lastLatinOnlyToastAt = now;
        createToast(getText("fontLatinOnlyTitle"), getText("fontLatinOnlyBody"), 2800);
      }
    }
    canvas.requestRenderAll();
  },
  
};



const FontDetector = {
  ctx: null,
  missingName: "ThisIsDefinitelyNotAFont__CJK",
  latinSample: "aGgR",
  cjkSample: "嵌字永",

  init() {
    let probeCanvas = document.getElementById("testCanvas");
    if (!probeCanvas) {
      probeCanvas = document.createElement("canvas");
      probeCanvas.id = "testCanvas";
      probeCanvas.width = 200;
      probeCanvas.height = 48;
      probeCanvas.style.display = "none";
      document.body.appendChild(probeCanvas);
    }
    this.ctx = probeCanvas.getContext("2d", { willReadFrequently: true });
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "left";
  },

  getTextData(fontName, sample) {
    if (!this.ctx) this.init();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#000";
    ctx.font = `22px "${fontName}"`;
    ctx.fillText(sample, 8, 24);
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
  },

  looksDifferent(a, b) {
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] ||
          a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
        return true;
      }
    }
    return false;
  },

  analyze(fontName) {
    const latin = this.looksDifferent(
      this.getTextData(fontName, this.latinSample),
      this.getTextData(this.missingName, this.latinSample)
    );
    const cjk = this.looksDifferent(
      this.getTextData(fontName, this.cjkSample),
      this.getTextData(this.missingName, this.cjkSample)
    );
    return { latin, cjk, available: latin || cjk };
  }
};

async function probeLocalFont(entry) {
  try {
    const src = entry.aliases.map((alias) => `local("${alias}")`).join(", ");
    const face = new FontFace(`${entry.name}\u200bProbe`, src);
    await face.load();
    return true;
  } catch (error) {
    return false;
  }
}

async function registerLocalCjkFaces() {
  const loaded = new Set();
  for (const entry of CJK_SYSTEM_FONTS) {
    if (await probeLocalFont(entry)) {
      loaded.add(entry.name);
      try {
        const src = entry.aliases.map((alias) => `local("${alias}")`).join(", ");
        const face = new FontFace(entry.name, src);
        const loadedFace = await face.load();
        document.fonts.add(loadedFace);
      } catch (error) {
        fontLogger.error(entry.name, error);
      }
    }
  }
  return loaded;
}

function pickDefaultLetteringFont() {
  const preferred = [
    "Microsoft YaHei",
    "Microsoft YaHei UI",
    "Klee One",
    "SimHei",
    "DengXian",
    "SimSun"
  ];
  const available = new Set();
  Object.values(fmFontData).forEach((group) => {
    group.fonts.forEach((font) => {
      if (font.scripts === "cjk" || font.bundled) available.add(font.name);
    });
  });
  for (const name of preferred) {
    if (available.has(name)) return name;
  }
  return "Klee One";
}

async function filterAvailableFonts(fontData) {
  FontDetector.init();
  const knownCjk = await registerLocalCjkFaces();
  const filteredData = {};
  const seen = new Set();

  for (const [groupName, data] of Object.entries(fontData)) {
    const fonts = [];
    for (const font of data.fonts) {
      if (seen.has(font.name) && groupName !== "UserFont") continue;
      if (font.bundled) {
        font.scripts = font.scripts || "cjk";
        fonts.push(font);
        seen.add(font.name);
        continue;
      }
      const analysis = FontDetector.analyze(font.name);
      const known = knownCjk.has(font.name);
      if (!analysis.available && !known) continue;
      // Pixel CJK tests are noisy: Latin fonts still change fallback metrics.
      // Only trust local() probes and bundled faces for 嵌字 coverage.
      font.scripts = known ? "cjk" : "latin";
      fonts.push(font);
      seen.add(font.name);
    }
    filteredData[groupName] = { color: data.color, fonts };
  }
  return filteredData;
}

async function fontInit() {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    fmFontData = await filterAvailableFonts(fmFontData);
    fontManager.defaultFont = pickDefaultLetteringFont();
  } catch (error) {
    fontLogger.error("Font initialization error:", error);
    fontManager.defaultFont = "Klee One";
  }
}
 