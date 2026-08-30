param(
    [Parameter(Mandatory = $true)]
    [string] $Target
)

$ErrorActionPreference = "Stop"

$source = [System.IO.Path]::GetFullPath(
    [System.IO.Path]::Combine($PSScriptRoot, "..", "assets", "starter-workspace")
)
$targetPath = [System.IO.Path]::GetFullPath($Target)
$targetRoot = [System.IO.Path]::GetPathRoot($targetPath)
$userRoot = [System.IO.Path]::GetFullPath([Environment]::GetFolderPath("UserProfile"))

if (-not [System.IO.Directory]::Exists($source)) {
    throw "Starter workspace not found: $source"
}

if ($targetPath -eq $targetRoot -or $targetPath -eq $userRoot) {
    throw "Refusing broad target: $targetPath"
}

if (-not [System.IO.Directory]::Exists($targetPath)) {
    throw "Target directory must already exist: $targetPath"
}

$files = Get-ChildItem -LiteralPath $source -Recurse -File
$collisions = foreach ($file in $files) {
    $relative = $file.FullName.Substring($source.Length + 1)
    $destination = [System.IO.Path]::Combine($targetPath, $relative)
    if ([System.IO.File]::Exists($destination)) {
        $relative
    }
}

if ($collisions.Count -gt 0) {
    throw "Refusing to overwrite existing files: $($collisions -join ', ')"
}

foreach ($file in $files) {
    $relative = $file.FullName.Substring($source.Length + 1)
    $destination = [System.IO.Path]::Combine($targetPath, $relative)
    $destinationDirectory = [System.IO.Path]::GetDirectoryName($destination)
    [System.IO.Directory]::CreateDirectory($destinationDirectory) | Out-Null
    [System.IO.File]::Copy($file.FullName, $destination, $false)
}

Write-Output "Copied $($files.Count) starter files to $targetPath"
