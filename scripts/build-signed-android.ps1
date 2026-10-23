# Maintained release helper: from the checkout, run powershell -NoProfile
# -ExecutionPolicy Bypass -File scripts/build-signed-android.ps1.
# Requires op CLI vault access, the local encrypted upload keystore and Android
# build tools. Reads credentials into process memory and delegates to android-build.ps1;
# produces a local signed AAB without uploading it. Never prints credential values.
[CmdletBinding()]
param(
    [string]$KeystorePath = (Join-Path $env:USERPROFILE '.android\rvlry-upload.jks')
)

$ErrorActionPreference = 'Stop'
$vaultId = 'h36zstjvc3nsdcjntcltv5as24'
$credentialItemId = 'obheir4shn73n42treshxubmka'
$variableNames = @(
    'OP_SERVICE_ACCOUNT_TOKEN',
    'RVLRY_UPLOAD_STORE_FILE',
    'RVLRY_UPLOAD_STORE_PASSWORD',
    'RVLRY_UPLOAD_KEY_ALIAS',
    'RVLRY_UPLOAD_KEY_PASSWORD'
)
$previousEnvironment = @{}
foreach ($name in $variableNames) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
    if (-not (Get-Command op -ErrorAction SilentlyContinue)) { throw '1Password CLI (op) is required.' }
    if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
        throw 'Upload keystore not found. Recover it using docs/release/google-play/signing.md.'
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) {
        $env:OP_SERVICE_ACCOUNT_TOKEN = [Environment]::GetEnvironmentVariable('OP_SERVICE_ACCOUNT_TOKEN', 'User')
    }
    if (-not $env:OP_SERVICE_ACCOUNT_TOKEN) { throw '1Password service-account token is unavailable.' }

    # Capture both streams so a failed CLI call cannot print a partial item.
    $itemJson = & op item get $credentialItemId --vault $vaultId --format json --reveal 2>&1
    if ($LASTEXITCODE -ne 0) { throw '1Password upload credential retrieval failed.' }
    try {
        $item = ($itemJson -join "`n") | ConvertFrom-Json
    } catch {
        throw '1Password returned an invalid credential response.'
    }
    $storePassword = @($item.fields | Where-Object id -eq 'store_password')
    $keyPassword = @($item.fields | Where-Object id -eq 'key_password')
    $keyAlias = @($item.fields | Where-Object id -eq 'key_alias')
    if ($storePassword.Count -ne 1 -or $keyPassword.Count -ne 1 -or $keyAlias.Count -ne 1 -or
        [string]::IsNullOrWhiteSpace($storePassword[0].value) -or
        [string]::IsNullOrWhiteSpace($keyPassword[0].value) -or $keyAlias[0].value -cne 'rvlry-upload') {
        throw '1Password upload credential fields are missing or inconsistent.'
    }

    $env:RVLRY_UPLOAD_STORE_FILE = (Resolve-Path -LiteralPath $KeystorePath).Path
    $env:RVLRY_UPLOAD_STORE_PASSWORD = $storePassword[0].value
    $env:RVLRY_UPLOAD_KEY_ALIAS = $keyAlias[0].value
    $env:RVLRY_UPLOAD_KEY_PASSWORD = $keyPassword[0].value
    & (Join-Path $PSScriptRoot 'android-build.ps1') -Task Bundle
} finally {
    foreach ($name in $variableNames) {
        if ($null -eq $previousEnvironment[$name]) {
            Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process')
        }
    }
    $itemJson = $null
    $item = $null
    $storePassword = $null
    $keyPassword = $null
    $keyAlias = $null
    $previousEnvironment.Clear()
}
