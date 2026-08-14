$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8000
$Url = "http://127.0.0.1:$Port/index.html"
function Resolve-Python {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe")
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    try {
        $fromPy = & py -3 -c "import sys; print(sys.executable)" 2>$null
        if ($fromPy -and (Test-Path -LiteralPath $fromPy.Trim())) { return $fromPy.Trim() }
    } catch {
    }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -and $cmd.Source -notmatch 'WindowsApps') { return $cmd.Source }
    return "python"
}

$Python = Resolve-Python
$LogPath = Join-Path $Root "user_data\start.log"

Set-Location $Root

function Write-StartLog($Message) {
    try {
        $dir = Split-Path $LogPath
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
    } catch {
    }
}

function Show-Notice($Message, $Icon = "Warning") {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($Message, "Manga Editor Desu · nai学长魔改版", "OK", $Icon) | Out-Null
}

function Test-AppReady {
    try {
        $request = [System.Net.WebRequest]::Create($Url)
        $request.Proxy = [System.Net.GlobalProxySelection]::GetEmptyWebProxy()
        $request.Timeout = 3000
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        return ($body -like "*nai学长魔改*")
    } catch {
        return $false
    }
}

function Test-LocalPortOpen([int]$ListenPort) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect("127.0.0.1", $ListenPort, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(250)
        if ($ok) { $client.EndConnect($async) | Out-Null }
        $client.Close()
        return [bool]$ok
    } catch {
        return $false
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
$env:NO_PROXY = "127.0.0.1,localhost,::1"

$nl = [Environment]::NewLine

try {
    Write-StartLog "start python=$Python root=$Root"

    if (Test-AppReady) {
        Write-StartLog "already running, open browser"
        Start-Process $Url
        exit 0
    }

    if (Test-LocalPortOpen $Port) {
        Start-Sleep -Milliseconds 400
        if (Test-AppReady) {
            Write-StartLog "port open, app became ready"
            Start-Process $Url
            exit 0
        }
        Show-Notice "8000 端口已被其他程序占用。请关掉占用该端口的程序后，再双击启动。"
        exit 1
    }

    $process = Start-Process -FilePath $Python -ArgumentList "99_server.py" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
    Write-StartLog "spawned 99_server pid=$($process.Id)"
    $toolsScript = Join-Path $Root "local_tools\server.py"
    if (Test-Path -LiteralPath $toolsScript) {
        Start-Process -FilePath $Python -ArgumentList "`"$toolsScript`"" -WorkingDirectory (Join-Path $Root "local_tools") -WindowStyle Hidden | Out-Null
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
        Write-StartLog "health check failed pid=$($process.Id)"
        Show-Notice ("本地服务没能启动。请确认已安装 Python 3。" + $nl + $nl + "Python: " + $Python + $nl + "日志: " + $LogPath) "Error"
        exit 1
    }

    Write-StartLog "ready, open $Url"
    Start-Process $Url
} catch {
    Write-StartLog ("error: " + $_.Exception.Message)
    Show-Notice ("启动失败：" + $nl + $_.Exception.Message + $nl + $nl + "日志：" + $LogPath) "Error"
    exit 1
}
