[CmdletBinding()]
param(
    [ValidateSet('Build', 'Sync', 'Test', 'DeviceTest')]
    [string]$Task = 'Build',
    [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

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
    if ($Task -eq 'Build' -or $Task -eq 'Sync') {
        if (-not $SkipWebBuild) {
            Invoke-CheckedCommand 'pnpm' @('run', 'build')
        }
        Invoke-CheckedCommand 'pnpm' @('exec', 'cap', 'sync', 'android')
    }
    if ($Task -ne 'Sync') {
        $gradleTask = switch ($Task) {
            'Build' { ':app:assembleDebug' }
            'Test' { ':app:testDebugUnitTest' }
            'DeviceTest' { ':app:connectedDebugAndroidTest' }
        }
        Push-Location (Join-Path $projectRoot 'android')
        try {
            Invoke-CheckedCommand '.\gradlew.bat' @('--no-daemon', $gradleTask)
        } finally {
            Pop-Location
        }
        if ($Task -eq 'DeviceTest') {
            $adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
            Invoke-CheckedCommand $adb @('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk')
            Invoke-CheckedCommand $adb @('install', '-r', 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk')
            foreach ($method in @('aWriteCheckpoint', 'bReadCheckpointAfterRestart')) {
                Invoke-CheckedCommand $adb @('shell', 'am', 'force-stop', 'au.joed.rvlry')
                $output = & $adb shell am instrument -w -e class "au.joed.rvlry.SnapshotProcessRecoveryTest#$method" 'au.joed.rvlry.test/androidx.test.runner.AndroidJUnitRunner'
                $exitCode = $LASTEXITCODE
                $output | Write-Output
                if ($exitCode -ne 0 -or ($output -join "`n") -notmatch 'OK \(1 test\)') {
                    throw "Native process recovery check failed: $method"
                }
            }
        }
    }
} finally {
    Pop-Location
}
