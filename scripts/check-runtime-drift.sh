#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

require_command() {
  local name="$1"
  if ! command -v "${name}" >/dev/null 2>&1; then
    echo "[runtime-check] missing required command: ${name}" >&2
    exit 1
  fi
}

require_command docker
require_command curl
require_command grep
require_command head

assert_service_uses_latest_image() {
  local service_name="$1"
  local image_tag="$2"

  local container_id
  container_id="$(docker compose ps -q "${service_name}")"
  if [[ -z "${container_id}" ]]; then
    echo "[runtime-check] ${service_name} container is not running." >&2
    exit 1
  fi

  local running_image_id
  running_image_id="$(docker inspect -f '{{.Image}}' "${container_id}")"

  local latest_image_id
  if ! latest_image_id="$(docker image inspect "${image_tag}" -f '{{.Id}}' 2>/dev/null)"; then
    echo "[runtime-check] local image not found for ${image_tag}. Build it first." >&2
    exit 1
  fi

  echo "[runtime-check] ${service_name} running image=${running_image_id}"
  echo "[runtime-check] ${service_name} latest image =${latest_image_id}"

  if [[ "${running_image_id}" != "${latest_image_id}" ]]; then
    echo "[runtime-check] ${service_name} is stale. Recreate with: docker compose up -d --build ${service_name}" >&2
    exit 1
  fi
}

assert_service_uses_latest_image "backend" "project-tara-backend:latest"
assert_service_uses_latest_image "frontend" "project-tara-frontend:latest"

local_bundle=""
if [[ -f "frontend/dist/index.html" ]]; then
  local_bundle="$(grep -Eo 'assets/index-[^"]+\.js' frontend/dist/index.html | head -n1 || true)"
fi

served_bundle="$(docker compose exec -T frontend sh -lc "grep -Eo 'assets/index-[^\"]+\\.js' /usr/share/nginx/html/index.html | head -n1" || true)"

if [[ -n "${local_bundle}" ]]; then
  echo "[runtime-check] local frontend bundle =${local_bundle}"
  echo "[runtime-check] served frontend bundle=${served_bundle}"
  if [[ -z "${served_bundle}" || "${served_bundle}" != "${local_bundle}" ]]; then
    echo "[runtime-check] served frontend bundle does not match local build output." >&2
    echo "[runtime-check] Rebuild/recreate frontend: docker compose up -d --build frontend" >&2
    exit 1
  fi
else
  echo "[runtime-check] local frontend dist not found; skipping bundle hash comparison."
fi

curl -fsS http://localhost:8000/health >/dev/null
echo "[runtime-check] backend health endpoint reachable at /health"
