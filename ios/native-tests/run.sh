#!/bin/sh
set -eu

test_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/rvlry-native-tests.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT HUP INT TERM

xcrun swiftc -swift-version 5 -O \
  "$test_dir/../App/App/RvlryDatabase.swift" \
  "$test_dir/StorageTests.swift" \
  -lsqlite3 -o "$build_dir/rvlry-storage-tests"
"$build_dir/rvlry-storage-tests"
