#!/usr/bin/env bash
# Weilanx Base Table installer
# Downloads the latest .vsix from GitHub Releases and installs it into every
# VS Code based editor found on this machine (VS Code, Insiders, Cursor, Windsurf, VSCodium).
#
#   curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
#
# Options (env vars):
#   BT_EDITOR=cursor   only install into this CLI
#   BT_VSIX=./x.vsix   install a local .vsix instead of downloading
set -euo pipefail

REPO="Azure12355/weilanx-base-table"
ASSET="weilanx-base-table.vsix"
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
EXT_ID="weilanx.weilanx-base-table"

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

# 1. 找到可用的编辑器 CLI
candidates=()
if [ -n "${BT_EDITOR:-}" ]; then
  candidates=("$BT_EDITOR")
else
  for cli in code code-insiders cursor windsurf codium; do
    command -v "$cli" >/dev/null 2>&1 && candidates+=("$cli")
  done
  # macOS:CLI 没加进 PATH 时直接用 App 包里的
  for app_cli in \
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
    "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders" \
    "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" \
    "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf"; do
    if [ -x "$app_cli" ]; then
      name="$(basename "$app_cli")"
      if ! printf '%s\n' "${candidates[@]:-}" | grep -qx "$name"; then candidates+=("$app_cli"); fi
    fi
  done
fi
[ "${#candidates[@]}" -gt 0 ] || die "No VS Code based editor CLI found. Install VS Code and enable the 'code' command, or set BT_EDITOR."

# 2. 准备 .vsix
if [ -n "${BT_VSIX:-}" ]; then
  vsix="$BT_VSIX"
  [ -f "$vsix" ] || die "BT_VSIX not found: $vsix"
else
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  vsix="$tmp/$ASSET"
  say "Downloading $URL"
  curl -fsSL -o "$vsix" "$URL" || die "Download failed. Check https://github.com/${REPO}/releases"
fi

# 3. 安装并校验
installed=0
for cli in "${candidates[@]}"; do
  say "Installing into $(basename "$cli")"
  if "$cli" --install-extension "$vsix" --force >/dev/null 2>&1 \
    && "$cli" --list-extensions 2>/dev/null | grep -qi "^${EXT_ID}$"; then
    installed=$((installed + 1))
  else
    printf '   skipped: %s could not install the extension\n' "$cli"
  fi
done

[ "$installed" -gt 0 ] || die "Installation failed in every editor."
say "Done. Installed into $installed editor(s)."
say "Run 'Developer: Reload Window' in your editor, then open any .base file."
