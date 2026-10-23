# Content updates

Implemented in 0.41.0. Settings → **Check for new words** manually checks both words and Trivia. No startup network request, authentication, telemetry SDK or gameplay upload. Installed content is loaded from local storage before the game picker can create a game. Offline play always has bundled content available.

## Stable endpoint

`https://content.jboxgames.com/rvlry/v1/manifest.json`

Cloudflare Workers Static Assets, service `rvlry-content`, isolated from the Android runtime and other sites. `content-endpoint/wrangler.jsonc` owns the hostname. Only generated `out/content-endpoint` public assets are uploaded. No application database, secrets or private game data are hosted. Workers.dev/preview URLs and Worker observability are disabled. Cloudflare still handles network metadata as the hosting provider; see the draft privacy policy.

The hostname and `/rvlry/v1/` contract can stay fixed if hosting moves. HTTPS, anonymous CORS, exact JSON routes and 404s must remain available. The downloader rejects redirects, sends no credentials/referrer, bounds fetch time to 20 seconds, manifest size to 64KiB and each pack to 8MiB. Descriptor version, byte length, SHA-256, UTF-8 and strict schemas are checked before installation. Hashes detect corruption; HTTPS and publisher account security establish trust, not an embedded signing secret.

## Additive contract

- Schema version 1 manifest advertises at most one independently versioned `words` pack and one `trivia` pack. Missing descriptors do nothing.
- Packs are **upserts plus explicit `removedIds`**, never replacement lists. An empty array or single-record batch cannot erase omitted records.
- Word identity is `word:` plus `catalogueIdentity(canonical word)`: Unicode decomposition, accent removal, lowercase and removal of punctuation/spacing. Compare display names and aliases across the merged result; reject conflicts rather than silently add duplicates. Words retain categories, games, ratings, Kids flags and original IDs.
- Trivia uses its existing stable `trivia:<slug>` IDs. Changed content needs an increased question revision. Duplicate IDs or normalised question text across the final catalogue are rejected. This is deterministic identity checking; semantic repeats still need editorial review.
- `removedIds` are cumulative permanent tombstones. Omission never clears one; a batch cannot both remove and upsert an ID. Reintroduction under the same ID is intentionally unsupported. Renaming a word to a different normalised identity requires explicitly removing its old ID and adding its new record, retaining relevant provenance/aliases.
- Lower/repeated pack versions are skipped by the updater and rejected by the installer. Publication versions are independent of app versions. Do not recycle them.
- Native SQLite atomically stores the **merged** catalogue with a validated previous checkpoint and exact-current compare-and-swap. The merged payload must also fit 8MiB. Failed validation, downloads or writes preserve the checkpoint; each kind installs independently and Settings reports partial failures.
- Loading after an APK upgrade reconciles bundled records with installed additions and tombstones. Stored word records override the same bundled identity; Trivia keeps the highest revision. Corrupt/unsupported current data falls back to the previous checkpoint or bundle with a warning; unsupported stored schema headers block overwriting.

## Game isolation

Saved Trivia questions, Hat clue/deck copies and Imposter secrets remain unchanged. Hat suggestions in unfinished setup and new Imposter deals use the current catalogue. WWW captures a stripped, difficulty-balanced/category-balanced match sample before play, bounded to 1,440 entries and 350KiB UTF-8, and saves it for later turns and recovery. Updating cannot alter an existing WWW match. Older prerelease saves missing a pool capture it on hydration.

## Publishing reviewed additions or removals

The immutable publication starting point is `content/updates/baseline/{words,trivia}.json`: words v1 (4,797 entries), Trivia v5 (600 questions). These are approved source snapshots, not regenerated from mutable APK bundles. Preserve them and every published ledger batch so rebuilding cannot lose prior additions or removals.

1. Add reviewed `content/updates/words-v2.json`, `trivia-v6.json`, etc. Use the corresponding pack header (`schemaVersion`, `kind`, next `version`, UTC `publishedAt`) and `entries` or `questions`. Include `removedIds` only when explicitly deleting. For corrections, include complete records and retain original provenance. An empty upsert array is allowed for a removal-only batch.
2. Run `pnpm content:build`. It validates and replays the entire ledger, rejects reused/older batch versions, and emits **cumulative** full catalogues, tombstones, hash-named immutable assets and a shared manifest written last. A phone skipping releases therefore catches up with one download. Never hand-edit generated manifests or reuse a published batch version.
3. Review counts/removals, run app/content tests, then `pnpm content:check-deploy` for a Wrangler dry run. `pnpm content:deploy` builds and atomically publishes one asset deployment using the local Cloudflare login. This does not deploy the app or original web repository.
4. Run `pnpm content:verify-live`. It verifies both public packs' hashes/schemas, CORS and unknown-path 404 behavior. Test Settings on a phone before announcing significant content changes.

`publish:trivia` remains a single-pack export utility; the ledger builder is the maintained live publishing path. To incorporate downloaded releases into a future APK, copy the effective reviewed records/tombstones and matching version into its bundled pack; do not advance an APK's pack version independently of the publication history. Keep the publishing baselines fixed.

Roll back a bad server deployment with `pnpm exec wrangler rollback <version-id> --config content-endpoint/wrangler.jsonc`. This prevents further distribution but does **not** reverse already-installed higher versions. Correct installed data using a newer reviewed pack with explicit fixes/removals. Keep old hash-named assets available during normal deployments so in-flight clients can finish; if a host migration drops one, a failed download is safe and a fresh check retries the current manifest.

Initial deployment 23 October 2026: Cloudflare version `27361956-6db5-4602-b34e-d04e4add8903`, words v1 and Trivia v5. These match the APK's bundled data, so a new install correctly reports up to date until a new ledger batch is published.
