import { useKeepInViewport } from "./hooks";
import type { FieldDef, FilterCond } from "../../src/core/types";
import { opsFor, needsValue } from "./ops";

interface Props {
  fields: Record<string, FieldDef>;
  cols: string[];
  filters: FilterCond[];
  match: "all" | "any";
  onChange: (filters: FilterCond[]) => void;
  onMatchChange: (m: "all" | "any") => void;
  onClear: () => void;
  onSaveAsView: () => void;
}

export function FilterPanel({ fields, cols, filters, match, onChange, onMatchChange, onClear, onSaveAsView }: Props) {
  const keepRef = useKeepInViewport<HTMLDivElement>();
  const update = (i: number, patch: Partial<FilterCond>) =>
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const add = () => {
    const field = cols[0];
    onChange([...filters, { field, op: opsFor(fields[field]?.type)[0].op, value: "" }]);
  };
  const remove = (i: number) => onChange(filters.filter((_, idx) => idx !== i));

  return (
    <div ref={keepRef} className="popover filter-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="pop-head">设置筛选条件</div>
      {filters.length > 0 && (
        <div className="pop-match">
          符合以下
          <select value={match} onChange={(e) => onMatchChange(e.target.value as "all" | "any")}>
            <option value="all">所有</option>
            <option value="any">任一</option>
          </select>
          条件
        </div>
      )}

      {filters.length === 0 && <div className="pop-empty">没有筛选条件</div>}
      <div className="cond-list">
        {filters.map((f, i) => {
          const type = fields[f.field]?.type ?? "text";
          const ops = opsFor(type);
          const nv = needsValue(type, f.op);
          return (
            <div className="cond" key={i}>
              <select
                className="cond-field"
                value={f.field}
                onChange={(e) => update(i, { field: e.target.value, op: opsFor(fields[e.target.value]?.type)[0].op, value: "" })}
              >
                {cols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select className="cond-op" value={f.op} onChange={(e) => update(i, { op: e.target.value })}>
                {ops.map((o) => (
                  <option key={o.op} value={o.op}>
                    {o.label}
                  </option>
                ))}
              </select>
              {nv ? (
                <ValueInput def={fields[f.field]} value={f.value} onChange={(v) => update(i, { value: v })} />
              ) : (
                <span className="cond-val ghost" />
              )}
              <button className="mini" title="删除条件" onClick={() => remove(i)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button className="pop-add" onClick={add}>
        ＋ 添加条件
      </button>

      <div className="pop-foot">
        <button className="pop-link danger" onClick={onClear} disabled={filters.length === 0}>
          清除筛选
        </button>
        <button className="pop-link" onClick={onSaveAsView} disabled={filters.length === 0}>
          另存为新视图
        </button>
      </div>
    </div>
  );
}

function ValueInput({
  def,
  value,
  onChange,
}: {
  def?: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const type = def?.type ?? "text";
  if (type === "select" || type === "multi") {
    return (
      <select className="cond-val" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value=""></option>
        {(def?.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (type === "date") {
    return (
      <input
        className="cond-val"
        type="date"
        value={value ? String(value).slice(0, 10) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (type === "number") {
    return (
      <input
        className="cond-val"
        type="number"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      className="cond-val"
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="值"
    />
  );
}
