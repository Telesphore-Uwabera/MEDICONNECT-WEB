#!/usr/bin/env bash
#
# verify-turn.sh — read-only WebRTC relay audit for MediConnect.
#
# It writes nothing, restarts nothing and never prints a secret. Each credential
# is reduced to a short match code, so the relay box and the API box can be
# compared by eye (or by pasting the output into chat) without exposing a
# password. Run it on BOTH servers:
#
#   bash verify-turn.sh
#
set -u

HERE=$(cd "$(dirname "$0")" && pwd)
API_ENV="$HERE/.env"
ROOT_ENV="$HERE/../.env"
# VERIFY_TURN_CONF points the audit at a non-standard config, e.g. a staging copy.
TURN_CONF="${VERIFY_TURN_CONF:-}"
if [ -z "$TURN_CONF" ]; then
  for candidate in /etc/turnserver.conf /etc/coturn/turnserver.conf /usr/local/etc/turnserver.conf; do
    [ -r "$candidate" ] && TURN_CONF="$candidate" && break
  done
fi

title() { printf '\n== %s ==\n' "$1"; }

# Length plus a short digest: enough to prove two values agree, not enough to
# read a password.
code() {
  local hasher
  hasher=$(command -v md5sum || command -v md5 || true)
  if [ -n "$hasher" ]; then printf '%s' "$1" | $hasher | cut -c1-8
  else printf '%s' "$1" | cksum | cut -c1-8; fi
}

value_of() { # file name
  sed -n -E "s/^[[:space:]]*$2[[:space:]]*=//p" "$1" 2>/dev/null | head -1 | tr -d '\r'
}

report() { # file name
  local value
  value=$(value_of "$1" "$2")
  if [ -z "$value" ]; then
    printf '  %-20s unset\n' "$2"
  else
    printf '  %-20s set  %2s chars  code %s\n' "$2" "${#value}" "$(code "$value")"
  fi
}

VAR_LIST="TURN_HOST TURN_URL TURN_PORT TURNS_HOST TURNS_URL TURNS_PORT TURN_SECRET TURN_USERNAME TURN_PASSWORD CALL_TOKEN_SECRET DEPLOY_SECRET PORT WS_PORT DB_HOST DB_DATABASE"

title "1. API environment"
for env_file in "$API_ENV" "$ROOT_ENV"; do
  if [ -r "$env_file" ]; then
    printf '%s (readable)\n' "$env_file"
    for name in $VAR_LIST; do report "$env_file" "$name"; done
  else
    printf '%s (absent)\n' "$env_file"
  fi
done

# .env stopped being tracked by git, so the next `git pull` deletes the repo-root
# copy on this box. Any variable that lives only there would silently vanish.
if [ -r "$API_ENV" ] && [ -r "$ROOT_ENV" ]; then
  only_root=""
  for name in $VAR_LIST; do
    a=$(value_of "$API_ENV" "$name")
    b=$(value_of "$ROOT_ENV" "$name")
    [ -z "$a" ] && [ -n "$b" ] && only_root="$only_root $name"
  done
  if [ -n "$only_root" ]; then
    printf '\n  ACT BEFORE THE NEXT git pull — set only in the repo-root .env, which will be deleted:\n'
    for name in $only_root; do printf '    %s\n' "$name"; done
    printf '    copy each line into %s first, then restart the service.\n' "$API_ENV"
  else
    printf '\n  Nothing depends on the repo-root .env: server/.env covers every variable.\n'
  fi
fi

title "2. coTURN (relay box)"
if [ -z "$TURN_CONF" ]; then
  echo "  No readable turnserver.conf here — this is not the relay box (or it needs sudo)."
