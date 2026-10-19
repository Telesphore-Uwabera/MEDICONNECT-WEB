#!/usr/bin/env bash
#
# setup-turn-auth.sh — put MediConnect's video relay on shared-secret TURN auth.
#
# Why this exists: the API currently ships a static username/password, coTURN
# answers 401 to it, and no cross-network call can get a relay candidate. Static
# relay passwords also have to travel inside every call token, so anyone in a
# consultation can decode them from devtools. coTURN's use-auth-secret fixes both
# at once: the API signs a short-lived credential per call and the shared secret
# never reaches a browser.
#
#   On the relay box (197.243.29.114):
#       sudo bash setup-turn-auth.sh relay --generate
#   On the API box (prints the same secret once; paste it when asked):
#       bash setup-turn-auth.sh api
#
# Flags:
#   --generate  create a fresh secret instead of typing one (prints it once)
#   --open-tls  also allow TCP 5349 through ufw (relay box, carriers that drop UDP)
#   --dry-run   show the edits and skip every write, restart and firewall change
#
# Every edit is backed up first, and a coturn that fails to restart is rolled
# back automatically. Nothing here prints a secret except the one-time handoff.
#
set -u

MODE=${1:-}
shift 2>/dev/null || true
GENERATE=no
OPEN_TLS=no
DRY=no
for flag in "$@"; do
  case "$flag" in
    --generate) GENERATE=yes ;;
    --open-tls) OPEN_TLS=yes ;;
    --dry-run) DRY=yes ;;
    *) echo "Unknown flag: $flag" >&2; exit 2 ;;
  esac
done

HERE=$(cd "$(dirname "$0")" && pwd)
MARK="setup-turn-auth"
run() { # command...
  if [ "$DRY" = "yes" ]; then echo "  [dry-run] $*"; return 0; fi
  "$@"
}
step() { printf '\n== %s ==\n' "$1"; }

# Append with a rehearsal path: --dry-run must show exactly what would be written,
# otherwise a syntax error in the block is only discovered on the live box.
append_block() { # file
  local target=$1 block
  block=$(cat)
  if [ "$DRY" = "yes" ]; then
    printf '  [dry-run] would append to %s:\n' "$target"
    printf '%s\n' "$block" | sed 's/^/    | /'
  else
    printf '%s\n' "$block" >> "$target"
  fi
}

case "$MODE" in
  relay|api) ;;
  *) sed -n '2,30p' "$0"; exit 2 ;;
esac

# ── obtain the shared secret without ever putting it in shell history ─────────
if [ "$GENERATE" = "yes" ]; then
  SECRET=$(openssl rand -hex 24)
  echo "Generated secret (enter it on the other box, then destroy this terminal's scrollback):"
  echo "  $SECRET"
else
  read -rs -p "Shared TURN secret (input hidden): " SECRET; echo
fi
[ -n "${SECRET:-}" ] || { echo "No secret supplied."; exit 1; }
if [ "${#SECRET}" -lt 32 ]; then echo "Refusing a secret shorter than 32 characters."; exit 1; fi

if [ "$MODE" = "relay" ]; then
  CONF=${VERIFY_TURN_CONF:-}
  if [ -z "$CONF" ]; then
    for candidate in /etc/turnserver.conf /etc/coturn/turnserver.conf /usr/local/etc/turnserver.conf; do
      [ -r "$candidate" ] && CONF="$candidate" && break
    done
  fi
  [ -n "$CONF" ] || { echo "No readable turnserver.conf found. Set VERIFY_TURN_CONF=/path."; exit 1; }
  [ "$(id -u)" = "0" ] || [ "$DRY" = "yes" ] || { echo "Run the relay side with sudo — it writes $CONF."; exit 1; }

  step "coTURN config: $CONF"
  echo "  Auth lines currently present:"
  grep -nE '^[[:space:]]*(use-auth-secret|static-auth-secret|auth-secret|user|no-auth)[[:space:]]*(=|$)' "$CONF" | sed 's/^/    /' || echo "    none"

  BACKUP="$CONF.bak.$(date +%Y%m%d-%H%M%S)"
  run cp -a "$CONF" "$BACKUP"
  [ "$DRY" = "yes" ] || echo "  Backed up to $BACKUP"

  # Retire every competing auth mechanism, commented rather than deleted so the
  # change is readable and reversible in place.
  run sed -i -E "s/^([[:space:]]*(use-auth-secret|static-auth-secret|auth-secret|user|no-auth)([[:space:]]*=|([[:space:]]*\$)))/# $MARK disabled: \1/" "$CONF"

  append_block "$CONF" <<EOF

