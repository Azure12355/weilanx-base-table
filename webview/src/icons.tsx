import type { CSSProperties } from "react";

// 一套统一的 16x16 线性图标,currentColor 着色,尺寸可控。
// 字段类型 / 工具栏 / 状态等都走这里,保证清晰一致。

type PathSpec = { d: string; fill?: string; strokeWidth?: number };

const ICONS: Record<string, PathSpec[]> = {
  // 字段类型
  text: [{ d: "M4 4.5h8M8 4.5V12", strokeWidth: 1.5 }],
  longtext: [{ d: "M3.5 4.5h9M3.5 8h9M3.5 11.5h6", strokeWidth: 1.4 }],
  select: [{ d: "M8 2.5A5.5 5.5 0 1 0 8 13.5 5.5 5.5 0 0 0 8 2.5Z", strokeWidth: 1.3 }, { d: "M8 5.6A2.4 2.4 0 1 0 8 10.4 2.4 2.4 0 0 0 8 5.6Z", fill: "currentColor", strokeWidth: 0 }],
  multi: [{ d: "M6 4.5h7M6 8h7M6 11.5h7", strokeWidth: 1.4 }, { d: "M3 4.5h.01M3 8h.01M3 11.5h.01", strokeWidth: 1.6 }],
  date: [
    { d: "M3.5 4.5h9a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z", strokeWidth: 1.3 },
    { d: "M2.5 7h11M5 3v3M11 3v3", strokeWidth: 1.3 },
  ],
  number: [{ d: "M6 3 5 13M11 3l-1 10M3.5 6h9M3 10h9", strokeWidth: 1.3 }],
  checkbox: [{ d: "M4 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5Z", strokeWidth: 1.3 }, { d: "M5.5 8l1.8 1.8L10.8 6", strokeWidth: 1.5 }],
  link: [{ d: "M6.5 9.5 9.5 6.5M7 4.8l.9-.9a2.4 2.4 0 0 1 3.4 3.4l-.9.9M9 11.2l-.9.9a2.4 2.4 0 0 1-3.4-3.4l.9-.9", strokeWidth: 1.4 }],

  // 工具栏
  add: [{ d: "M8 3.5v9M3.5 8h9", strokeWidth: 1.5 }],
  filter: [{ d: "M2.5 4h11l-4.2 5v3.2l-2.6 1.3V9L2.5 4Z", strokeWidth: 1.3 }],
  sort: [{ d: "M5 3.5v9M5 12.5 3 10.5M5 12.5 7 10.5M11 12.5v-9M11 3.5 9 5.5M11 3.5 13 5.5", strokeWidth: 1.3 }],
  group: [{ d: "M2.5 3.5h11M2.5 7h11M2.5 10.5h6M2.5 13.5h6", strokeWidth: 1.3 }],
  fields: [{ d: "M2.5 3.5h11v9h-11z", strokeWidth: 1.3 }, { d: "M6 3.5v9M10 3.5v9", strokeWidth: 1.2 }],
  rowHeight: [{ d: "M8 2.5v11M8 2.5 6 4.5M8 2.5 10 4.5M8 13.5 6 11.5M8 13.5 10 11.5M2.5 8h3M10.5 8h3", strokeWidth: 1.3 }],
  download: [{ d: "M8 2.5v7.5M8 10 5 7M8 10l3-3M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1", strokeWidth: 1.3 }],
  undo: [{ d: "M5 5.5H9.5a3.5 3.5 0 0 1 0 7H5.5M5 5.5 7.5 3M5 5.5 7.5 8", strokeWidth: 1.4 }],
  redo: [{ d: "M11 5.5H6.5a3.5 3.5 0 0 0 0 7H10.5M11 5.5 8.5 3M11 5.5 8.5 8", strokeWidth: 1.4 }],

  // 状态 / 操作
  star: [{ d: "M8 1.8l1.78 3.6 3.97.58-2.87 2.8.68 3.95L8 10.84 4.44 12.71l.68-3.95-2.87-2.8 3.97-.58z", fill: "currentColor", strokeWidth: 0.4 }],
  snow: [
    {
      d: "M8 2v12M2.8 5l10.4 6M13.2 5 2.8 11M8 2 6.2 3.8M8 2 9.8 3.8M8 14l-1.8-1.8M8 14l1.8-1.8M2.8 5l.2 2.3M2.8 5l2.3-.2M13.2 11l-.2-2.3M13.2 11l-2.3.2M13.2 5l-.2 2.3M13.2 5l-2.3-.2M2.8 11l.2-2.3M2.8 11l2.3.2",
      strokeWidth: 1.05,
    },
  ],
  caret: [{ d: "M4 6l4 4 4-4", strokeWidth: 1.4 }],
  grip: [
    { d: "M6 3.3h.01M10 3.3h.01M6 8h.01M10 8h.01M6 12.7h.01M10 12.7h.01", strokeWidth: 2.1 },
  ],
  edit: [{ d: "M10.5 3.2l2.3 2.3M11.5 2.2 13.8 4.5 6 12.3l-3 .7.7-3L11.5 2.2Z", strokeWidth: 1.3 }],
  eye: [{ d: "M1.8 8S4.2 3.8 8 3.8 14.2 8 14.2 8 11.8 12.2 8 12.2 1.8 8 1.8 8Z", strokeWidth: 1.3 }, { d: "M8 6A2 2 0 1 0 8 10 2 2 0 0 0 8 6Z", strokeWidth: 1.3 }],
  eyeOff: [{ d: "M6.3 4.1A6.3 6.3 0 0 1 8 3.8C11.8 3.8 14.2 8 14.2 8a11 11 0 0 1-2 2.4M3.6 5.6A11 11 0 0 0 1.8 8S4.2 12.2 8 12.2a6.2 6.2 0 0 0 2-.33M2.5 2.5l11 11", strokeWidth: 1.3 }],
  trash: [{ d: "M3.5 4.5h9M6 4.5V3.3a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8v1.2M5 4.5l.6 8a1 1 0 0 0 1 .9h2.8a1 1 0 0 0 1-.9l.6-8", strokeWidth: 1.3 }],
  arrowUp: [{ d: "M8 12.5v-9M8 3.5 4.5 7M8 3.5 11.5 7", strokeWidth: 1.4 }],
  arrowDown: [{ d: "M8 3.5v9M8 12.5 4.5 9M8 12.5 11.5 9", strokeWidth: 1.4 }],
  alignLeft: [{ d: "M3 4h10M3 7h6M3 10h8M3 13h5", strokeWidth: 1.4 }],
  alignCenter: [{ d: "M3 4h10M5 7h6M4 10h8M5.5 13h5", strokeWidth: 1.4 }],
  alignRight: [{ d: "M3 4h10M7 7h6M5 10h8M8 13h5", strokeWidth: 1.4 }],
  copy: [{ d: "M5.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z", strokeWidth: 1.3 }, { d: "M3.5 10.5h-.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v.5", strokeWidth: 1.3 }],
  insertLeft: [{ d: "M9.5 3.5h3v9h-3zM5.5 8h-3M5.5 8 7.5 6M5.5 8 7.5 10", strokeWidth: 1.3 }],
  insertRight: [{ d: "M3.5 3.5h3v9h-3zM10.5 8h3M10.5 8 8.5 6M10.5 8 8.5 10", strokeWidth: 1.3 }],
  hide: [{ d: "M6.3 4.1A6.3 6.3 0 0 1 8 3.8C11.8 3.8 14.2 8 14.2 8a11 11 0 0 1-2 2.4M3.6 5.6A11 11 0 0 0 1.8 8S4.2 12.2 8 12.2a6.2 6.2 0 0 0 2-.33M2.5 2.5l11 11", strokeWidth: 1.3 }],
};

interface Props {
  name: keyof typeof ICONS | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, className, style }: Props) {
  const paths = ICONS[name] ?? ICONS.text;
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill ?? "none"} strokeWidth={p.strokeWidth ?? 1.3} />
      ))}
    </svg>
  );
}

/** 下拉箭头(复用 caret) */
export const Caret = ({ size = 12 }: { size?: number }) => <Icon name="caret" size={size} className="caret-svg" />;
