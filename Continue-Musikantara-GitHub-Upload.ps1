# Continue the Musikantara upload from the existing Git clone.
# Windows PowerShell 5.1 and PowerShell 7 compatible.
[CmdletBinding()]
param(
    [string]$RepoPath = ''
)

$ErrorActionPreference = 'Stop'
$RepoFullName = 'SafiraLeviathan/Project-WebAR-Musikantara'
$FrontendSshHost = 'github-musikantara-frontend'
$BackendSshHost = 'github-musikantara-backend'
$FrontendCommitMessage = 'Upload frontend Musikantara WebAR v1.0.6'
$BackendCommitMessage = 'Upload backend Musikantara WebAR v1.0.6'

function Get-RemoteUrl {
    param([Parameter(Mandatory = $true)][string]$Path)

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& git -C $Path remote get-url origin 2>&1)
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($code -ne 0) { return $null }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
}

function Find-RepositoryPath {
    param([string]$RequestedPath)

    $projectsRoot = Split-Path -Parent $PSScriptRoot
    $candidates = New-Object System.Collections.Generic.List[string]

    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        $candidates.Add([System.IO.Path]::GetFullPath($RequestedPath))
    }
    else {
        # The original uploader used this sibling folder.
        $candidates.Add((Join-Path $projectsRoot 'Musikantara-GitHub-Upload'))
        # The previous File Explorer screenshot also showed a clone folder
        # nested inside PROJECT-MUSIKANTARA-SOURCE. Check that location too.
        $candidates.Add((Join-Path $PSScriptRoot 'Musikantara-GitHub-Upload'))

        # Check a folder with the expected name one level below each project
        # directory. Do not treat the source project root itself as the clone.
        if (Test-Path -LiteralPath $projectsRoot -PathType Container) {
            $projectDirs = @(Get-ChildItem -LiteralPath $projectsRoot -Directory -ErrorAction SilentlyContinue)
            foreach ($dir in $projectDirs) {
                $nested = Join-Path $dir.FullName 'Musikantara-GitHub-Upload'
                $candidates.Add($nested)
            }
        }
    }

    $seen = @{}
    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $key = $candidate.TrimEnd('\').ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true

        if (-not (Test-Path -LiteralPath $candidate -PathType Container)) { continue }
        $gitDir = Join-Path $candidate '.git'
        if (-not (Test-Path -LiteralPath $gitDir)) { continue }

        $remote = Get-RemoteUrl -Path $candidate
        if (-not [string]::IsNullOrWhiteSpace($remote) -and
            $remote.IndexOf($RepoFullName, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            return [System.IO.Path]::GetFullPath($candidate)
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        throw "Folder yang diberikan bukan clone repository $RepoFullName atau remote origin tidak sesuai: $RequestedPath"
    }

    $details = New-Object System.Collections.Generic.List[string]
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Container) {
            $gitDir = Join-Path $candidate '.git'
            if (Test-Path -LiteralPath $gitDir) {
                $remote = Get-RemoteUrl -Path $candidate
                if ([string]::IsNullOrWhiteSpace($remote)) { $remote = '(remote origin tidak ditemukan)' }
                $details.Add("- $candidate | $remote")
            }
        }
    }

    $detailText = if ($details.Count -gt 0) { $details -join "`n" } else { '(Tidak ditemukan folder kandidat yang memiliki .git.)' }
    throw "Clone repository tidak ditemukan secara otomatis. Kandidat yang diperiksa:`n$detailText`n`nJangan jalankan uploader awal lagi. Pastikan lokasi folder clone, lalu jalankan script ini dengan parameter -RepoPath diikuti lokasi folder clone yang benar."
}

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$GitArgs)

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $gitOutput = @(& git @GitArgs 2>&1)
        $gitExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    foreach ($line in $gitOutput) {
        if ($null -ne $line) { Write-Host ([string]$line) }
    }

    if ($gitExitCode -ne 0) {
        throw "Perintah git gagal (exit code $gitExitCode): git $($GitArgs -join ' ')"
    }
}

function Test-StagedChanges {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & git diff --cached --quiet 2>$null
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($code -eq 0) { return $false }
    if ($code -eq 1) { return $true }
    throw "Tidak dapat memeriksa staged changes (git diff exit code $code)."
}

function Read-RequiredValue {
    param(
        [string]$Prompt,
        [string]$DefaultValue
    )

    if ([string]::IsNullOrWhiteSpace($DefaultValue)) {
        $value = Read-Host $Prompt
    }
    else {
        $value = Read-Host "$Prompt [$DefaultValue]"
        if ([string]::IsNullOrWhiteSpace($value)) { $value = $DefaultValue }
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Nilai untuk '$Prompt' wajib diisi."
    }
    return $value.Trim()
}

