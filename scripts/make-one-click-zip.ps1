# Build a beginner zip without git history, secrets, or machine caches.
param(
    [string]$Version = "1.0.3",
    [switch]$SkipDesktop
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Name = "Manga-Editor-Desu-NAI-$Version"
$Desktop = [Environment]::GetFolderPath("Desktop")
$OutDir = Join-Path $Root "dist"
$Staging = Join-Path $env:TEMP ("desu-nai-pack-" + [guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $OutDir ($Name + ".zip")
$DesktopZip = if ($Desktop) { Join-Path $Desktop ($Name + ".zip") } else { "" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path $Staging | Out-Null

$excludeDirs = @(
    ".git",
    ".playwright-cli",
    ".pytest_cache",
    ".claude",
    "node_modules",
    "user_data",
    "outputs",
    "dist",
    "__pycache__",
    "llm_doc",
    "roadmap",
    "99_doc",
    "test",
    ".github"
)
$excludeFiles = @(".env", ".DS_Store")

Get-ChildItem -LiteralPath $Root -Directory | ForEach-Object {
    if ($_.Name -like "*API*" -or $_.Name -like "*roadmap*") {
        $excludeDirs += $_.Name
    }
}

$dest = Join-Path $Staging $Name
$robocopyArgs = @($Root, $dest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP", "/XD") + $excludeDirs + @("/XF") + $excludeFiles
& robocopy @robocopyArgs | Out-Null
$rc = $LASTEXITCODE
# robocopy uses 0–7 as success (1 = files copied). GitHub Actions treats a leftover
# native exit code as the step result, so clear it after a successful copy.
if ($rc -ge 8) { throw "robocopy failed with code $rc" }
$global:LASTEXITCODE = 0

if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
Compress-Archive -Path $dest -DestinationPath $ZipPath -CompressionLevel Optimal
if (-not $SkipDesktop -and $DesktopZip -and (Test-Path -LiteralPath $Desktop)) {
    Copy-Item -LiteralPath $ZipPath -Destination $DesktopZip -Force
}
Remove-Item -LiteralPath $Staging -Recurse -Force

Write-Host "one-click zip:"
Write-Host "  $ZipPath"
if (-not $SkipDesktop -and $DesktopZip -and (Test-Path -LiteralPath $DesktopZip)) {
    Write-Host "  $DesktopZip"
}
exit 0
