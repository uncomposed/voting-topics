#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="$repo_root/.vps-deploy.env"

prompt_with_default() {
  local variable_name="$1"
  local prompt_text="$2"
  local default_value="$3"
  local entered_value

  read -r -p "$prompt_text [$default_value]: " entered_value
  printf -v "$variable_name" '%s' "${entered_value:-$default_value}"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

printf 'Configure the non-secret target used by npm run deploy:vps.\n'
printf 'The SSH password or key passphrase is never saved here.\n\n'

read -r -p "VPS host name or IP: " vps_host
read -r -p "SSH user: " vps_user
prompt_with_default vps_port "SSH port" "22"
read -r -p "Exact absolute deployment path: " deploy_path
read -r -p "Public HTTPS URL: " public_base_url
prompt_with_default deploy_mode "Layout (managed or direct)" "direct"

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

printf '\nTarget: %s@%s:%s%s\n' "$vps_user" "$vps_host" "$vps_port" "$deploy_path"
printf 'Public URL: %s\n' "$public_base_url"
printf 'Layout: %s\n' "$deploy_mode"
read -r -p "Type the exact deployment path to save this configuration: " confirmed_path
test "$confirmed_path" = "$deploy_path" || fail "Deployment path confirmation did not match."

umask 077
temporary_file="$(mktemp "$config_file.tmp.XXXXXX")"
cleanup() {
  rm -f "$temporary_file"
}
trap cleanup EXIT

{
  printf 'VPS_HOST=%s\n' "$vps_host"
  printf 'VPS_USER=%s\n' "$vps_user"
  printf 'VPS_PORT=%s\n' "$vps_port"
  printf 'VPS_DEPLOY_PATH=%s\n' "$deploy_path"
  printf 'PUBLIC_BASE_URL=%s\n' "$public_base_url"
  printf 'DEPLOY_MODE=%s\n' "$deploy_mode"
} > "$temporary_file"

mv "$temporary_file" "$config_file"
chmod 600 "$config_file"
trap - EXIT

printf '\nSaved %s\n' "$config_file"
printf 'Future deployments need one command: npm run deploy:vps\n'
printf 'SSH will ask for the password or private-key passphrase when needed.\n'
