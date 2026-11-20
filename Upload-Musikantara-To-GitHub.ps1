[CmdletBinding()]
param(
    [string]$RepoOwner = 'SafiraLeviathan',
    [string]$RepoName = 'Project-WebAR-Musikantara',
    [string]$FrontendSshHost = 'github-musikantara-frontend',
    [string]$BackendSshHost = 'github-musikantara-backend',
    [string]$RepoFolderName = 'Musikantara-GitHub-Upload'
)

$ErrorActionPreference = 'Stop'
# GitHub's `ssh -T` commonly returns exit code 1 even after successful authentication
# because GitHub intentionally does not provide interactive shell access. On PowerShell 7,
# disable automatic conversion of native non-zero exit codes into terminating errors;
# each native command below is checked explicitly where its exit code matters.
if ($PSVersionTable.PSVersion.Major -ge 7 -and (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$SourceRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$ParentFolder = Split-Path -Parent $SourceRoot
$RepoPath = Join-Path $ParentFolder $RepoFolderName
$FrontRemote = "git@${FrontendSshHost}:${RepoOwner}/${RepoName}.git"
$BackRemote = "git@${BackendSshHost}:${RepoOwner}/${RepoName}.git"

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$GitArgs)

    # Git may write normal progress/status messages to stderr (especially push,
    # fetch and clone). Windows PowerShell 5.1 can promote native stderr records
    # to terminating errors under $ErrorActionPreference='Stop'. Capture both
    # streams with Continue, then decide success exclusively from git's exit code.
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
        if ($null -ne $line) { Write-Host $line.ToString() }
    }
    if ($gitExitCode -ne 0) {
        throw "Perintah git gagal dengan exit code $gitExitCode`: git $($GitArgs -join ' ')"
    }
}

function Test-GitHubSsh {
    param([Parameter(Mandatory = $true)][string]$HostAlias)
    Write-Host "Memeriksa SSH: $HostAlias" -ForegroundColor Cyan

    # Windows PowerShell 5.1 can turn native stderr output into a terminating
    # PowerShell error when $ErrorActionPreference is Stop. GitHub's successful
    # `ssh -T` response is normally written to stderr and exits with code 1
    # because GitHub does not provide shell access. Use ProcessStartInfo to read
    # stdout/stderr directly, bypassing PowerShell's native-command error handling.
    $sshCommand = Get-Command ssh -ErrorAction Stop
    $sshPath = $sshCommand.Source
    if ([string]::IsNullOrWhiteSpace($sshPath)) { $sshPath = $sshCommand.Path }
    if ([string]::IsNullOrWhiteSpace($sshPath)) { throw 'Path OpenSSH tidak ditemukan.' }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $sshPath
    $process.StartInfo.Arguments = "-o BatchMode=yes -o StrictHostKeyChecking=accept-new -T git@$HostAlias"
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true

    try {
        if (-not $process.Start()) { throw "Tidak dapat menjalankan OpenSSH untuk '$HostAlias'." }
        # Read both pipes asynchronously to avoid a full-pipe deadlock.
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result
        $sshExitCode = $process.ExitCode
    }
    finally {
        $process.Dispose()
    }

    $sshParts = @()
    if (-not [string]::IsNullOrWhiteSpace($stdout)) { $sshParts += $stdout.Trim() }
    if (-not [string]::IsNullOrWhiteSpace($stderr)) { $sshParts += $stderr.Trim() }
    $sshOutput = ($sshParts -join [Environment]::NewLine).Trim()
    if ($sshOutput -notmatch '(?i)successfully authenticated') {
        if (-not [string]::IsNullOrWhiteSpace($sshOutput)) {
            Write-Host $sshOutput -ForegroundColor Yellow
        }
        throw "SSH untuk '$HostAlias' belum berhasil (exit code $sshExitCode). Periksa SSH config dan public key pada akun GitHub yang sesuai. Belum ada file yang di-push."
    }

    Write-Host $sshOutput -ForegroundColor Green
    Write-Host "OK: autentikasi SSH '$HostAlias' terkonfirmasi (exit code ssh -T: $sshExitCode; kode 1 normal untuk GitHub tanpa shell)." -ForegroundColor Green
}

