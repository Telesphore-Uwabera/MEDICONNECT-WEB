#!/usr/bin/env bash
# Install origin/main into /opt/mediconnect-node and restart the API.
#
# A failed fetch or reset used to sit inside an if/&& list. With set -e that
# failure did not abort, and the script copied the previous tree and restarted
# anyway. A failed update now deletes the shallow clone, clones main again,
# and never copies or restarts unless that clone is usable.
set -euo pipefail

CLONE="${MEDICONNECT_CLONE:-/tmp/mediconnect-deploy}"
DEST="${MEDICONNECT_DEST:-/opt/mediconnect-node}"
BRANCH="${MEDICONNECT_BRANCH:-main}"
DEFAULT_REPO="https://github.com/Telesphore-Uwabera/MEDICONNECT-WEB.git"

repo_url() {
  if [ -n "${MEDICONNECT_REPO:-}" ]; then
    printf '%s\n' "$MEDICONNECT_REPO"
    return 0
  fi
  if [ -d "$CLONE/.git" ]; then
    git -C "$CLONE" remote get-url origin
    return 0
  fi
  if [ -d "$DEST/.git" ]; then
    git -C "$DEST" remote get-url origin
    return 0
  fi
  printf '%s\n' "$DEFAULT_REPO"
}

fresh_clone() {
  local url
  url=$(repo_url)
  rm -rf "$CLONE"
  git clone --depth=1 --branch "$BRANCH" "$url" "$CLONE"
}

update_clone() {
  if [ ! -d "$CLONE/.git" ]; then
    fresh_clone
    return 0
  fi
  # Not an if/&& list: a failed fetch or reset is handled, and a failed
  # reclone aborts before anything is copied.
  if ! git -C "$CLONE" fetch --depth=1 origin "$BRANCH"; then
    fresh_clone
    return 0
  fi
  if ! git -C "$CLONE" reset --hard FETCH_HEAD; then
    fresh_clone
    return 0
  fi
}

update_clone
SHA=$(git -C "$CLONE" rev-parse HEAD)
if [ -n "${MEDICONNECT_EXPECTED_SHA:-}" ] && [ "$SHA" != "$MEDICONNECT_EXPECTED_SHA" ]; then
  echo "Updated clone is ${SHA}, not ${MEDICONNECT_EXPECTED_SHA}. Not copying or restarting." >&2
  exit 1
fi

if [ ! -d "$CLONE/server/src" ]; then
  echo "Clone has no server/src. Not copying or restarting." >&2
  exit 1
fi

# The API lives at /opt/mediconnect-node/src. Copy only that source tree into a
# staging directory and swap it into place. A failed copy leaves the live src.
# Leave the frontend src, .env, and uploaded files where they are.
mkdir -p "$DEST"
STAGE="$DEST/src.next"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$CLONE/server/src/." "$STAGE/"
if [ -d "$DEST/src" ]; then
  rm -rf "$DEST/src.previous"
  mv "$DEST/src" "$DEST/src.previous"
  if ! mv "$STAGE" "$DEST/src"; then
    mv "$DEST/src.previous" "$DEST/src"
    echo "Could not swap in the new source. The previous src is still in place." >&2
    exit 1
  fi
  rm -rf "$DEST/src.previous"
else
  mv "$STAGE" "$DEST/src"
fi
printf '%s\n' "$SHA" > "$DEST/COMMIT"

# Copy the API package files, then install only when that lock hash changed.
# A missing previous hash skips install so the first deploy does not rebuild
# node_modules inside the webhook timeout.
if [ "${MEDICONNECT_SKIP_INSTALL:-}" != "1" ]; then
  PKG="$CLONE/server/package.json"
  LOCK="$CLONE/server/package-lock.json"
  if [ -f "$PKG" ] && [ -f "$LOCK" ]; then
    NEW_LOCK=$(sha256sum "$LOCK" | awk '{print $1}')
    PREVIOUS=""
    if [ -f "$DEST/package-lock.json" ]; then
      PREVIOUS=$(sha256sum "$DEST/package-lock.json" | awk '{print $1}')
    elif [ -f "$DEST/.package-lock.sha" ]; then
      PREVIOUS=$(tr -d '[:space:]' < "$DEST/.package-lock.sha")
    fi
    BACKUP=$(mktemp -d)
    if [ -f "$DEST/package.json" ]; then cp -a "$DEST/package.json" "$BACKUP/package.json"; fi
    if [ -f "$DEST/package-lock.json" ]; then cp -a "$DEST/package-lock.json" "$BACKUP/package-lock.json"; fi
    if cp -a "$PKG" "$DEST/package.json" && cp -a "$LOCK" "$DEST/package-lock.json"; then
      rm -rf "$BACKUP"
      printf '%s\n' "$NEW_LOCK" > "$DEST/.package-lock.sha"
      if [ -n "$PREVIOUS" ] && [ "$NEW_LOCK" != "$PREVIOUS" ]; then
        npm install --omit=dev --prefix "$DEST"
      fi
    else
      echo "Could not copy server package files. Skipping npm install." >&2
      if [ -f "$BACKUP/package.json" ]; then cp -a "$BACKUP/package.json" "$DEST/package.json"; fi
      if [ -f "$BACKUP/package-lock.json" ]; then cp -a "$BACKUP/package-lock.json" "$DEST/package-lock.json"; fi
      rm -rf "$BACKUP"
    fi
  fi
fi

if [ "${MEDICONNECT_SKIP_RESTART:-}" = "1" ]; then
  printf '%s\n' "$SHA"
  exit 0
fi

systemctl restart mediconnect-node
printf '%s\n' "$SHA"
