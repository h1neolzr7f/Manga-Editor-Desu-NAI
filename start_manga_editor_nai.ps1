<#
  Manga Editor Desu · nai学长魔改版 本机服务启动器

  用户可见的行为：
  - 服务就在当前这个命令行窗口里前台运行，窗口不会一闪而过，启动信息看得见。
  - 服务就绪后自动打开 http://127.0.0.1:8000/index.html#
  - 关掉这个窗口 = 停止本机服务。本脚本启动的 python 挂在 Windows Job Object 上
    （JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE），窗口被强制关掉也不会留下孤儿进程。
  - 8000 端口上已经有本机服务在跑时，只打开浏览器并给出停止方法，不盲杀别人的进程。

  参数（都是可选的，不影响默认双击启动）：
  -NoBrowser  只启动服务，不自动打开浏览器
  -NoPrompt   失败时不弹提示框，只写控制台和 user_data\start.log，方便其他脚本调用
#>
param(
    [switch]$NoBrowser,
    [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8000
$ProbeUrl = "http://127.0.0.1:$Port/index.html"
$BrowserUrl = "http://127.0.0.1:$Port/index.html#"
$ToolsPort = 8765
$LogPath = Join-Path $Root "user_data\start.log"
$ToolsOutLog = Join-Path $Root "user_data\local_tools.log"
$ToolsErrLog = Join-Path $Root "user_data\local_tools.err.log"
$nl = [Environment]::NewLine

$script:ExitCode = 0
$script:OwnedProcesses = @()
$script:JobReady = $false
$script:OwnedServer = $false

Set-Location $Root

function Write-StartLog($Message) {
    try {
        $dir = Split-Path $LogPath
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
    } catch {
    }
}

function Write-StartLine($Message, $Color = "Gray") {
    Write-Host $Message -ForegroundColor $Color
    Write-StartLog $Message
}

function Show-Notice($Message, $Icon = "Warning") {
    if ($NoPrompt) { return }
    try {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show($Message, "Manga Editor Desu · nai学长魔改版", "OK", $Icon) | Out-Null
    } catch {
    }
}

# 让 python 的 stdout 不做块缓冲，否则启动信息会卡在缓冲区里看不见。
$env:PYTHONUNBUFFERED = "1"

function Resolve-Python {
    $candidates = @(
        (Join-Path $Root "runtime\python\python.exe"),
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

# 先确认 Python 真的能跑，免得后面只报一句"启动超时"。
function Test-PythonUsable($Path) {
    try {
        $output = & $Path -c "import sys; print(sys.version_info[0])" 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        return ([string]$output).Trim() -eq "3"
    } catch {
        return $false
    }
}

function Test-AppReady {
    try {
        $request = [System.Net.WebRequest]::Create($ProbeUrl)
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

function Get-PortOwner([int]$ListenPort) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess) { return [int]$conn.OwningProcess }
    } catch {
    }
    try {
        foreach ($line in (netstat -ano | Select-String -SimpleMatch (":" + $ListenPort))) {
            $text = [string]$line
            if ($text -match 'LISTENING\s+(\d+)\s*$') { return [int]$Matches[1] }
        }
    } catch {
    }
    return 0
}

function Describe-Process($ProcessId) {
    if (-not $ProcessId) { return "" }
    try {
        $info = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($info) { return ("PID {0} {1}" -f $info.Id, $info.ProcessName) }
    } catch {
    }
    return ("PID " + $ProcessId)
}

# --- Job Object：本窗口一关，连带结束本脚本启动的 python ---
$ConsoleJobSource = @'
using System;
using System.Runtime.InteropServices;

public static class ConsoleJob
{
    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    private const int JobObjectExtendedLimitInformation = 9;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
    private const uint PROCESS_SET_QUOTA = 0x0100;
    private const uint PROCESS_TERMINATE = 0x0001;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll")]
    private static extern bool SetInformationJobObject(IntPtr hJob, int infoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    private static IntPtr handle = IntPtr.Zero;

    public static bool Create()
    {
        if (handle != IntPtr.Zero)
        {
            return true;
        }
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero)
        {
            return false;
        }
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr buffer = Marshal.AllocHGlobal(size);
        bool ok;
        try
        {
            Marshal.StructureToPtr(info, buffer, false);
            ok = SetInformationJobObject(job, JobObjectExtendedLimitInformation, buffer, (uint)size);
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
        if (!ok)
        {
            CloseHandle(job);
            return false;
        }
        handle = job;
        return true;
    }

    public static bool AssignById(int processId)
    {
        if (handle == IntPtr.Zero)
        {
            return false;
        }
        IntPtr processHandle = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, false, processId);
        if (processHandle == IntPtr.Zero)
        {
            return false;
        }
        try
        {
            return AssignProcessToJobObject(handle, processHandle);
        }
        finally
        {
            CloseHandle(processHandle);
        }
    }
}
'@

function Initialize-ServerJob {
    try {
        Add-Type -TypeDefinition $ConsoleJobSource -ErrorAction Stop
        $script:JobReady = [ConsoleJob]::Create()
    } catch {
        $script:JobReady = $false
    }
    if ($script:JobReady) {
        Write-StartLog "job object ready (kill on close)"
    } else {
        Write-StartLog "job object unavailable, fallback to explicit taskkill"
    }
}

function Register-OwnedProcess($Process) {
    if (-not $Process) { return }
    $script:OwnedProcesses += $Process
    if ($script:JobReady) {
        if (-not [ConsoleJob]::AssignById($Process.Id)) {
            Write-StartLog ("assign to job failed pid={0} win32={1}" -f $Process.Id, [System.Runtime.InteropServices.Marshal]::GetLastWin32Error())
        }
    }
}

# 收尾：结束本脚本启动的进程树，再等端口真正释放。本机服务没有需要落盘的状态，直接 /F 结束。
function Stop-OwnedProcesses {
    if ($script:OwnedProcesses.Count -eq 0) { return }
    foreach ($proc in $script:OwnedProcesses) {
        try {
            if (-not $proc.HasExited) {
                & taskkill /PID $proc.Id /T /F 2>$null | Out-Null
            }
        } catch {
        }
        try { $proc.Dispose() } catch {
        }
    }
    $script:OwnedProcesses = @()
    for ($i = 0; $i -lt 20; $i++) {
        if (-not (Test-LocalPortOpen $Port)) { return }
        Start-Sleep -Milliseconds 150
    }
    Write-StartLine ("注意：{0} 端口仍被占用，请在任务管理器确认没有残留的 python.exe。" -f $Port) "Yellow"
}

function Open-Browser {
    if ($NoBrowser) {
        Write-StartLine "（-NoBrowser：不自动打开浏览器）"
        return
    }
    try {
        Start-Process $BrowserUrl
        Write-StartLine ("已打开浏览器： " + $BrowserUrl) "Green"
    } catch {
        Write-StartLine ("没能自动打开浏览器，请手动访问 " + $BrowserUrl) "Yellow"
    }
}

function Get-EnvValue($Name, $Default = $null) {
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

function Use-LocalProxyFallback {
    if ($env:HTTPS_PROXY -or $env:HTTP_PROXY) { return }
    foreach ($proxyPort in @(7897, 7890, 10809, 10808, 1080)) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $async = $client.BeginConnect("127.0.0.1", $proxyPort, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne(250)) {
                $client.EndConnect($async)
                $proxy = "http://127.0.0.1:$proxyPort"
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

$BundledNodeDir = Join-Path $Root "runtime\node"
if (Test-Path -LiteralPath (Join-Path $BundledNodeDir "node.exe")) {
    $env:PATH = $BundledNodeDir + ";" + $env:PATH
}

$script:EnvValues = Read-DotEnv (Join-Path $Root ".env")
Get-EnvValue "NOVELAI_API_KEY"
Get-EnvValue "TOKENDANCE_API_KEY"
Get-EnvValue "DIRECTOR_API_URL" "https://tokendance.space/gateway/v1/chat/completions"
Get-EnvValue "DIRECTOR_MODEL" "deepseek-v4-flash"

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

Write-StartLine ""
Write-StartLine "========================================" "DarkGray"
Write-StartLine "  Manga Editor Desu  ·  nai学长魔改版" "Cyan"
Write-StartLine "  致敬原作 new-sankaku / manga-editor-desu" "DarkGray"
Write-StartLine "========================================" "DarkGray"
Write-StartLine "  正在启动本机服务，启动过程会显示在这个窗口里。"
Write-StartLine ("  就绪后会自动打开浏览器： " + $BrowserUrl)
Write-StartLine "  不要双击 index.html，也不要直接访问 file:// 。"
Write-StartLine "  提示：关闭本窗口时，本机服务会一起停止。" "Yellow"
Write-StartLine "========================================" "DarkGray"
Write-StartLine ""
Initialize-ServerJob
$Python = Resolve-Python

try {
    Write-StartLog ("start python={0} root={1}" -f $Python, $Root)
    Write-StartLine ("Python : " + $Python)
    Write-StartLine ("地址   : " + $BrowserUrl)
    Write-StartLine ("日志   : " + $LogPath)

    if (-not (Test-PythonUsable $Python)) {
        Write-StartLine "没有找到能用的 Python 3，本机服务无法启动。" "Red"
        Write-StartLine "请安装 Python 3（安装时勾选 Add Python to PATH），或改用 EXE 安装版。" "Red"
        Show-Notice ("没有找到能用的 Python 3。" + $nl + $nl + "找过的位置：" + $nl + $Python + $nl + $nl + "请安装 Python 3 后重试，或改用 EXE 安装版。" + $nl + "日志：" + $LogPath) "Error"
        $script:ExitCode = 1
    }
    elseif (Test-AppReady) {
        Write-StartLine "8000 端口上已经有本机服务在运行（可能是之前打开的窗口启动、还没关掉）。" "Yellow"
        Write-StartLine "本窗口不会去结束别人的进程，所以关掉本窗口不会停止那个服务。" "Yellow"
        Write-StartLine "要停止服务，请关掉正在运行服务的那个命令行窗口；找不到就执行下面这条命令。" "Yellow"
        $owner = Get-PortOwner $Port
        if ($owner) {
            Write-StartLine ("强制结束：taskkill /PID " + $owner + " /T /F") "Yellow"
        }
        Write-StartLog "already running, open browser only"
        Open-Browser
    }
    elseif (Test-LocalPortOpen $Port) {
        Start-Sleep -Milliseconds 400
        if (Test-AppReady) {
            Write-StartLine "8000 端口上的本机服务刚好就绪，直接打开浏览器。" "Yellow"
            Write-StartLog "port open, app became ready"
            Open-Browser
        } else {
            $owner = Get-PortOwner $Port
            Write-StartLine ("8000 端口已被占用：" + (Describe-Process $owner)) "Red"
            Write-StartLine "但浏览器访问不到本编辑器页面，占用它的是别的程序。" "Red"
            if ($owner) {
                Write-StartLine ("结束它：taskkill /PID " + $owner + " /T /F") "Red"
            }
            Write-StartLine "关掉占用 8000 的程序后，再双击「一键启动.bat」。" "Red"
            Show-Notice ("8000 端口已被其他程序占用。请关掉占用该端口的程序后，再双击启动。" + $nl + $nl + (Describe-Process $owner)) "Warning"
            $script:ExitCode = 1
        }
    }
    else {
        Write-StartLine "正在启动本机服务，请稍等…" "Cyan"
        # 控制台只留启动信息，不刷每个请求的访问日志；99_server.py 未设该变量时日志照旧。
        $env:NAI_QUIET = "1"
        $server = Start-Process -FilePath $Python -ArgumentList "99_server.py" -WorkingDirectory $Root -NoNewWindow -PassThru
        $script:OwnedServer = $true
        Register-OwnedProcess $server
        Remove-Item Env:NAI_QUIET -ErrorAction SilentlyContinue
        Write-StartLog ("spawned 99_server pid=" + $server.Id)
        Write-StartLine ("服务进程 PID " + $server.Id + "（关掉本窗口会一起结束它）")

        $toolsScript = Join-Path $Root "local_tools\server.py"
        $toolsProcess = $null
        if (Test-Path -LiteralPath $toolsScript) {
            if (Test-LocalPortOpen $ToolsPort) {
                Write-StartLine ("抠图服务：已有实例在 " + $ToolsPort + " 端口，直接使用（本窗口不会结束它）。")
            } else {
                # 输出重定向后 python 不再走控制台宽字符接口，日志按 UTF-8 写
                $env:PYTHONIOENCODING = "utf-8"
                try {
                    $toolsProcess = Start-Process -FilePath $Python -ArgumentList ('"{0}"' -f $toolsScript) -WorkingDirectory (Join-Path $Root "local_tools") -NoNewWindow -PassThru -RedirectStandardOutput $ToolsOutLog -RedirectStandardError $ToolsErrLog
                } catch {
                    $toolsProcess = $null
                }
                Remove-Item Env:PYTHONIOENCODING -ErrorAction SilentlyContinue
                if ($toolsProcess) { Register-OwnedProcess $toolsProcess }
            }
        }

        $ready = $false
        for ($i = 0; $i -lt 30; $i++) {
            if ($server.HasExited) { break }
            Start-Sleep -Milliseconds 300
            if (Test-AppReady) {
                $ready = $true
                break
            }
        }

        if (-not $ready) {
            if ($server.HasExited) {
                Write-StartLine ("本机服务启动后立刻退出了（exit code " + $server.ExitCode + "）。") "Red"
            } else {
                Write-StartLine "本机服务没能启动（等待超时）。" "Red"
            }
            Write-StartLine ("请确认已安装 Python 3，并查看日志：" + $LogPath) "Red"
            Write-StartLog ("health check failed pid=" + $server.Id)
            Show-Notice ("本机服务没能启动。请确认已安装 Python 3。" + $nl + $nl + "Python: " + $Python + $nl + "日志: " + $LogPath) "Error"
            $script:ExitCode = 1
        } else {
            Write-StartLine "服务已就绪。" "Green"
            if ($toolsProcess -and -not $toolsProcess.HasExited) {
                Write-StartLine ("抠图服务：已启动（" + $ToolsPort + " 端口）。") "Green"
            } elseif ($toolsProcess) {
                Write-StartLine "抠图服务：没能启动，抠图/去背景不可用（其余功能正常）。日志：" "Yellow"
                Write-StartLine ("  " + $ToolsErrLog) "Yellow"
            }
            Open-Browser
            Write-StartLine ("服务运行中。关闭本窗口即可停止本机服务（端口 " + $Port + "）。") "Yellow"
            while (-not $server.HasExited) {
                Start-Sleep -Milliseconds 250
            }
            $serverExit = $null
            try { $serverExit = $server.ExitCode } catch {
            }
            if ($null -ne $serverExit -and $serverExit -ne 0) {
                Write-StartLine ("本机服务异常退出（exit code " + $serverExit + "），请看上面的输出和日志。") "Red"
                $script:ExitCode = 1
            } else {
                Write-StartLine "本机服务已停止。"
            }
        }
    }
} catch {
    Write-StartLog ("error: " + $_.Exception.Message)
    Write-StartLine ("启动失败：" + $_.Exception.Message) "Red"
    Write-StartLine ("日志：" + $LogPath) "Red"
    Show-Notice ("启动失败：" + $nl + $_.Exception.Message + $nl + $nl + "日志：" + $LogPath) "Error"
    $script:ExitCode = 1
} finally {
    Stop-OwnedProcesses
}

if ($script:ExitCode -ne 0) {
    Write-StartLine "启动没有成功，本窗口会停在这里方便你看上面的信息。" "Red"
} elseif ($script:OwnedServer) {
    Write-StartLine ("端口 " + $Port + " 已释放，现在可以关闭本窗口。") "Green"
} else {
    Write-StartLine "服务不是由本窗口启动的，关闭本窗口不会影响它。" "Yellow"
}
exit $script:ExitCode
