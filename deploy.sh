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

mkdir -p "$DEST"
tar -C "$CLONE" \
  --exclude .env \
  --exclude server/.env \
  --exclude node_modules \
  --exclude server/node_modules \
  --exclude storage \
  --exclude server/storage \
  -cf - . | tar -C "$DEST" -xf -
printf '%s\n' "$SHA" > "$DEST/COMMIT"

if [ "${MEDICONNECT_SKIP_INSTALL:-}" != "1" ] && [ -f "$DEST/server/package.json" ]; then
  npm install --omit=dev --prefix "$DEST/server"
fi

if [ "${MEDICONNECT_SKIP_RESTART:-}" = "1" ]; then
  printf '%s\n' "$SHA"
  exit 0
fi

systemctl restart mediconnect-node
printf '%s\n' "$SHA"
