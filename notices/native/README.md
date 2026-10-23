# Native Android notice sources

`pnpm export:notices` appends these checked-in texts and the native coordinate
inventory in `docs/release/google-play/native-dependencies.json` to the packaged
`public/third-party-notices.txt`. The command is offline after dependencies are
installed. Refresh the inventory and review upstream notices when native
dependencies change; unknown declared licences fail export rather than being
labelled Apache automatically.

Fetched without editing from the exact Cordova Android 14.0.1 release tag on
24 October 2026:

- [Apache-2.0.txt](https://raw.githubusercontent.com/apache/cordova-android/14.0.1/LICENSE)
  — SHA-256 `401f08372facabc78d6d408a32de4f617fd9552c95e01797838c9d60a938b4da`.
- [cordova-14.0.1-NOTICE.txt](https://raw.githubusercontent.com/apache/cordova-android/14.0.1/NOTICE)
  — SHA-256 `e94707080ab2781d5ba4ceac999f31db2539d2477783287969c52580b9fa84b0`.

All 50 coordinates in the existing release inventory declare Apache 2.0,
including the inherited Guava parent declaration. A 24 October inspection of
their cached JAR/AAR files and nested `classes.jar`/`libs/*.jar` found eight
AndroidX Apache licence texts and no additional licence/NOTICE-named nested
files. Archive absence does not establish absence of upstream source notices;
the exact Cordova source NOTICE is retained explicitly. The Kotlin root NOTICE
identifies the compiler distribution, which RVLRY does not bundle; the listed
standard library and coroutines modules are covered by Apache 2.0.

Capacitor's local Android projects are covered by the MIT texts exported from
their installed npm packages. The coordinate list includes metadata/platform
modules conservatively. This records the inspected release dependency graph,
not a guarantee about future graphs or a human legal review. Verify the final
AAB contains the generated text and the app can display it before submission.
