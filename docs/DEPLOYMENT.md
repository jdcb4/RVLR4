# Android delivery

This branch produces a standalone APK, not a hosted site. Use the commands in [ANDROID.md](ANDROID.md). No Railway deployment, Docker image or original web-repository branch promotion is part of this project.

Prototype APKs are debug-signed locally. Install a subsequent build over the existing application to preserve SQLite saves; uninstalling clears them. Keep app/native versions synchronized. Copy release artifacts to JNAS Media/DropBox and compare SHA-256 after copying. APKs and generated web assets stay outside git.

A separately backed-up signing identity and release procedure are future work before wider distribution. Interactive design studies are ordinary offline HTML files with bundled assets; copy their complete folder or extract their ZIP before opening index.html.
