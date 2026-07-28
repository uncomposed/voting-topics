# VPS deployment

The `Deploy to VPS` workflow remains manual and must not run until the MVP studio branch is merged and the documented five-creator/ten-peer direct, mixed, and chatbot-assisted pilot passes. The dispatcher must type `PILOT-PASSED`; this is an explicit human gate, not an automated substitute for pilot evidence. The workflow reruns lint, unit tests, schema-drift checks, build, and bundle budget, uploads to an immutable release directory, atomically switches a `current` symlink, checks the public URL and required security headers, and restores the previous symlink if any check fails.

## Required GitHub Actions secrets

| Secret | Meaning |
| --- | --- |
| `VPS_HOST` | SSH host name or address |
| `VPS_PORT` | SSH port, usually `22` |
| `VPS_USER` | Restricted deployment user |
| `VPS_SSH_PRIVATE_KEY` | Private key for that user |
| `VPS_KNOWN_HOSTS` | Pinned `known_hosts` entry; do not generate it with an unverified runtime scan |
| `VPS_DEPLOY_PATH` | Absolute release root, for example `/var/www/trusted-voter-guide` |
| `PUBLIC_BASE_URL` | HTTPS URL used for the post-switch smoke test |

The web server should serve `VPS_DEPLOY_PATH/current` and fall back to `index.html` for application paths. The deployment user needs write access to the release root but does not need root access.

## First deployment

1. Configure the web server and all seven repository secrets.
2. Complete the evidence and release decision in `docs/mvp-pilot.md`, run **Deploy to VPS** against `main`, and enter `PILOT-PASSED`.
3. Confirm the workflow's smoke and security-header checks (`Content-Security-Policy`, `Referrer-Policy`, and `X-Content-Type-Options: nosniff`).
4. Manually complete the peer loop from a separate browser profile and confirm the reopened fork’s digest and change summary.

No deployment is considered configured merely because the workflow file exists. Missing secrets fail before upload, and a failed public smoke check triggers rollback and fails the run.
