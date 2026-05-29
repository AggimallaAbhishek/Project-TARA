#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
BACKEND_DIR="$(cd -- "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="$PYTHON"
elif [[ -x "$BACKEND_DIR/venv/bin/python" ]]; then
  PYTHON_BIN="$BACKEND_DIR/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "No Python interpreter found. Set PYTHON or install python3." >&2
  exit 1
fi

if ! "$PYTHON_BIN" -m pip_audit --version >/dev/null 2>&1; then
  echo "pip-audit is not installed for $PYTHON_BIN. Run: $PYTHON_BIN -m pip install -r requirements-dev.txt" >&2
  exit 1
fi

"$PYTHON_BIN" -m pip_audit -r "$BACKEND_DIR/requirements.txt"
