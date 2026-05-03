#!/usr/bin/env bash
# Build MkReader Android APK on the Ubuntu server, deliver to ~/sync/.
#
# Used by Windows-side `npm run android:install:remote` via SSH trigger.
# Local Windows Gradle is permanently broken by an OS-level AF_UNIX hook;
# this server does the actual build, syncthing carries the APK back.
#
# Usage:
#   bash ~/mkreader/scripts/build-android-remote.sh [BRANCH]
#
# Default BRANCH: master
#
# Output:
#   ~/sync/mkreader-debug.apk         (the APK)
#   ~/sync/mkreader-debug.apk.md5     (md5 hash for Windows-side verification)
#
# Failure modes (all caught by `set -euo pipefail`):
#   - keystores/mkreader-debug.keystore missing → exit 1 (restore from ~/sync/)
#   - npm install / vite build / gradle assembleDebug failure → exit non-zero
#   - apksigner verification mismatch → exit 1

set -euo pipefail

BRANCH="${1:-master}"
REPO_DIR="$HOME/mkreader"
KEYSTORE="$REPO_DIR/keystores/mkreader-debug.keystore"
SYNC_DIR="$HOME/sync"
APK_OUT="$SYNC_DIR/mkreader-debug.apk"
MD5_OUT="$SYNC_DIR/mkreader-debug.apk.md5"

# Ensure ANDROID_HOME / PATH set (non-interactive ssh doesn't source ~/.bashrc)
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/36.0.0:$PATH"

ts() { date '+%H:%M:%S'; }
step() { echo ""; echo "[$(ts)] $1"; }

# Clone if first time
if [ ! -d "$REPO_DIR/.git" ]; then
    step "first-time clone (no $REPO_DIR/.git)"
    git clone https://github.com/nbssdlkm/mkreader.git "$REPO_DIR"
fi

cd "$REPO_DIR"

step "[1/6] git fetch + reset to origin/$BRANCH"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
git log --oneline -1

step "[2/6] keystore precondition"
if [ ! -f "$KEYSTORE" ]; then
    echo "ERROR: keystore missing at $KEYSTORE" >&2
    echo "Restore from $SYNC_DIR/mkreader-debug.keystore (auto-synced from D:\\sync\\)" >&2
    if [ -f "$SYNC_DIR/mkreader-debug.keystore" ]; then
        echo "Found in sync — auto-restoring..."
        mkdir -p "$REPO_DIR/keystores"
        cp "$SYNC_DIR/mkreader-debug.keystore" "$KEYSTORE"
    else
        exit 1
    fi
fi
ls -la "$KEYSTORE"

step "[3/6] npm install (incremental — fast if lockfile unchanged)"
npm install --no-audit --no-fund --silent

step "[4/6] vite build + cap sync"
npm run build 2>&1 | tail -3
npx cap sync android 2>&1 | tail -2

step "[5/6] gradle assembleDebug"
cd android
./gradlew assembleDebug 2>&1 | tail -5

step "[6/6] verify signature + deliver"
APK_BUILT="app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK_BUILT" ] || { echo "ERROR: APK not produced at $APK_BUILT" >&2; exit 1; }
ls -la "$APK_BUILT"

# Confirm signature matches our pinned keystore (defensive — should always pass)
EXPECTED_SHA256_HEX=$(keytool -list -v -keystore "$KEYSTORE" -storepass mkreader 2>&1 \
    | grep 'SHA256:' | head -1 | awk '{print $2}' | tr -d ':' | tr '[:upper:]' '[:lower:]')
ACTUAL_SHA256_HEX=$(apksigner verify --print-certs "$APK_BUILT" 2>&1 \
    | grep 'SHA-256 digest:' | head -1 | awk '{print $NF}' | tr '[:upper:]' '[:lower:]')

if [ "$EXPECTED_SHA256_HEX" != "$ACTUAL_SHA256_HEX" ]; then
    echo "ERROR: APK signature SHA-256 ($ACTUAL_SHA256_HEX)" >&2
    echo "       does not match keystore SHA-256 ($EXPECTED_SHA256_HEX)" >&2
    echo "       Build is using the wrong keystore — check android/app/build.gradle" >&2
    exit 1
fi
echo "signature OK: $ACTUAL_SHA256_HEX"

# Deliver
cp "$APK_BUILT" "$APK_OUT"
md5sum "$APK_OUT" | tee "$MD5_OUT"
ls -la "$APK_OUT" "$MD5_OUT"
echo ""
echo "[$(ts)] BUILD COMPLETE"
