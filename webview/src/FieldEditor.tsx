import { useState } from "react";
import type { DateFormat, FieldDef, FieldType, NumberStyle } from "../../src/base/types";
import { Icon } from "./icons";

const TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: "text", label: "文本", icon: "A" },
  { value: "longtext", label: "长文本", icon: "¶" },
  { value: "select", label: "单选", icon: "◉" },
  { value: "multi", label: "多选", icon: "≣" },
  { value: "date", label: "日期", icon: "📅" },
  { value: "number", label: "数字", icon: "#" },
  { value: "checkbox", label: "复选", icon: "☑" },
  { value: "link", label: "链接", icon: "🔗" },
];

// 与 config.ts 的标签色系一致
const COLOR_HEX: Record<string, string> = {
  blue: "#4a9eff",
  green: "#89d185",
  orange: "#e8a44c",
  purple: "#b180d7",
  red: "#f14c4c",
  yellow: "#d6b656",
  gray: "#9a9a9a",
};
const COLOR_NAMES = Object.keys(COLOR_HEX);

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: "iso", label: "2026-09-20" },
  { value: "slash", label: "2026/09/20" },
  { value: "us", label: "09/20/2026" },
  { value: "cn", label: "2026年9月20日" },
  { value: "cn-short", label: "9月20日" },
];

const NUMBER_STYLES: { value: NumberStyle; label: string }[] = [
  { value: "plain", label: "数值" },
  { value: "percent", label: "百分比" },
  { value: "currency", label: "货币" },
];

interface Props {
  name: string;
  def: FieldDef;
  onSave: (newName: string, patch: Partial<FieldDef>) => void;
  onCancel: () => void;
}

export function FieldEditor({ name, def, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(name);
  const [type, setType] = useState<FieldType>(def.type);
  const [options, setOptions] = useState<string[]>(def.options ?? []);
  const [colors, setColors] = useState<Record<string, string>>(def.colors ?? {});
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>(def.dateFormat ?? "iso");
  const [numberStyle, setNumberStyle] = useState<NumberStyle>(def.numberStyle ?? "plain");
  const [precision, setPrecision] = useState<number>(def.precision ?? 0);
  const [currency, setCurrency] = useState<string>(def.currency ?? "¥");
  const [thousands, setThousands] = useState<boolean>(def.thousands ?? false);
  const hasOptions = type === "select" || type === "multi";

  const addOpt = () => setOptions([...options, ""]);
  const setOpt = (i: number, v: string) => {
    const old = options[i];
    const next = [...options];
    next[i] = v;
    setOptions(next);
    if (old && old in colors && old !== v) {
      const c = { ...colors };
      c[v] = c[old];
      delete c[old];
      setColors(c);
    }
  };
  const setColor = (opt: string, c: string) => {
    const next = { ...colors };
    if (c) next[opt] = c;
    else delete next[opt];
    setColors(next);
  };
  const delOpt = (i: number) => {
    const o = options[i];
    setOptions(options.filter((_, k) => k !== i));
    const c = { ...colors };
    delete c[o];
    setColors(c);
  };
  const moveOpt = (from: number, to: number) => {
    if (from === to || from == null) return;
    const next = [...options];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setOptions(next);
  };

  const save = () => {
    // 先把所有类型专属字段清空,再按当前类型回填,切换类型时不残留旧配置
    const patch: Partial<FieldDef> = {
      type,
      options: undefined,
      colors: undefined,
      dateFormat: undefined,
      numberStyle: undefined,
      precision: undefined,
      currency: undefined,
      thousands: undefined,
    };
    if (hasOptions) {
      patch.options = options.map((o) => o.trim()).filter(Boolean);
      patch.colors = colors;
    }
    if (type === "date") {
      patch.dateFormat = dateFormat;
    }
    if (type === "number") {
      patch.numberStyle = numberStyle;
      patch.precision = precision;
      patch.thousands = thousands;
      if (numberStyle === "currency") patch.currency = currency;
    }
    onSave(title.trim() || name, patch);
  };

  return (
    <div className="modal-mask" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">编辑字段</div>

        <label className="fld-label">标题</label>
        <input className="fld-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        <label className="fld-label">字段类型</label>
        <div className="type-grid">
          {TYPES.map((t) => (
            <button
              key={t.value}
              className={`type-opt${type === t.value ? " on" : ""}`}
              onClick={() => setType(t.value)}
            >
              <Icon name={t.value} size={15} className="type-ico" />
              {t.label}
            </button>
          ))}
        </div>

        {hasOptions && (
          <>
            <div className="fld-label row">
              <span>选项内容</span>
              <button className="pop-link" onClick={addOpt}>
                ＋ 添加选项
              </button>
            </div>
            <div className="opt-list">
              {options.length === 0 && <div className="pop-empty">还没有选项,点「添加选项」</div>}
              {options.map((o, i) => (
                <div
                  className={`opt-row${dragFrom === i ? " dragging" : ""}`}
                  key={i}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom != null) moveOpt(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                >
                  <span className="opt-handle" title="拖拽排序">⠿</span>
                  <ColorPicker value={colors[o] ?? ""} onChange={(c) => setColor(o, c)} />
                  <input className="fld-input" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder="选项名" />
                  <button className="mini" title="删除选项" onClick={() => delOpt(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {type === "date" && (
          <>
            <label className="fld-label">日期格式</label>
            <div className="opt-list">
              {DATE_FORMATS.map((f) => (
                <button
                  key={f.value}
                  className={`type-opt wide${dateFormat === f.value ? " on" : ""}`}
                  onClick={() => setDateFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {type === "number" && (
          <>
            <label className="fld-label">数字格式</label>
            <div className="type-grid">
              {NUMBER_STYLES.map((s) => (
                <button
                  key={s.value}
                  className={`type-opt${numberStyle === s.value ? " on" : ""}`}
                  onClick={() => setNumberStyle(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="num-cfg">
              <label className="num-cfg-item">
                <span>小数位</span>
                <select className="fld-select" value={precision} onChange={(e) => setPrecision(Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              {numberStyle === "currency" && (
                <label className="num-cfg-item">
                  <span>符号</span>
                  <input className="fld-input sm" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </label>
              )}
              <label className="num-cfg-item check">
                <input type="checkbox" checked={thousands} onChange={(e) => setThousands(e.target.checked)} />
                <span>千分位分隔</span>
              </label>
            </div>
          </>
        )}

        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" onClick={save}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="color-pick">
      <button
        type="button"
        className="color-dot"
        style={value ? { background: COLOR_HEX[value] } : { background: "transparent", border: "1.5px dashed var(--bt-border)" }}
        onClick={() => setOpen((o) => !o)}
        title="选择颜色"
      />
      {open && (
        <div className="color-pop" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="color-dot auto"
            title="自动"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            自
          </button>
          {COLOR_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              className={`color-dot${value === n ? " on" : ""}`}
              style={{ background: COLOR_HEX[n] }}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
