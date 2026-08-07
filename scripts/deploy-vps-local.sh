#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null || fail "git is required."
command -v npm >/dev/null || fail "npm is required."
command -v ssh >/dev/null || fail "ssh is required."
command -v rsync >/dev/null || fail "rsync is required."
command -v curl >/dev/null || fail "curl is required."

test -z "$(git status --porcelain)" || fail "Commit or stash local changes before deploying."

git_sha="$(git rev-parse HEAD)"
origin_main_sha="$(git rev-parse origin/main 2>/dev/null || true)"
test -n "$origin_main_sha" || fail "origin/main is unavailable; fetch it before deploying."
test "$git_sha" = "$origin_main_sha" || fail "The checked-out commit must exactly match origin/main before deploying."

config_file="${VPS_DEPLOY_CONFIG:-$repo_root/.vps-deploy.env}"
test -f "$config_file" || fail "VPS deployment is not configured. Run: npm run deploy:vps:configure"

vps_host=""
vps_user=""
vps_port=""
deploy_path=""
public_base_url=""
deploy_mode=""

while IFS='=' read -r config_key config_value; do
  case "$config_key" in
    ''|'#'*) ;;
    VPS_HOST) vps_host="$config_value" ;;
    VPS_USER) vps_user="$config_value" ;;
    VPS_PORT) vps_port="$config_value" ;;
    VPS_DEPLOY_PATH) deploy_path="$config_value" ;;
    PUBLIC_BASE_URL) public_base_url="$config_value" ;;
    DEPLOY_MODE) deploy_mode="$config_value" ;;
    *) fail "Unknown setting in $config_file: $config_key" ;;
  esac
done < "$config_file"

test -n "$vps_host" || fail "VPS_HOST is missing from $config_file."
test -n "$vps_user" || fail "VPS_USER is missing from $config_file."
test -n "$vps_port" || fail "VPS_PORT is missing from $config_file."
test -n "$deploy_path" || fail "VPS_DEPLOY_PATH is missing from $config_file."
test -n "$public_base_url" || fail "PUBLIC_BASE_URL is missing from $config_file."
test -n "$deploy_mode" || fail "DEPLOY_MODE is missing from $config_file."

