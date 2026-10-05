import type { FieldDef, FieldType } from "../../src/base/types";

export interface UIConfig {
  rowHeight: "compact" | "medium" | "tall";
  showRowNumbers: boolean;
  fontSize: number; // 0 = 跟随编辑器
  colorfulTags: boolean;
  wrapText: boolean;
}

export const defaultConfig: UIConfig = {
  rowHeight: "medium",
  showRowNumbers: true,
  fontSize: 0,
  colorfulTags: true,
  wrapText: false,
};

export const ROW_HEIGHT_PX: Record<UIConfig["rowHeight"], number> = {
  compact: 30,
  medium: 38,
  tall: 54,
};

// 跟随主题的图表色系;[主题变量, 无主题时的兜底色]
const PALETTE: [string, string][] = [
  ["--vscode-charts-blue", "#4a9eff"],
  ["--vscode-charts-green", "#89d185"],
  ["--vscode-charts-orange", "#e8a44c"],
  ["--vscode-charts-purple", "#b180d7"],
  ["--vscode-charts-red", "#f14c4c"],
  ["--vscode-charts-yellow", "#d6b656"],
];

// 颜色名(_base.md 的 colors 可写)→ [主题变量, 兜底色]
const NAMED: Record<string, [string, string]> = {
  blue: ["--vscode-charts-blue", "#4a9eff"],
  green: ["--vscode-charts-green", "#89d185"],
  orange: ["--vscode-charts-orange", "#e8a44c"],
  purple: ["--vscode-charts-purple", "#b180d7"],
  red: ["--vscode-charts-red", "#f14c4c"],
  yellow: ["--vscode-charts-yellow", "#d6b656"],
  gray: ["--vscode-descriptionForeground", "#9a9a9a"],
  grey: ["--vscode-descriptionForeground", "#9a9a9a"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 某个选项的标签配色(浅底 + 同色字),优先 colors 配置,否则按名字 hash 分配 */
export function tagStyle(
  option: string,
  def: FieldDef,
  colorful: boolean
): { background: string; color: string } {
  if (!colorful) {
    return {
      background: "var(--vscode-badge-background, #4d4d4d)",
      color: "var(--vscode-badge-foreground, #fff)",
    };
  }
  const named = def.colors?.[option];
  const pair = (named && NAMED[named]) || PALETTE[hash(option) % PALETTE.length];
  const base = `var(${pair[0]}, ${pair[1]})`;
  return {
    background: `color-mix(in srgb, ${base} 16%, transparent)`,
    color: base,
  };
}

export const FIELD_ICON: Record<FieldType, string> = {
  text: "A",
  longtext: "¶",
  select: "◉",
  multi: "≣",
  date: "📅",
  number: "#",
  checkbox: "☑",
  link: "🔗",
};
