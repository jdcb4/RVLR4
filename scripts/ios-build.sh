#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo "iOS builds require macOS with Xcode 26+. Use the Codemagic ios-sideload workflow." >&2
  exit 1
fi

# Fresh release assets; never package an old browser build or source maps.
pnpm run build:release
pnpm exec cap sync ios
# Use the existing RVLRY icon; sips supplies Xcode's required 1024px size.
sips -z 1024 1024 public/icon-512.png --out ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png >/dev/null
mkdir -p out/ios
stage="$(mktemp -d "$PWD/out/ios/stage.XXXXXX")"
trap 'rm -rf "$stage"' EXIT
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$stage/DerivedData" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= \
  build 2>&1 | tee out/ios/xcodebuild.log

app="$stage/DerivedData/Build/Products/Release-iphoneos/App.app"
test -f "$app/App"
test -f "$app/public/index.html"
# Catch accidental simulator output before giving a tester an unusable archive.
xcrun vtool -show-build "$app/App" | tee out/ios/platform.txt
grep -q 'platform IOS$' out/ios/platform.txt
version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')"
native_version="$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$app/Info.plist")"
test "$version" = "$native_version"
mkdir "$stage/Payload"
ditto "$app" "$stage/Payload/App.app"
artifact="$PWD/out/ios/RVLRY-$version-unsigned.ipa"
# ditto creates a new ZIP rather than updating entries in an older artifact.
ditto -c -k --keepParent "$stage/Payload" "$artifact"
unzip -t "$artifact"
(cd out/ios && shasum -a 256 "$(basename "$artifact")") > "$artifact.sha256"
{
  printf 'RVLRY %s — unsigned iPhone device build\n' "$version"
  printf 'Commit: %s\n' "$(git rev-parse HEAD)"
  xcodebuild -version
  printf '\nRe-sign and install this IPA using AltStore Classic or another trusted sideloading tool.\n'
  printf 'It cannot be installed directly from Files/Safari and is not a TestFlight upload.\n'
  printf 'Use the same Apple account and bundle identity for updates; do not uninstall to update.\n'
} > out/ios/BUILD-INFO.txt
echo "Created $artifact"
