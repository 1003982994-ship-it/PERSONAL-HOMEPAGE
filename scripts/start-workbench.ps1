$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $root "vite-dev-live.log"
$errLog = Join-Path $root "vite-dev-live.err.log"
$url = "http://127.0.0.1:5173/"

Set-Location $root

function Test-Port {
    param([int]$Port)

    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $connected = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $connected.AsyncWaitHandle.WaitOne(300)) {
            $client.Close()
            return $false
        }
        $client.EndConnect($connected)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
    npm install
}

if (-not (Test-Port -Port 5173)) {
    $escapedRoot = $root.Replace("'", "''")
    $escapedLog = $log.Replace("'", "''")
    $command = @"
`$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath '$escapedRoot'
npm run dev -- --host 127.0.0.1 *> '$escapedLog'
"@
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encodedCommand) `
        -WorkingDirectory $root `
        -WindowStyle Hidden
}

for ($i = 0; $i -lt 30; $i++) {
    if (Test-Port -Port 5173) {
        Start-Process $url
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "Workbench did not start in time. Check $errLog"
exit 1
