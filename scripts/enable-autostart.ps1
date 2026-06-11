$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$starter = Join-Path $root "scripts\start-workbench.ps1"
$taskName = "Teacher Workbench"

try {
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starter`""

    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Start the local teacher workbench after Windows sign-in." `
        -Force | Out-Null

    Write-Host "Autostart enabled with Task Scheduler for $taskName."
} catch {
    $startup = [Environment]::GetFolderPath("Startup")
    $shortcutPath = Join-Path $startup "Teacher Workbench.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starter`""
    $shortcut.WorkingDirectory = $root
    $shortcut.IconLocation = "powershell.exe,0"
    $shortcut.Save()

    Write-Host "Autostart enabled with Startup folder shortcut: $shortcutPath"
}