# Added by $MARK on $(date -u +%Y-%m-%dT%H:%M:%SZ): short-lived relay credentials.
# The API signs them with this secret; the browser never sees the secret itself.
use-auth-secret
static-auth-secret=$SECRET
EOF

  step "Restart coturn (rolls back automatically if it fails)"
  if [ "$DRY" = "yes" ]; then
    echo "  [dry-run] systemctl restart coturn, with rollback"
  else
    if systemctl restart coturn && [ "$(systemctl is-active coturn)" = "active" ]; then
      echo "  coturn restarted and active."
    else
      echo "  coturn failed to start — restoring $BACKUP"
      cp -a "$BACKUP" "$CONF"
      systemctl restart coturn && echo "  Previous config restored and coturn is active again."
      exit 1
    fi
  fi

  if [ "$OPEN_TLS" = "yes" ]; then
    step "Opening TCP 5349 for turns: (carriers that drop UDP 3478)"
    if command -v ufw >/dev/null 2>&1; then
      run ufw allow 5349/tcp comment 'TURN over TLS'
      [ "$DRY" = "yes" ] || ufw status | grep -E '5349' | sed 's/^/  /'
    else
      echo "  ufw not present; open 5349/tcp in whatever firewall this box uses."
    fi
  fi

  step "Listening check"
  command -v ss >/dev/null 2>&1 && ss -lun 2>/dev/null | grep -E ':(3478|5349)' | sed 's/^/  udp /'
  command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -E ':(3478|5349)' | sed 's/^/  tcp /'
  echo "  TCP 5349 above means turns: is now usable; only UDP is fine for the first test."
  exit 0
fi

# ── API box ──────────────────────────────────────────────────────────────────
step "Locate the API environment file"
ENV_FILE=""
for candidate in "$HERE/.env" "$HERE/../.env" /opt/mediconnect-node/server/.env /opt/mediconnect-node/.env; do
  [ -r "$candidate" ] || continue
  if [ -z "$ENV_FILE" ]; then ENV_FILE="$candidate"; fi
  grep -qE '^[[:space:]]*TURN_(USERNAME|PASSWORD|HOST|URL)' "$candidate" && ENV_FILE="$candidate" && break
done
if [ -z "$ENV_FILE" ]; then
  ENV_FILE="$HERE/.env"
  echo "  No existing env file; will create $ENV_FILE"
  run touch "$ENV_FILE"
fi
echo "  Using $ENV_FILE"
grep -nE '^[[:space:]]*(TURN_HOST|TURN_URL|TURN_PORT|TURN_SECRET|TURN_USERNAME|TURN_PASSWORD|TURNS_HOST|CALL_TOKEN_SECRET)' "$ENV_FILE" | sed 's/^/    /' || echo "    no TURN lines yet"

BACKUP="$ENV_FILE.bak.$(date +%Y%m%d-%H%M%S)"
run cp -a "$ENV_FILE" "$BACKUP"
[ "$DRY" = "yes" ] || echo "  Backed up to $BACKUP"

run sed -i -E "s/^([[:space:]]*TURN_(USERNAME|PASSWORD|CREDENTIAL)([[:space:]]*=))/# $MARK disabled: \1/" "$ENV_FILE"
run sed -i -E "/^[[:space:]]*TURN_SECRET[[:space:]]*=/d" "$ENV_FILE"

append_block "$ENV_FILE" <<EOF

# Added by $MARK on $(date -u +%Y-%m-%dT%H:%M:%SZ). iceServers() now signs a
# per-call credential from this secret instead of shipping a static password.
TURN_SECRET=$SECRET
EOF

step "Restart the API"
RESTARTED=no
if command -v systemctl >/dev/null 2>&1; then
  SERVICE=$(systemctl list-units --type=service --all 2>/dev/null | grep -oE '[a-z-]*mediconnect[a-z-]*' | head -1)
  if [ -n "${SERVICE:-}" ]; then
    run systemctl restart "$SERVICE"
    RESTARTED=yes
    [ "$DRY" = "yes" ] || echo "  Restarted $SERVICE."
  fi
fi
if [ "$RESTARTED" = "no" ] && command -v pm2 >/dev/null 2>&1; then
  run pm2 restart all
  RESTARTED=yes
  [ "$DRY" = "yes" ] || echo "  Restarted through pm2."
fi
[ "$RESTARTED" = "no" ] && echo "  No systemd unit or pm2 found — restart the Node process yourself before testing."

step "What the API is now shipping"
PORT=$(sed -n -E 's/^[[:space:]]*PORT[[:space:]]*=//p' "$ENV_FILE" | head -1)
sleep 3
json=$(curl -s -m 10 "http://127.0.0.1:${PORT:-4000}/api/v1/public/consultations/relay-health" 2>/dev/null || true)
if printf '%s' "$json" | grep -q 'credential_mode'; then
  printf '%s' "$json" | grep -oE '"(ok|credential_mode|relays_in_call_token)":("?[^,"]*"?)' | sed 's/^/  /'
  printf '%s' "$json" | grep -oE '"missing":\[[^]]*\]' | sed 's/^/  /'
  if printf '%s' "$json" | grep -q '"credential_mode":"auth-secret"'; then
    echo "  Done. Start a call from a phone on mobile data: the header pill should read Relay."
  else
    echo "  Still not auth-secret — check that this is the env file the service actually reads."
  fi
elif printf '%s' "$json" | grep -qi 'no .*route\|404'; then
  echo "  relay-health is missing from the running build: deploy this branch, then re-run."
else
  echo "  No answer on 127.0.0.1:${PORT:-4000}. Restart the API and re-run this script's last step."
fi
