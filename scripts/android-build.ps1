[CmdletBinding()]
param(
    [ValidateSet('Build', 'Sync', 'Test', 'DeviceTest', 'Bundle', 'BundleUnsigned')]
    [string]$Task = 'Build',
    [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$isBundle = $Task -in @('Bundle', 'BundleUnsigned')
if ($isBundle -and $SkipWebBuild) { throw 'Release bundles require a fresh release web build.' }
if ($Task -eq 'Bundle') {
    $requiredSigning = @('RVLRY_UPLOAD_STORE_FILE', 'RVLRY_UPLOAD_STORE_PASSWORD', 'RVLRY_UPLOAD_KEY_ALIAS', 'RVLRY_UPLOAD_KEY_PASSWORD')
    foreach ($name in $requiredSigning) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
            throw "Release signing is not configured: missing $name. Use BundleUnsigned only for preparation."
        }
    }
    if (-not (Test-Path -LiteralPath $env:RVLRY_UPLOAD_STORE_FILE -PathType Leaf)) { throw 'Upload keystore file not found.' }
    $env:RVLRY_UPLOAD_STORE_FILE = (Resolve-Path -LiteralPath $env:RVLRY_UPLOAD_STORE_FILE).Path
}

# Prefer an explicit compatible JDK; Android Studio's bundled JDK is the local default.
if (-not $env:JAVA_HOME) {
    $studioJdk = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
    if (Test-Path (Join-Path $studioJdk 'bin\java.exe')) {
        $env:JAVA_HOME = $studioJdk
    }
}
if (-not $env:ANDROID_HOME) {
    if ($env:ANDROID_SDK_ROOT) {
        $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
    } else {
        $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    }
}
if (-not (Test-Path (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'))) {
    throw 'Android SDK not found. Set ANDROID_HOME to an installed Android SDK.'
}
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw 'JDK not found. Set JAVA_HOME to a JDK supported by the pinned Android toolchain.'
}

function Invoke-CheckedCommand {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

Push-Location $projectRoot
try {
    if ($Task -eq 'Build' -or $Task -eq 'Sync' -or $isBundle) {
        if (-not $SkipWebBuild) {
            if ($isBundle) { Invoke-CheckedCommand 'pnpm' @('run', 'build:release') }
            else { Invoke-CheckedCommand 'pnpm' @('run', 'build') }
        }
        Invoke-CheckedCommand 'pnpm' @('exec', 'cap', 'sync', 'android')
    }
    if ($Task -ne 'Sync') {
        $gradleTask = switch ($Task) {
            'Build' { ':app:assembleDebug' }
            'Test' { ':app:testDebugUnitTest' }
            'DeviceTest' { ':app:connectedDebugAndroidTest' }
            'Bundle' { ':app:bundleRelease' }
            'BundleUnsigned' { ':app:bundleRelease' }
        }
        Push-Location (Join-Path $projectRoot 'android')
        try {
            $gradleArgs = @('--no-daemon', $gradleTask)
            if ($Task -eq 'BundleUnsigned') { $gradleArgs += '-PrvlryUnsignedRelease=true' }
            Invoke-CheckedCommand '.\gradlew.bat' $gradleArgs
        } finally {
            Pop-Location
        }
        if ($isBundle) {
            $bundle = Join-Path $projectRoot 'android/app/build/outputs/bundle/release/app-release.aab'
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $archive = [System.IO.Compression.ZipFile]::OpenRead($bundle)
            try {
                if (@($archive.Entries | Where-Object FullName -Like '*.map').Count -gt 0) { throw 'Release bundle unexpectedly contains source maps.' }
                $signatures = @($archive.Entries | Where-Object FullName -Match '^META-INF/[^/]+\.(RSA|DSA|EC)$')
                if ($Task -eq 'Bundle' -and $signatures.Count -eq 0) { throw 'Signed bundle has no signing certificate.' }
                if ($Task -eq 'BundleUnsigned' -and $signatures.Count -ne 0) { throw 'Unsigned preparation bundle unexpectedly has a signature.' }
            } finally { $archive.Dispose() }
            if ($Task -eq 'Bundle') {
                Invoke-CheckedCommand (Join-Path $env:JAVA_HOME 'bin/jarsigner.exe') @('-verify', $bundle)
                $certificate = & (Join-Path $env:JAVA_HOME 'bin/keytool.exe') -printcert -jarfile $bundle 2>&1
                if ($LASTEXITCODE -ne 0 -or ($certificate -join "`n") -match 'CN=Android Debug') { throw 'Release certificate validation failed or a debug certificate was used.' }
            }
            Write-Output "Bundle prepared: $bundle"
            if ($Task -eq 'BundleUnsigned') { Write-Output 'UNSIGNED preparation artifact; cannot be uploaded to Google Play.' }
        }
        if ($Task -eq 'DeviceTest') {
            $adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
            Invoke-CheckedCommand $adb @('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk')
            Invoke-CheckedCommand $adb @('install', '-r', 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk')
            foreach ($recoveryClass in @('SnapshotProcessRecoveryTest', 'ContentProcessRecoveryTest')) {
                foreach ($method in @('aWriteCheckpoint', 'bReadCheckpointAfterRestart')) {
                    Invoke-CheckedCommand $adb @('shell', 'am', 'force-stop', 'au.joed.rvlry')
                    $output = & $adb shell am instrument -w -e class "au.joed.rvlry.${recoveryClass}#$method" 'au.joed.rvlry.test/androidx.test.runner.AndroidJUnitRunner'
                    $exitCode = $LASTEXITCODE
                    $output | Write-Output
                    if ($exitCode -ne 0 -or ($output -join "`n") -notmatch 'OK \(1 test\)') {
                        throw "Native process recovery check failed: ${recoveryClass}#$method"
                    }
                }
            }
        }
    }
} finally {
    Pop-Location
}