function Assert-AssetCount {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string]$Filter,
        [Parameter(Mandatory = $true)][int]$Expected
    )
    $fullPath = Join-Path $RepoPath $RelativePath
    if (-not (Test-Path -LiteralPath $fullPath)) {
        throw "Folder aset tidak ditemukan: $RelativePath"
    }
    $actual = @(Get-ChildItem -LiteralPath $fullPath -File -Filter $Filter).Count
    if ($actual -ne $Expected) {
        throw "Jumlah aset '$RelativePath\$Filter' tidak sesuai. Ditemukan $actual, seharusnya $Expected."
    }
    Write-Host "OK: $RelativePath memiliki $actual file $Filter" -ForegroundColor Green
}

try {
    Write-Host "=== MUSIKANTARA GITHUB UPLOADER ===" -ForegroundColor Cyan
    Write-Host "Sumber : $SourceRoot"
    Write-Host "Repo   : https://github.com/$RepoOwner/$RepoName"
    Write-Host "Tujuan : $RepoPath"

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git belum terpasang atau belum masuk PATH. Install Git for Windows terlebih dahulu.'
    }
    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        throw 'OpenSSH tidak ditemukan. Aktifkan OpenSSH Client pada Windows terlebih dahulu.'
    }

    $rootPackagePath = Join-Path $SourceRoot 'package.json'
    $frontendPath = Join-Path $SourceRoot 'frontend'
    $backendPath = Join-Path $SourceRoot 'backend'
    if (-not (Test-Path $rootPackagePath) -or -not (Test-Path $frontendPath) -or -not (Test-Path $backendPath)) {
        throw 'Script harus disimpan dan dijalankan dari root PROJECT-MUSIKANTARA-SOURCE yang berisi package.json, frontend, dan backend.'
    }

    $package = Get-Content -LiteralPath $rootPackagePath -Raw | ConvertFrom-Json
    if ($package.version -ne '1.0.6') {
        throw "Source yang ditemukan versi '$($package.version)', bukan 1.0.6. Hentikan agar versi yang salah tidak terunggah."
    }

    # Cek dua akun sebelum clone atau mengubah repositori.
    Test-GitHubSsh -HostAlias $FrontendSshHost
    Test-GitHubSsh -HostAlias $BackendSshHost

    if (Test-Path -LiteralPath $RepoPath) {
        if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git'))) {
            throw "Folder tujuan sudah ada tetapi bukan repositori Git: $RepoPath. Ubah RepoFolderName atau pindahkan folder tersebut."
        }
        Push-Location $RepoPath
        try {
            $dirty = & git status --porcelain
            if ($LASTEXITCODE -ne 0) { throw 'Gagal memeriksa status working tree repositori.' }
            if ($dirty) {
                throw "Working tree tujuan tidak bersih. Simpan atau pindahkan perubahan di '$RepoPath' terlebih dahulu."
            }
            Invoke-Git -GitArgs @('remote', 'set-url', 'origin', $FrontRemote)
            Invoke-Git -GitArgs @('fetch', 'origin')
            Invoke-Git -GitArgs @('switch', 'main')
            Invoke-Git -GitArgs @('pull', '--ff-only', 'origin', 'main')
        }
        finally { Pop-Location }
    }
    else {
        Invoke-Git -GitArgs @('clone', $FrontRemote, $RepoPath)
    }

    # Salin seluruh project, termasuk aset asli. Tidak menyalin .git, dependency,
    # output build, cache, secrets, log, atau ZIP arsip.
    $robocopyArgs = @(
        $SourceRoot,
        $RepoPath,
        '/E', '/COPY:DAT', '/R:2', '/W:2', '/NFL', '/NDL', '/NJH', '/NJS',
        '/XD', '.git', 'node_modules', 'dist', '.wrangler', '.cache',
        '/XF', '.env', '.env.local', '.env.development.local', '.env.production.local',
        '.dev.vars', '.dev.vars.*', '*.log', '*.zip',
        'Upload-Musikantara-To-GitHub.ps1'
    )
    & robocopy @robocopyArgs
    $robocopyCode = $LASTEXITCODE
    if ($robocopyCode -ge 8) {
        throw "Robocopy gagal menyalin project (kode $robocopyCode). Tidak ada commit baru yang dibuat."
    }

    # Pemeriksaan kelengkapan lima jenis aset sebelum git add.
    Assert-AssetCount -RelativePath 'frontend/public/assets/asset_3d' -Filter '*.glb' -Expected 5
    Assert-AssetCount -RelativePath 'frontend/public/assets/asset_2d' -Filter '*.png' -Expected 5
    Assert-AssetCount -RelativePath 'frontend/public/assets/kartu_ar' -Filter '*.png' -Expected 5
    Assert-AssetCount -RelativePath 'frontend/public/assets/sfx_alat_musik' -Filter '*.wav' -Expected 5
    $mindFile = Join-Path $RepoPath 'frontend/public/assets/targets/musikantara.mind'
    if (-not (Test-Path -LiteralPath $mindFile)) { throw 'File target frontend/public/assets/targets/musikantara.mind tidak ditemukan.' }
    Write-Host 'OK: file target MindAR ditemukan.' -ForegroundColor Green

    # GitHub memberi peringatan di atas 50 MiB dan menolak file di atas 100 MiB.
    # ZIP v1.0.6 yang diperiksa memiliki file terbesar 13.29 MiB.
    $allFiles = @(Get-ChildItem -LiteralPath $RepoPath -Recurse -File -Force | Where-Object {
        $_.FullName -notmatch '[\\/](\.git|node_modules|dist|\.wrangler|\.cache)[\\/]'
    })
    if ($allFiles.Count -eq 0) { throw 'Tidak ada file project yang ditemukan untuk diunggah.' }
    $over50 = @($allFiles | Where-Object { $_.Length -gt 50MB })
    $over100 = @($allFiles | Where-Object { $_.Length -gt 100MB })
    $totalBytes = ($allFiles | Measure-Object -Property Length -Sum).Sum
    $largest = $allFiles | Sort-Object Length -Descending | Select-Object -First 1
    Write-Host ("File project: {0}; total: {1:N2} MiB; file terbesar: {2} ({3:N2} MiB)" -f $allFiles.Count, ($totalBytes / 1MB), $largest.Name, ($largest.Length / 1MB))
    if ($over100.Count -gt 0) {
        $over100 | ForEach-Object { Write-Host ("TERLALU BESAR: {0} ({1:N2} MiB)" -f $_.FullName, ($_.Length / 1MB)) -ForegroundColor Red }
        throw 'Ada file di atas 100 MiB. GitHub akan menolaknya. Hentikan sebelum commit.'
    }
    if ($over50.Count -gt 0) {
        $over50 | ForEach-Object { Write-Host ("PERLU DITINJAU: {0} ({1:N2} MiB)" -f $_.FullName, ($_.Length / 1MB)) -ForegroundColor Yellow }
        throw 'Ada file di atas 50 MiB yang akan memunculkan peringatan GitHub. Hentikan sebelum commit agar upload bersih.'
    }
    if ($totalBytes -ge 2GB) { throw 'Total file melebihi batas aman 2 GiB untuk satu push GitHub.' }

    Push-Location $RepoPath
    try {
        $branch = (& git branch --show-current).Trim()
        if ($branch -ne 'main') { throw "Branch aktif '$branch', bukan main. Tidak melakukan push pada branch yang salah." }

        # Commit frontend dan file workspace bersama dari akun kontributor frontend.
        Invoke-Git -GitArgs @('add', '-A')
        Invoke-Git -GitArgs @('reset', '-q', '--', 'backend/')
        $frontStaged = @(& git diff --cached --name-only)
        if ($LASTEXITCODE -ne 0) { throw 'Gagal memeriksa staged files frontend.' }
        if (@($frontStaged | Where-Object { $_ -match '^backend/' }).Count -gt 0) {
            throw 'Folder backend ikut masuk ke commit frontend. Proses dihentikan untuk menjaga pemisahan kontributor.'
        }
        if ($frontStaged.Count -eq 0) {
            Write-Host 'Tidak ada perubahan frontend/root baru untuk di-commit.' -ForegroundColor Yellow
        }
        else {
            Write-Host "Frontend + konfigurasi workspace: $($frontStaged.Count) file akan di-commit."
            $frontName = Read-Host 'Nama kontributor FRONTEND (default: Luthfi S.W.)'
            if ([string]::IsNullOrWhiteSpace($frontName)) { $frontName = 'Luthfi S.W.' }
            $frontEmail = Read-Host 'Email terverifikasi GitHub untuk kontributor FRONTEND (default: luthfisatriawicaksana3104@gmail.com)'
            if ([string]::IsNullOrWhiteSpace($frontEmail)) { $frontEmail = 'luthfisatriawicaksana3104@gmail.com' }
            & git -c "user.name=$frontName" -c "user.email=$frontEmail" commit -m 'feat(frontend): upload Musikantara frontend and AR assets'
            if ($LASTEXITCODE -ne 0) { throw 'Commit frontend gagal.' }
            Invoke-Git -GitArgs @('remote', 'set-url', 'origin', $FrontRemote)
            Invoke-Git -GitArgs @('push', '-u', 'origin', 'main')
            Write-Host 'Push frontend berhasil.' -ForegroundColor Green
        }

        # Commit backend dilakukan dengan key dan identitas kontributor kedua.
        Invoke-Git -GitArgs @('add', '-A', '--', 'backend/')
        $backStaged = @(& git diff --cached --name-only)
        if ($LASTEXITCODE -ne 0) { throw 'Gagal memeriksa staged files backend.' }
        if (@($backStaged | Where-Object { $_ -match '^backend/' }).Count -eq 0) {
            Write-Host 'Tidak ada perubahan backend baru untuk di-commit.' -ForegroundColor Yellow
        }
        else {
            Write-Host "Backend: $($backStaged.Count) file akan di-commit."
            $backName = Read-Host 'Nama kontributor BACKEND (sesuai akun GitHub kedua)'
            if ([string]::IsNullOrWhiteSpace($backName)) { throw 'Nama kontributor backend wajib diisi.' }
            $backEmail = Read-Host 'Email terverifikasi GitHub untuk kontributor BACKEND'
            if ([string]::IsNullOrWhiteSpace($backEmail)) { throw 'Email kontributor backend wajib diisi.' }
            & git -c "user.name=$backName" -c "user.email=$backEmail" commit -m 'feat(backend): upload Musikantara backend'
            if ($LASTEXITCODE -ne 0) { throw 'Commit backend gagal.' }
            Invoke-Git -GitArgs @('remote', 'set-url', 'origin', $BackRemote)
            Invoke-Git -GitArgs @('push', 'origin', 'main')
            Write-Host 'Push backend berhasil.' -ForegroundColor Green
        }

        # Verifikasi bahwa seluruh sumber dan aset tampak pada branch remote.
        Invoke-Git -GitArgs @('remote', 'set-url', 'origin', $FrontRemote)
        Invoke-Git -GitArgs @('fetch', 'origin')
        $remoteFiles = @(& git ls-tree -r --name-only origin/main)
        if ($LASTEXITCODE -ne 0) { throw 'Gagal membaca daftar file pada origin/main setelah push.' }
        $remoteGlb = @($remoteFiles | Where-Object { $_ -match '^frontend/public/assets/asset_3d/.+\.glb$' }).Count
        $remote2d = @($remoteFiles | Where-Object { $_ -match '^frontend/public/assets/asset_2d/.+\.png$' }).Count
        $remoteCards = @($remoteFiles | Where-Object { $_ -match '^frontend/public/assets/kartu_ar/.+\.png$' }).Count
        $remoteWav = @($remoteFiles | Where-Object { $_ -match '^frontend/public/assets/sfx_alat_musik/.+\.wav$' }).Count
        $hasMind = $remoteFiles -contains 'frontend/public/assets/targets/musikantara.mind'
        $hasBackend = @($remoteFiles | Where-Object { $_ -match '^backend/' }).Count -gt 0
        if ($remoteGlb -ne 5 -or $remote2d -ne 5 -or $remoteCards -ne 5 -or $remoteWav -ne 5 -or -not $hasMind -or -not $hasBackend) {
            throw "Verifikasi remote belum lengkap. GLB=$remoteGlb, 2D=$remote2d, kartu=$remoteCards, WAV=$remoteWav, MindAR=$hasMind, Backend=$hasBackend. Periksa akses dan status push kedua akun."
        }
        Write-Host ''
        Write-Host 'UPLOAD DAN VERIFIKASI BERHASIL' -ForegroundColor Green
        Write-Host "Repo: https://github.com/$RepoOwner/$RepoName"
        Write-Host "Total file pada remote: $($remoteFiles.Count)"
        Write-Host 'Aset terverifikasi: 5 GLB, 5 gambar 2D, 5 kartu AR, 5 WAV, 1 file MindAR.'
        Write-Host 'Folder backend terverifikasi pada origin/main.'
        Write-Host 'Remote lokal dikembalikan ke SSH host frontend untuk operasi Git berikutnya.'
    }
    finally { Pop-Location }
}
catch {
    Write-Host ''
    Write-Host "UPLOAD BELUM SELESAI: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Tidak ada file sumber yang dihapus. Jika commit frontend sudah berhasil tetapi push backend gagal, folder tujuan tetap menyimpan perubahan untuk dilanjutkan.' -ForegroundColor Yellow
    exit 1
}
