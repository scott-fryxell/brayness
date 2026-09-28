#!/bin/bash
VAULT="${VAULT:-$(cd "$(dirname "$0")/../../work/vault" && pwd)}"

for section in "01 Projects" "02 Areas" "03 Resources" "04 Archive"; do
  # Prune feeds for empty directories
  for feed in "$VAULT/$section"/*/:feed.md; do
    dir=$(dirname "$feed")
    [ ! -d "$dir" ] && rm "$feed" && echo "Pruned: $feed"
  done

  for dir in "$VAULT/$section"/*/; do
    name=$(basename "$dir")
    cat > "$dir/:feed.md" <<EOF
# ${name} Feed

\`\`\`dataview
TABLE created AS "Date", github AS "Source"
FROM "${section}/${name}"
WHERE file.name != ":feed"
SORT created DESC
\`\`\`
EOF
    echo "Created: $section/$name"
  done
done
