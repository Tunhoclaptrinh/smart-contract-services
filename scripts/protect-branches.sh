#!/usr/bin/env bash
# Turns on branch protection for `base` and `main` (docs/QUY_TRINH_NHANH.md); a branch the
# repository does not have (service repositories have only `main`) is skipped.
# Usage: scripts/protect-branches.sh <owner>/<repo> [required-check]
# Needs the GitHub CLI (`gh auth login`) with admin rights on the repository.
set -euo pipefail
repo="${1:?usage: $0 <owner>/<repo> [required-check]}"
check="${2:-verify}"
for branch in base main; do
  if ! gh api "repos/${repo}/branches/${branch}" --silent 2>/dev/null; then
    echo "skipped ${repo}@${branch} (no such branch)"
    continue
  fi
  gh api --method PUT "repos/${repo}/branches/${branch}/protection" --input - <<JSON
{
  "required_status_checks": { "strict": true, "contexts": ["${check}"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
  echo "protected ${repo}@${branch}"
done
