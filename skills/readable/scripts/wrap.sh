#!/usr/bin/env bash
#
# Switch markdown between the two wrappings we write in.
#
#   wrap.sh writer notes.md    one line per paragraph, for iA Writer
#   wrap.sh nvim notes.md      hard wrap at 80, what nvim formats on save
#
# --ignore-path /dev/null keeps prettier from silently no-oping on gitignored
# files, which is where a lot of drafting happens.

set -euo pipefail

mode=${1:-}
shift || true

case "$mode" in
  writer) args=(--prose-wrap never) ;;
  nvim) args=(--prose-wrap always --print-width 80) ;;
  *)
    echo "usage: wrap.sh writer|nvim <file.md>..." >&2
    exit 1
    ;;
esac

if [ $# -eq 0 ]; then
  echo "usage: wrap.sh writer|nvim <file.md>..." >&2
  exit 1
fi

npx --no-install prettier "${args[@]}" --ignore-path /dev/null --write "$@"