[[ "$vps_host" =~ ^[A-Za-z0-9._-]+$ ]] || fail "VPS host contains unsupported characters."
[[ "$vps_user" =~ ^[A-Za-z0-9._-]+$ ]] || fail "SSH user contains unsupported characters."
[[ "$vps_port" =~ ^[0-9]+$ ]] || fail "SSH port must be numeric."
(( 10#$vps_port >= 1 && 10#$vps_port <= 65535 )) || fail "SSH port must be between 1 and 65535."
[[ "$deploy_path" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "Deployment path must be a simple absolute path."
[[ "$deploy_path" != */ && "$deploy_path" != *//* ]] || fail "Deployment path must not end in or contain an empty segment."
[[ ! "$deploy_path" =~ (^|/)\.\.?(/|$) ]] || fail "Deployment path must not contain dot segments."
[[ "$public_base_url" =~ ^https://[^[:space:]]+$ ]] || fail "Public URL must be HTTPS and contain no spaces."
[[ "$deploy_mode" = "managed" || "$deploy_mode" = "direct" ]] || fail "Layout must be managed or direct."

case "$deploy_path" in
  /|/var|/var/www|/srv|/usr|/usr/share|/home) fail "Deployment path is too broad." ;;
esac

printf 'Deploying Voting Topics commit %s\n' "$git_sha"
printf 'Configuration: %s\n' "$config_file"
printf 'Target: %s@%s:%s%s\n' "$vps_user" "$vps_host" "$vps_port" "$deploy_path"
printf 'Public URL: %s\n' "$public_base_url"
printf 'Layout: %s\n' "$deploy_mode"

printf '\nRunning the complete release gate...\n'
npm ci
npm run lint
npm run test:run
npm run check:schemas
npm run test:e2e
npm run build
npm run check:bundle

release_name="${git_sha}-$(date -u +%Y%m%dT%H%M%SZ)"
control_dir="$(mktemp -d)"
control_socket="$control_dir/control-%C"
headers_file="$(mktemp)"
remote="$vps_user@$vps_host"
deployment_activated=false
deployment_verified=false
rollback_completed=false

cleanup() {
  if [ "$deployment_activated" = true ] && [ "$deployment_verified" = false ] && [ "$rollback_completed" = false ]; then
    printf '\nDeployment exited before verification; attempting rollback.\n' >&2
    rollback_site || printf 'Automatic rollback failed. Inspect %s immediately.\n' "$deploy_path" >&2
  fi
  ssh -S "$control_socket" -O exit -p "$vps_port" "$remote" >/dev/null 2>&1 || true
  rm -rf "$control_dir"
  rm -f "$headers_file"
}
trap cleanup EXIT

printf '\nOpening SSH connection. SSH may now ask for your password or key passphrase.\n'
ssh -M -S "$control_socket" -o ControlPersist=600 -p "$vps_port" "$remote" true

ssh_run() {
  ssh -S "$control_socket" -p "$vps_port" "$remote" "$@"
}

rsync_shell="ssh -S $control_socket -p $vps_port"

rollback_site() {
  local rollback_result=0
  if [ "$deploy_mode" = "managed" ]; then
    ssh_run bash -s -- "$deploy_path" <<'REMOTE_ROLLBACK' || rollback_result=$?
set -euo pipefail
deploy_path="$1"
previous="$(cat "$deploy_path/.previous-release")"
test -n "$previous"
test -d "$previous"
ln -sfn "$previous" "$deploy_path/current.next"
mv -Tf "$deploy_path/current.next" "$deploy_path/current"
REMOTE_ROLLBACK
  else
    ssh_run rsync -a --delete "$remote_backup/" "$deploy_path/" || rollback_result=$?
  fi
  test "$rollback_result" -eq 0 || return "$rollback_result"
  rollback_completed=true
}

if [ "$deploy_mode" = "managed" ]; then
  ssh_run bash -s -- "$deploy_path" <<'REMOTE_CHECK'
set -euo pipefail
deploy_path="$1"
test -L "$deploy_path/current"
previous="$(readlink "$deploy_path/current")"
test -n "$previous"
test -d "$previous"
mkdir -p "$deploy_path/releases"
REMOTE_CHECK

  remote_release="$deploy_path/releases/$release_name"
  ssh_run mkdir -p "$remote_release"
  rsync -az --delete -e "$rsync_shell" dist/ "$remote:$remote_release/"
  deployment_activated=true
  ssh_run bash -s -- "$deploy_path" "$remote_release" <<'REMOTE_ACTIVATE'
set -euo pipefail
deploy_path="$1"
release_path="$2"
previous="$(readlink "$deploy_path/current")"
printf '%s' "$previous" > "$deploy_path/.previous-release"
ln -sfn "$release_path" "$deploy_path/current.next"
mv -Tf "$deploy_path/current.next" "$deploy_path/current"
REMOTE_ACTIVATE
else
  remote_parent="${deploy_path%/*}"
  remote_name="${deploy_path##*/}"
  remote_release_root="$remote_parent/.${remote_name}-releases"
  remote_backup="$remote_release_root/$release_name/previous"
  remote_stage="$remote_release_root/$release_name/candidate"

  ssh_run bash -s -- "$deploy_path" "$remote_backup" "$remote_stage" <<'REMOTE_PREPARE'
set -euo pipefail
deploy_path="$1"
backup_path="$2"
stage_path="$3"
test -d "$deploy_path"
test ! -L "$deploy_path"
test -f "$deploy_path/index.html"
test ! -e "$backup_path"
mkdir -p "$backup_path" "$stage_path"
cp -a "$deploy_path/." "$backup_path/"
REMOTE_PREPARE

  rsync -az --delete -e "$rsync_shell" dist/ "$remote:$remote_stage/"
  deployment_activated=true
  ssh_run rsync -a --delete "$remote_stage/" "$deploy_path/"
fi

smoke_passed=false
if curl --fail --silent --show-error --location --retry 4 --retry-delay 2 --retry-all-errors \
  --dump-header "$headers_file" "$public_base_url" >/dev/null \
  && grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "$headers_file" \
  && grep -Eiq '^referrer-policy:' "$headers_file" \
  && grep -Eiq '^content-security-policy:' "$headers_file"; then
  smoke_passed=true
fi

if [ "$smoke_passed" = true ]; then
  deployment_verified=true
  printf '\nDeployment succeeded. Live release: %s\n' "$release_name"
  exit 0
fi

printf '\nSmoke or security-header check failed; restoring the previous site.\n' >&2
rollback_site

curl --fail --silent --show-error --location "$public_base_url" >/dev/null \
  || fail "Rollback ran, but the public URL is still unavailable. Inspect the VPS immediately."
fail "Deployment failed and the previous site was restored."
