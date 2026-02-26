Param()
# Remove large blobs (>= 100MB) using git-filter-repo (PowerShell version)
# WARNING: Rewrites history. Backup first.

$remote = git config --get remote.origin.url 2>$null
if (-not $remote) {
  Write-Error "No origin remote configured. Set origin or run from a clone with origin."
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git not found in PATH"
  exit 1
}

if (-not (Get-Command git-filter-repo -ErrorAction SilentlyContinue)) {
  Write-Error "git-filter-repo not found. Install: https://github.com/newren/git-filter-repo"
  Write-Output "You can also install via pip: pip install git-filter-repo"
  exit 1
}

$confirm = Read-Host "This will rewrite history and force-push to origin. Backup first. Continue? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
  Write-Output "Aborting."
  exit 0
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$mirrorDir = Join-Path (Get-Location) "repo-mirror-$ts.git"

Write-Output "Creating bare mirror clone at $mirrorDir ..."
git clone --mirror $remote $mirrorDir

Push-Location $mirrorDir

Write-Output "Running git-filter-repo to strip blobs > 100MB ..."
git filter-repo --strip-blobs-bigger-than 100M

Write-Output "Force-pushing cleaned history to origin ..."
git push --force --all
git push --force --tags

Pop-Location

Write-Output "Done. Remove your local clone and re-clone from origin. Mirror backup: $mirrorDir"
