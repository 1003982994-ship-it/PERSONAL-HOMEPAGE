param(
  [string]$SourceDir = "$env:USERPROFILE\Desktop",
  [string]$Pattern = "teacher-workbench-*.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$targetPath = Join-Path $projectRoot "public\workbench-data.json"

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

$latestExport = Get-ChildItem -LiteralPath $SourceDir -Filter $Pattern -File -Recurse |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestExport) {
  throw "No export file matching $Pattern was found in $SourceDir"
}

$raw = Get-Content -Raw -Encoding UTF8 -LiteralPath $latestExport.FullName
$data = $raw | ConvertFrom-Json

if (-not $data.records -or $data.records -isnot [array]) {
  throw "Export file is missing a records array: $($latestExport.FullName)"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetPath, $raw, $utf8NoBom)

$weeklySummaryCount = 0
if ($data.weeklySummaries -and $data.weeklySummaries.PSObject) {
  $weeklySummaryCount = @($data.weeklySummaries.PSObject.Properties).Count
}

Write-Host "Snapshot synced."
Write-Host "Source: $($latestExport.FullName)"
Write-Host "Target: $targetPath"
Write-Host "Records: $(@($data.records).Count)"
Write-Host "Weekly summaries: $weeklySummaryCount"
