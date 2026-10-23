# Android upload signing and recovery

The dedicated RVLRY upload key was created on 24 October 2026. It signs local
release bundles for Google Play. Enrol in Play App Signing during Console setup
and let Google manage a separate app-signing key. No Play key registration or
upload is established by this local setup.

## Public identity

| Property                 | Value                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Local encrypted keystore | `C:\Users\joedo\.android\rvlry-upload.jks` (outside the checkout)                                 |
| Keystore format / alias  | JKS / `rvlry-upload`                                                                              |
| Algorithm                | RSA 3072; SHA256withRSA certificate signature                                                     |
| Certificate subject      | `CN=RVLRY Upload, O=RVLRY, C=AU`                                                                  |
| Validity                 | 24 October 2026–11 March 2054 (10,000 days)                                                       |
| Certificate SHA-256      | `7A:68:DF:34:F6:FD:06:62:71:3B:6D:13:F1:1C:99:DD:94:52:B3:66:92:B4:AC:B3:A3:8E:00:B7:14:EB:DF:C3` |
| Public certificate       | [upload-certificate.pem](upload-certificate.pem)                                                  |

The PEM and fingerprint are public information. Never commit the keystore,
passwords, service-account token or credential JSON.

## Build

From the checkout, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-signed-android.ps1
```

The helper requires 1Password CLI (`op`) and vault access using
`OP_SERVICE_ACCOUNT_TOKEN` in the process or Windows user environment. It reads
the exact credential item below into memory, sets the four signing environment
variables for the existing `android-build.ps1 -Task Bundle` command and restores
the prior environment in `finally`. It does not upload anything. Do not enable
PowerShell tracing, Gradle debug logs or print the credential response.

The existing `pnpm android:bundle` remains available when all four signing
environment variables have already been supplied securely.

## Encrypted backup and recovery

The local JKS protects the private key with cryptographically random passwords.
The independently retrievable copy and its passwords are encrypted in 1Password:

| Vault / item                               | Identifier                       |
| ------------------------------------------ | -------------------------------- |
| OpenDore vault                             | `h36zstjvc3nsdcjntcltv5as24`     |
| `RVLRY Android upload key` (Secure Note)   | `obheir4shn73n42treshxubmka`     |
| Concealed fields                           | `store_password`, `key_password` |
| `RVLRY Android upload keystore` (Document) | `oivdlcth5us7graasyrby77u7a`     |

Recovery was exercised on 24 October 2026: the document downloaded byte-identical
to the local keystore, and separately retrieved concealed passwords successfully
unlocked its private key to generate a certificate request. The public certificate
exported from the recovered copy matches the SHA-256 above. This verifies vault
recovery; access still depends on the owner's 1Password account/service account.

The recovery exercise left an encrypted duplicate at
`C:\Users\joedo\.android\rvlry-upload-recovery-check.jks` and a public certificate
request at the adjacent `rvlry-upload-recovery-check.csr`. Automatic approval
review rejected their deletion outside the checkout with “blocked by policy”.
Neither contains plaintext passwords; they are not additional required backups.

On another machine, authenticate 1Password using the owner's existing secure
procedure. Download the document to a protected path outside the checkout:

```powershell
op document get oivdlcth5us7graasyrby77u7a --vault h36zstjvc3nsdcjntcltv5as24 --out-file C:\Users\joedo\.android\rvlry-upload.jks
```

Do not overwrite an existing key without first checking its public fingerprint.
Use `-KeystorePath` on `build-signed-android.ps1` if the restored path differs.
Capture credential JSON directly into process memory; never print it or save a
plaintext credentials file. Use keytool's `-storepass:env` and `-keypass:env`
options for manual checks, then remove those temporary environment values. Verify
the recovered certificate's SHA-256 before signing. Retain both vault items
together; neither is a reason to regenerate the key during routine builds.

## Loss or compromise

If the local copy is lost, restore the vault document and use the existing
password item. If either private key or passwords may be compromised, stop
release uploads, preserve evidence and notify Joe. After Play App Signing
enrolment, the account owner can request an upload-key reset in Play Console.
Generate and securely back up the replacement, register its public certificate,
wait for Google's reset confirmation, update this runbook/helper and verify the
next signed bundle before retiring old vault records. An upload-key reset does
not replace Google's app-signing key. Before first registration, coordinate the
replacement with Joe and ensure the intended certificate is used for enrolment.

Do not delete an active keystore or change Console signing settings as routine
cleanup. See [Android's signing and upload-key reset guidance](https://developer.android.com/studio/publish/app-signing).
