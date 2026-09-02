#!/usr/bin/env bash
# Block secrets from entering git history.
#
# Two independent checks, both fail-closed:
#   1. Path check   - files that must never be tracked at all (.env, *.db, keys).
#   2. Content check - secret-shaped strings in the staged diff.
#
# Usage:
#   scripts/secret-scan.sh --staged     scan the git index (used by the pre-commit hook)
#   scripts/secret-scan.sh --tracked    scan every tracked file (used by CI)
#
# Exit 0 = clean, 1 = something looks like a secret.

set -uo pipefail

MODE="${1:---staged}"
FAIL=0

red()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }

# ── 1. Paths that must never be tracked ──────────────────────────────────────
# .env.example / .env.docker.example are the documented templates and are allowed.
FORBIDDEN_PATHS='(^|/)\.env(\.[^/]*)?$|\.db$|\.sqlite3?$|\.pem$|\.pfx$|\.p12$|(^|/)id_(rsa|dsa|ecdsa|ed25519)$|(^|/)\.npmrc$|(^|/)\.pypirc$'
ALLOWED_PATHS='\.env\.example$|\.env\.docker\.example$|\.env\.[^/]*\.example$'

if [ "$MODE" = "--staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACMR)
else
  FILES=$(git ls-files)
fi

if [ -n "$FILES" ]; then
  OFFENDING=$(printf '%s\n' "$FILES" | grep -E "$FORBIDDEN_PATHS" | grep -Ev "$ALLOWED_PATHS" || true)
  if [ -n "$OFFENDING" ]; then
    red "BLOCKED: these files must never be committed:"
    printf '%s\n' "$OFFENDING" | sed 's/^/  - /' >&2
    red ""
    red "They are covered by .gitignore; if one is staged it was probably forced"
    red "in with 'git add -f'. Unstage with:  git rm --cached <file>"
    FAIL=1
  fi
fi

# ── 2. Secret-shaped content ─────────────────────────────────────────────────
# Anchored on real provider prefixes and on credentials embedded in URLs, which
# is how this project's Supabase/Postgres passwords would actually escape.
read -r -d '' PATTERNS <<'EOF' || true
GOCSPX-[A-Za-z0-9_-]{10,}
AKIA[0-9A-Z]{16}
ASIA[0-9A-Z]{16}
gh[pousr]_[A-Za-z0-9]{30,}
github_pat_[A-Za-z0-9_]{20,}
xox[baprs]-[A-Za-z0-9-]{10,}
sk-[A-Za-z0-9]{32,}
sk-ant-[A-Za-z0-9_-]{20,}
AIza[0-9A-Za-z_-]{35}
-----BEGIN [A-Z ]*PRIVATE KEY-----
(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://[^\s:@/"']+:[^\s:@/"']{6,}@
eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}
EOF

# Placeholders that legitimately appear in templates and docs.
PLACEHOLDER='your-|replace-with|example\.com|localhost|127\.0\.0\.1|changeme|change-me|xxxx|<[a-z-]+>|REDACTED|\$\{|db\.internal\.acme|secretpass123|SuperSecret123|tara:tara@'

if [ "$MODE" = "--staged" ]; then
  CONTENT=$(git diff --cached --unified=0 -- . | grep -E '^\+' || true)
else
  CONTENT=$(git grep -I -n -e '' -- . 2>/dev/null || true)
fi

if [ -n "$CONTENT" ]; then
  while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue
    # -e is required: patterns such as the PEM header start with '-' and would
    # otherwise be parsed as grep options rather than as a pattern.
    HITS=$(printf '%s\n' "$CONTENT" | grep -EI -e "$pattern" | grep -Ev -e "$PLACEHOLDER" || true)
    if [ -n "$HITS" ]; then
      red "BLOCKED: content matching /$pattern/ :"
      # Redact the matched value itself. This script runs in CI, where echoing
      # the secret would write it into build logs - reproducing the exact leak
      # it exists to prevent. Show only the file/line and the variable name.
      printf '%s\n' "$HITS" | head -5 \
        | sed -E "s/$pattern/<REDACTED-SECRET>/g" \
        | cut -c1-160 | sed 's/^/  /' >&2
      FAIL=1
    fi
  done <<< "$PATTERNS"
fi

if [ "$FAIL" -ne 0 ]; then
  red ""
  red "Commit refused by scripts/secret-scan.sh."
  red "If this is a false positive, rerun with:  git commit --no-verify"
  exit 1
fi

exit 0
