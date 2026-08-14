#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

#ifndef SourceRoot
  #error SourceRoot must point to the prepared installer staging directory.
#endif

#define AppName "Manga Editor Desu - NovelAI Edition"
#define AppPublisher "nai学长"
#define AppURL "https://github.com/h1neolzr7f/Manga-Editor-Desu-NAI"

[Setup]
AppId={{0D4C958A-63D9-4B50-A13A-AE55EA4B455E}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL + "/issues"}
AppUpdatesURL={#AppURL + "/releases"}
DefaultDirName={localappdata}\Programs\Manga Editor Desu NAI
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=Manga-Editor-Desu-NAI-Setup-{#AppVersion}
SetupIconFile={#SourceRoot}\app.ico
UninstallDisplayIcon={app}\app.ico
LicenseFile={#SourceRoot}\LICENSE
InfoBeforeFile={#SourceRoot}\先看我.txt
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
MinVersion=10.0

[Languages]
Name: "chinesesimp"; MessagesFile: ".\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："; Flags: checkedonce

[Files]
Source: "{#SourceRoot}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\一键启动.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\一键启动.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\一键启动.bat"; WorkingDir: "{app}"; Description: "安装完成后启动漫画编辑器"; Flags: nowait postinstall skipifsilent shellexec
