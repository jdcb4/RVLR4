# Data safety and release evidence — preparation only

Audit date 23 October 2026. No Console declarations submitted. Reconfirm against the exact signed upload and final policy, particularly after any SDK or feature change.

| Area                                     | Observed in source                                                                       | Draft Console interpretation                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Accounts/login                           | No account system or authentication SDK                                                  | App access unrestricted; no login credentials                                                |
| Player/team names, clues, answers, saves | Native SQLite local snapshots, plus browser-only fallback                                | On-device-only processing is not off-device collection; confirm no SDK collects it           |
| Network                                  | Manual bounded HTTPS content downloads from content.jboxgames.com (Cloudflare)     | No gameplay upload; provider sees IP/request metadata. Reassess final declaration.                    |
| Ads/analytics                            | No ads, analytics or crash-reporting SDK configured                                      | No ads; no app-collected diagnostic/advertising identifiers                                  |
| Permissions                              | INTERNET in source; merged release adds only the AndroidX app-local signature permission | No camera/microphone/location/contact permissions; merged release checked on 23 October 2026 |
| Fonts/art                                | Bundled local files                                                                      | No font/art CDN requests                                                                     |
| Backups                                  | android:allowBackup=false, fullBackupContent=false, extraction rules                     | No app cloud backup/sync feature                                                             |
| Tracking                                 | No advertising/tracking integration found                                                | No tracking integration; final dependency review still required                              |

The earlier provisional no-off-device-data assessment is superseded by the manual content endpoint in 0.41.0. Gameplay stays local, but Cloudflare processes download IP/request metadata. Confirm provider processing/retention and applicable Console categories/exemptions before submitting a declaration; do not automatically claim that no data leaves the device. Do not select optional security assurances merely because data stays local; answer Console's current follow-up questions based on actual behaviour. Google requires the declaration and a public privacy policy even for apps that do not collect data. Source URLs in Trivia records are provenance, not automatic network requests.

Families/age selection is a separate review. Kids mode intentionally targets ages 8–12; select actual supported age groups and comply with applicable Families requirements. Do not use a guessed content rating. Review adult words and questions as well as Kids pools. There are no ads or purchases in this build.

Evidence commands/files: production package inventory (`pnpm licenses list --prod --json`); `src/services/contentPacks/download.ts`; `src/services/nativeSnapshotStore.ts`; AndroidManifest.xml/data_extraction_rules.xml and merged release manifest; source search for fetch, WebSocket, sendBeacon and remote URLs. These are static findings, not a completed Play SDK/network audit. Pre-launch and real-device release testing remain required.

Official references:

- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/9867159
