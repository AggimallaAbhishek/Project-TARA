#!/usr/bin/env bash
set -euo pipefail

echo "[dev-up] Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

echo "[dev-up] Rebuilding and starting backend..."
docker compose up -d --build backend

echo "[dev-up] Starting frontend..."
docker compose up -d frontend

echo "[dev-up] Backend container status:"
docker compose ps backend

health_url="http://localhost:8000/health"
echo "[dev-up] Waiting for backend health at ${health_url}..."

attempt=1
max_attempts=20

until curl -fsS "${health_url}" >/dev/null; do
  if (( attempt >= max_attempts )); then
    echo "[dev-up] Backend health check failed after ${max_attempts} attempts." >&2
    echo "[dev-up] Inspect logs with: docker compose logs --tail=200 backend" >&2
    exit 1
  fi
  sleep 2
  ((attempt++))
done

echo "[dev-up] Backend health: OK"
