#!/usr/bin/env bash
set -euo pipefail
# Remove large blobs (>= 100MB) from repository history and push cleaned history.
# WARNING: This rewrites history. Backup first and inform collaborators.

# ...existing checks...
REMOTE_URL=$(git config --get remote.origin.url || true)
if [ -z "$REMOTE_URL" ]; then
  echo "No origin remote configured. Set origin or run this from a clone with origin."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git not found in PATH"
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found. Install it first: https://github.com/newren/git-filter-repo"
  echo "On many systems: pip install git-filter-repo  (or use your package manager)"
  exit 1
fi

read -p "This will rewrite history and force-push to origin. Make a backup and continue? [y/N] " CONF
if [[ "${CONF,,}" != "y" ]]; then
  echo "Aborting."
  exit 0
fi

# create a timestamped bare mirror clone (safe backup)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
MIRROR_DIR="$(pwd)/repo-mirror-${TIMESTAMP}.git"
echo "Cloning a bare mirror to ${MIRROR_DIR} (this may take a while)..."
git clone --mirror "${REMOTE_URL}" "${MIRROR_DIR}"

pushd "${MIRROR_DIR}" >/dev/null

echo "Running git-filter-repo: stripping blobs bigger than 100MB..."
git filter-repo --strip-blobs-bigger-than 100M

echo "Pushing cleaned refs to origin (force)..."
git push --force --all
git push --force --tags

popd >/dev/null

echo "Done. You should now delete your local clone, reclone from origin, and re-create any local branches from the new history."
echo "Mirror backup left at: ${MIRROR_DIR}"
