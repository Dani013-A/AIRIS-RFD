#!/usr/bin/env bash
set -e

# Determine repository root (directory containing this script)
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$ROOT"

# Ensure we are inside a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not a git repository"
  exit 1
fi

# Files that must never be committed (add more as needed)
PROTECTED_FILES=(".env" "firebase_credentials.json" "keystore.jks" "eas.json")

# Check for accidental changes in protected files
for file in "${PROTECTED_FILES[@]}"; do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    if git diff --quiet "$file"; then
      : # no changes
    else
      echo "⚠️ Protected file changed: $file"
      echo "Please revert or stash changes before committing."
      exit 1
    fi
  fi
done

# Run full test suite (unit + API smoke test)
./test_all.sh
./test_api.sh

# If we reach here, all tests passed
echo "=== All tests passed ==="

# Show staged/unstaged changes (excluding protected files)
echo "=== Changed files (git status) ==="
git status -s

# Ask for commit message
read -p "Enter commit message: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
  echo "Commit message cannot be empty"
  exit 1
fi

# Add all changes except protected files
git add .
# Ensure protected files are removed from the index in case they were added accidentally
for file in "${PROTECTED_FILES[@]}"; do
  git reset "$file" || true
done

# Commit and push
git commit -m "$COMMIT_MSG"
git push

echo "✅ Push completed"