try {
    Write-Host '=== MUSIKANTARA UPLOAD CONTINUATION v2 ===' -ForegroundColor Cyan
    $RepoPath = Find-RepositoryPath -RequestedPath $RepoPath
    Write-Host "Clone repository terdeteksi: $RepoPath" -ForegroundColor Green
    Write-Host "Remote: $(Get-RemoteUrl -Path $RepoPath)"

    Set-Location -LiteralPath $RepoPath

    # Fix LF/CRLF rejection locally for this repository only.
    Invoke-Git -GitArgs @('config', '--local', 'core.autocrlf', 'false')
    Invoke-Git -GitArgs @('config', '--local', 'core.safecrlf', 'false')

    $branchOutput = @(& git branch --show-current 2>&1)
    $branchExit = $LASTEXITCODE
    if ($branchExit -ne 0 -or $branchOutput.Count -eq 0) {
        throw 'Tidak dapat membaca branch Git aktif.'
    }
    $Branch = ([string]$branchOutput[-1]).Trim()
    if ([string]::IsNullOrWhiteSpace($Branch)) { $Branch = 'main' }

    # Verify required assets before staging or committing.
    $assetChecks = @(
        @{ Path = 'frontend/public/assets/asset_3d'; Pattern = '*.glb'; Expected = 5; Label = 'model 3D' },
        @{ Path = 'frontend/public/assets/asset_2d'; Pattern = '*.png'; Expected = 5; Label = 'gambar 2D' },
        @{ Path = 'frontend/public/assets/kartu_ar'; Pattern = '*.png'; Expected = 5; Label = 'kartu AR' },
        @{ Path = 'frontend/public/assets/sfx_alat_musik'; Pattern = '*.wav'; Expected = 5; Label = 'audio SFX' }
    )

    foreach ($check in $assetChecks) {
        $assetDir = Join-Path $RepoPath $check.Path
        if (-not (Test-Path -LiteralPath $assetDir -PathType Container)) {
            throw "Folder aset tidak ditemukan: $($check.Path)"
        }
        $count = @(Get-ChildItem -LiteralPath $assetDir -File -Filter $check.Pattern).Count
        if ($count -ne $check.Expected) {
            throw "Jumlah $($check.Label) tidak sesuai. Diharapkan $($check.Expected), ditemukan $count."
        }
        Write-Host "OK: $($check.Label) = $count file" -ForegroundColor Green
    }

    $mindFile = Join-Path $RepoPath 'frontend/public/assets/targets/musikantara.mind'
    if (-not (Test-Path -LiteralPath $mindFile -PathType Leaf)) {
        throw 'File target MindAR musikantara.mind tidak ditemukan.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoPath 'backend/package.json') -PathType Leaf)) {
        throw 'backend/package.json tidak ditemukan.'
    }
    Write-Host 'OK: file MindAR dan backend ditemukan.' -ForegroundColor Green

    Write-Host ''
    Write-Host 'Identitas commit FRONTEND (akun SSH Nameless357):' -ForegroundColor Cyan
    $frontendName = Read-RequiredValue 'Nama author frontend' 'Luthfi S.W.'
    $frontendEmail = Read-RequiredValue 'Email author frontend' 'luthfisatriawicaksana3104@gmail.com'

    Write-Host ''
    Write-Host 'Identitas commit BACKEND (akun SSH SafiraLeviathan):' -ForegroundColor Cyan
    $backendName = Read-RequiredValue 'Nama author backend' 'SafiraLeviathan'
    $backendEmail = Read-RequiredValue 'Email terverifikasi pada akun SafiraLeviathan' ''

    # Stage frontend and root files first; leave backend for its own commit.
    Invoke-Git -GitArgs @('remote', 'set-url', 'origin', "git@$FrontendSshHost`:$RepoFullName.git")
    Invoke-Git -GitArgs @('add', '-A')
    Invoke-Git -GitArgs @('reset', '--', 'backend')

    if (Test-StagedChanges) {
        Invoke-Git -GitArgs @('-c', "user.name=$frontendName", '-c', "user.email=$frontendEmail", 'commit', '-m', $FrontendCommitMessage)
    }
    else {
        Write-Host 'Tidak ada perubahan frontend/root baru untuk di-commit.' -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host "Push frontend/root ke origin/$Branch melalui akun Nameless357..." -ForegroundColor Cyan
    Invoke-Git -GitArgs @('push', '-u', 'origin', $Branch)

    # Commit and push backend via the second SSH alias.
    Invoke-Git -GitArgs @('add', '-A', '--', 'backend')
    if (Test-StagedChanges) {
        Invoke-Git -GitArgs @('-c', "user.name=$backendName", '-c', "user.email=$backendEmail", 'commit', '-m', $BackendCommitMessage)
    }
    else {
        Write-Host 'Tidak ada perubahan backend baru untuk di-commit.' -ForegroundColor Yellow
    }

    Invoke-Git -GitArgs @('remote', 'set-url', 'origin', "git@$BackendSshHost`:$RepoFullName.git")
    Write-Host ''
    Write-Host "Push backend ke origin/$Branch melalui akun SafiraLeviathan..." -ForegroundColor Cyan
    Invoke-Git -GitArgs @('push', '-u', 'origin', $Branch)

    # Leave origin configured with the frontend SSH alias.
    Invoke-Git -GitArgs @('remote', 'set-url', 'origin', "git@$FrontendSshHost`:$RepoFullName.git")

    Write-Host ''
    Write-Host 'Memverifikasi branch remote...' -ForegroundColor Cyan
    Invoke-Git -GitArgs @('ls-remote', '--heads', 'origin', $Branch)

    Write-Host ''
    Write-Host 'UPLOAD LANJUTAN SELESAI: perintah push frontend dan backend telah selesai.' -ForegroundColor Green
    Write-Host "Folder lokal tetap tersedia: $RepoPath"
}
catch {
    Write-Host ''
    Write-Host "UPLOAD BELUM SELESAI: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Tidak ada perintah penghapusan file lokal yang dijalankan. Folder tujuan dan source tetap dipertahankan.' -ForegroundColor Yellow
    exit 1
}
