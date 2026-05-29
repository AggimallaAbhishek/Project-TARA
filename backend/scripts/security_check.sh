#!/usr/bin/env bash
set -euo pipefail

if ! python -m pip_audit --version >/dev/null 2>&1; then
  echo "pip-audit is not installed. Run: pip install -r requirements-dev.txt" >&2
  exit 1
fi

python -m pip_audit -r requirements.txt
