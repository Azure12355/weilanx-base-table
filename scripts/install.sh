#!/usr/bin/env bash
# Weilanx Base Table installer
# Downloads the latest .vsix from GitHub Releases and installs it into every
# VS Code based editor found on this machine (VS Code, Insiders, Cursor, Windsurf, VSCodium).
#
#   curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
#
# Obsidian: pass the vault path to install the Obsidian plugin instead
#   curl -fsSL .../install.sh | bash -s -- --obsidian "/path/to/vault"
#
# Options (env vars):
#   BT_EDITOR=cursor   only install into this CLI
#   BT_VSIX=./x.vsix   install a local .vsix instead of downloading
set -euo pipefail

REPO="Azure12355/weilanx-base-table"
ASSET="weilanx-base-table.vsix"
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
EXT_ID="weilanx.weilanx-base-table"

RELEASE="https://github.com/${REPO}/releases/latest/download"
OBSIDIAN_ID="weilanx-base-table"

say() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

# Obsidian 模式:下载 main.js / manifest.json / styles.css 到 <库>/.obsidian/plugins/<id>/ 并启用
install_obsidian() {
  local vault="$1"
  [ -d "$vault" ] || die "Vault not found: $vault"
  [ -d "$vault/.obsidian" ] || die "$vault is not an Obsidian vault (no .obsidian folder). Open it in Obsidian once first."
  local dir="$vault/.obsidian/plugins/$OBSIDIAN_ID"
  mkdir -p "$dir"
  for f in main.js manifest.json styles.css; do
    say "Downloading $f"
    curl -fsSL -o "$dir/$f" "$RELEASE/$f" || die "Download failed: $RELEASE/$f"
  done
  local list="$vault/.obsidian/community-plugins.json"
  if [ -f "$list" ] && grep -q "\"$OBSIDIAN_ID\"" "$list"; then
    :
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$list" "$OBSIDIAN_ID" <<'PY'
import json, os, sys
path, pid = sys.argv[1], sys.argv[2]
ids = json.load(open(path)) if os.path.exists(path) else []
if pid not in ids:
    ids.append(pid)
json.dump(ids, open(path, "w"), indent=2)
PY
  else
    printf '   could not enable automatically: add "%s" in Settings > Community plugins\n' "$OBSIDIAN_ID"
  fi
  say "Installed into $dir"
  say "Restart Obsidian (or toggle the plugin in Settings > Community plugins), then open any .wbase file."
  say "If Restricted mode is on, turn it off in Settings > Community plugins first."
  exit 0
}
if [ "${1:-}" = "--obsidian" ]; then
  [ -n "${2:-}" ] || die "Usage: install.sh --obsidian /path/to/vault"
  install_obsidian "$2"
fi

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
say "Run 'Developer: Reload Window' in your editor, then open any .wbase file."
