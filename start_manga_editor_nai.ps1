$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8000
$Url = "http://127.0.0.1:$Port/index.html"
$Python = "python"

Set-Location $Root

function Show-Notice($Message, $Icon = "Warning") {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($Message, "Manga Editor Desu", "OK", $Icon) | Out-Null
}

function Test-AppReady {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return ($response.StatusCode -eq 200 -and $response.Content -like "*Manga Editor*")
    } catch {
        return $false
    }
}

function Stop-ExistingLocalServer {
    $servers = @(Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and $_.CommandLine -match '(^|[\\/\s"])99_server\.py($|[\s"])'
    })
    foreach ($server in $servers) {
        try {
            Stop-Process -Id $server.ProcessId -Force -ErrorAction Stop
        } catch {
        }
    }
}

function Read-DotEnv($Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) { return $values }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
        $idx = $line.IndexOf("=")
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        if ($key) { $values[$key] = $value }
    }
    return $values
}

function Use-EnvValue($Name, $Default = $null) {
    if ($script:EnvValues[$Name]) {
        Set-Item -Path "Env:$Name" -Value $script:EnvValues[$Name]
        return
    }
    $userValue = [Environment]::GetEnvironmentVariable($Name, "User")
    if ($userValue) {
        Set-Item -Path "Env:$Name" -Value $userValue
        return
    }
    if ($Default) {
        Set-Item -Path "Env:$Name" -Value $Default
    }
}

function Use-LocalProxyFallback {
    if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { return }
    foreach ($port in @(7897, 7890, 10809, 10808, 1080)) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect("127.0.0.1", $port, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne(250)) {
                $client.EndConnect($async)
                $proxy = "http://127.0.0.1:$port"
                $env:HTTPS_PROXY = $proxy
                $env:HTTP_PROXY = $proxy
                $client.Close()
                return
            }
            $client.Close()
        } catch {
        }
    }
}

$script:EnvValues = Read-DotEnv (Join-Path $Root ".env")
Use-EnvValue "NOVELAI_API_KEY"
Use-EnvValue "TOKENDANCE_API_KEY"
Use-EnvValue "DIRECTOR_API_URL" "https://tokendance.space/gateway/v1/chat/completions"
Use-EnvValue "DIRECTOR_MODEL" "deepseek-v4-flash"

try {
    $internetSettings = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
    if ($internetSettings.ProxyEnable -and $internetSettings.ProxyServer) {
        $proxyServer = [string]$internetSettings.ProxyServer
        if ($proxyServer.Contains("=")) {
            $parts = @{}
            $proxyServer.Split(";") | ForEach-Object {
                if ($_.Contains("=")) {
                    $p = $_.Split("=", 2)
                    $parts[$p[0].Trim().ToLowerInvariant()] = $p[1].Trim()
                }
            }
            $proxyServer = $parts["https"]
            if (-not $proxyServer) { $proxyServer = $parts["http"] }
            if (-not $proxyServer) { $proxyServer = $parts["socks"] }
        }
        if ($proxyServer -and -not $proxyServer.Contains("://")) {
            $proxyServer = "http://$proxyServer"
        }
        if ($proxyServer) {
            $env:HTTPS_PROXY = $proxyServer
            $env:HTTP_PROXY = $proxyServer
        }
    }
} catch {
}
Use-LocalProxyFallback

Stop-ExistingLocalServer
Start-Sleep -Milliseconds 300

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
    $ownerPid = ($listeners | Select-Object -First 1).OwningProcess
    Show-Notice "Port $Port is already used by another program. Close it, then start Manga Editor Desu again.`n`nPID: $ownerPid"
    exit 1
}

$process = Start-Process -FilePath $Python -ArgumentList "99_server.py" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
$toolsScript = Join-Path $Root "local_tools\server.py"
if (Test-Path -LiteralPath $toolsScript) {
    $existingTools = @(Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and $_.CommandLine -match 'local_tools[\\/]server\.py'
    })
    if (-not $existingTools) {
        Start-Process -FilePath $Python -ArgumentList "`"$toolsScript`"" -WorkingDirectory (Join-Path $Root "local_tools") -WindowStyle Hidden | Out-Null
    }
}

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 300
    if (Test-AppReady) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    Show-Notice "Local service failed to start. Check whether Python is available.`n`nPID: $($process.Id)" "Error"
    exit 1
}

Start-Process $Url