else
  echo "  $TURN_CONF"
  for key in use-auth-secret static-auth-secret auth-secret secret listening-port tls-listening-port \
             no-tcp-tls relay-ip external-ip realm stun-loopback fingerprint; do
    line=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$TURN_CONF" | head -1)
    plain=$(grep -E "^[[:space:]]*${key}[[:space:]]*$" "$TURN_CONF" | head -1)
    [ -z "$line" ] && [ -z "$plain" ] && continue
    if [ -n "$plain" ]; then printf '  %-20s enabled (flag, no value)\n' "$key"; continue; fi
    val=${line#*=}
    val=$(printf '%s' "$val" | tr -d '\r' | sed -E 's/^[[:space:]]+//')
    case "$key" in
      static-auth-secret) printf '  %-20s set  %2s chars  code %s\n' "$key" "${#val}" "$(code "$val")" ;;
      *) printf '  %-20s %s\n' "$key" "$val" ;;
    esac
  done
  # user= entries are printed as username + code only; the password never appears.
  if grep -qE "^[[:space:]]*user[[:space:]]*=" "$TURN_CONF"; then
    grep -E "^[[:space:]]*user[[:space:]]*=" "$TURN_CONF" | while IFS= read -r line; do
      pair=$(printf '%s' "${line#*=}" | tr -d '\r' | sed -E 's/^[[:space:]]+//')
      user=${pair%%:*}
      pass=${pair#*:}
      if [ "$user" = "$pair" ]; then printf '  user= entry unreadable: %s\n' "$user"; continue; fi
      printf '  user                   %s  password %2s chars  code %s\n' "$user" "${#pass}" "$(code "$pass")"
    done
  else
    echo "  No static user= entries (so it most likely uses use-auth-secret)."
  fi
fi

title "3. Relay listening and reachability"
if command -v ss >/dev/null 2>&1; then
  udp=$(ss -lun 2>/dev/null | grep -cE ':(3478|5349)$')
  tcp=$(ss -ltn 2>/dev/null | grep -cE ':(3478|5349)$')
  printf '  UDP sockets on 3478/5349: %s\n' "$udp"
  printf '  TCP sockets on 3478/5349: %s   (TCP 5349 is what makes turns: usable)\n' "$tcp"
  [ "$udp" = "0" ] && echo "  Relay is not listening on UDP here — start coturn or this is the wrong box."
  [ "$tcp" = "0" ] && echo "  Nothing listening over TCP — mobile-data callers may still fail even with correct credentials."
fi
command -v systemctl >/dev/null 2>&1 && printf '  coturn service: %s\n' "$(systemctl is-active coturn 2>/dev/null || echo unknown)"
[ -r /etc/ufw/ufw.conf ] && printf '  firewall file present (/etc/ufw/ufw.conf); show rules with: sudo ufw status\n'

title "4. What the running API is actually shipping"
port=$(value_of "$API_ENV" PORT); port=${port:-4000}
json=$(curl -s -m 5 "http://127.0.0.1:${port}/api/v1/public/consultations/relay-health" 2>/dev/null || true)
if printf '%s' "$json" | grep -q '"credential_mode"'; then
  printf '%s\n' "$json" | sed -E 's/,"checks":\[.*\]/\n/' | head -2
  echo "  Full detail: curl -s http://127.0.0.1:${port}/api/v1/public/consultations/relay-health | python3 -m json.tool"
elif printf '%s' "$json" | grep -qi 'no .*route\|404'; then
  echo "  /relay-health is not in the running build yet — deploy this branch, then re-run."
else
  echo "  No answer from 127.0.0.1:${port}. Is the API running on this box?"
fi

title "5. Verdict"
env_secret=$(value_of "$API_ENV" TURN_SECRET)
[ -z "$env_secret" ] && env_secret=$(value_of "$ROOT_ENV" TURN_SECRET)
env_pass=$(value_of "$API_ENV" TURN_PASSWORD)
[ -z "$env_pass" ] && env_pass=$(value_of "$ROOT_ENV" TURN_PASSWORD)
conf_secret=""
conf_users=""
if [ -n "$TURN_CONF" ]; then
  conf_secret=$(value_of "$TURN_CONF" static-auth-secret)
  conf_users=$(grep -E "^[[:space:]]*user[[:space:]]*=" "$TURN_CONF" | tr -d '\r' | cut -d= -f2-)
fi

uses_auth_secret=no
[ -n "$TURN_CONF" ] && grep -qE "^[[:space:]]*use-auth-secret" "$TURN_CONF" && uses_auth_secret=yes

if [ "$uses_auth_secret" = "yes" ]; then
  if [ -n "$env_secret" ] && [ -n "$conf_secret" ]; then
    if [ "$(code "$env_secret")" = "$(code "$conf_secret")" ]; then
      echo "  MATCH: TURN_SECRET equals coTURN's static-auth-secret. Calls should obtain relay candidates."
    else
      echo "  MISMATCH: the API signs with a different secret than coTURN expects."
      echo "    env code   $(code "$env_secret")"
      echo "    relay code $(code "$conf_secret")"
      echo "    set TURN_SECRET in $API_ENV to the relay's static-auth-secret, then restart."
    fi
  elif [ -z "$env_secret" ]; then
    echo "  coTURN uses use-auth-secret but the API has no TURN_SECRET, so every allocation is rejected."
    echo "    set TURN_SECRET=<relay static-auth-secret> in $API_ENV, then restart."
  fi
elif [ -n "$conf_users" ] || [ -n "$env_pass" ]; then
  matched=no
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    relay_pass=${entry#*:}
    [ "$relay_pass" = "$entry" ] && continue
    if [ -n "$env_pass" ] && [ "$(code "$env_pass")" = "$(code "$relay_pass")" ]; then matched=yes; fi
  done <<EOF
$conf_users
EOF
  if [ "$matched" = "yes" ]; then
    echo "  MATCH: TURN_USERNAME/TURN_PASSWORD agrees with a user= entry on this relay."
  elif [ -z "$env_pass" ]; then
    echo "  The relay lists static user= entries but the API sends no TURN_PASSWORD, so the relay"
    echo "  rejects every allocation. Set TURN_USERNAME and TURN_PASSWORD in $API_ENV, then restart."
  elif [ -z "$conf_users" ]; then
    echo "  TURN_PASSWORD is set but this relay config has no user= entry to match it against."
    echo "  If the relay uses use-auth-secret, replace TURN_PASSWORD with TURN_SECRET."
  else
    echo "  MISMATCH: TURN_PASSWORD equals none of the relay's user= passwords."
    echo "    env code $(code "$env_pass") — compare with the user= codes in section 2."
    echo "    copy the relay's password into TURN_PASSWORD, or move the relay to use-auth-secret."
  fi
fi

if [ -z "$TURN_CONF" ]; then
  echo "  Relay config is on the other box: run this script there too and compare the"
  echo "  codes it prints for static-auth-secret / user= against TURN_SECRET / TURN_PASSWORD here."
fi

printf '\nShare this output freely — it contains codes and lengths, never the values.\n'
