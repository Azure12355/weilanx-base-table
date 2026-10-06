import { useKeepInViewport } from "./hooks";
import type { SortSpec } from "../../src/core/types";

interface Props {
  cols: string[];
  sorts: SortSpec[];
  onChange: (sorts: SortSpec[]) => void;
  onClear: () => void;
}

export function SortPanel({ cols, sorts, onChange, onClear }: Props) {
  const keepRef = useKeepInViewport<HTMLDivElement>();
  const update = (i: number, patch: Partial<SortSpec>) =>
    onChange(sorts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () => onChange([...sorts, { field: cols[0], dir: "asc" }]);
  const remove = (i: number) => onChange(sorts.filter((_, idx) => idx !== i));

  return (
    <div ref={keepRef} className="popover sort-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="pop-head">排序</div>
      {sorts.length === 0 && <div className="pop-empty">没有排序</div>}
      <div className="cond-list">
        {sorts.map((s, i) => (
          <div className="cond" key={i}>
            <span className="cond-lead">{i === 0 ? "按" : "然后"}</span>
            <select className="cond-field" value={s.field} onChange={(e) => update(i, { field: e.target.value })}>
              {cols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="seg small">
              <button className={s.dir === "asc" ? "on" : ""} onClick={() => update(i, { dir: "asc" })}>
                升序
              </button>
              <button className={s.dir === "desc" ? "on" : ""} onClick={() => update(i, { dir: "desc" })}>
                降序
              </button>
            </div>
            <button className="mini" title="删除" onClick={() => remove(i)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="pop-add" onClick={add}>
        ＋ 添加排序
      </button>
      <div className="pop-foot">
        <button className="pop-link danger" onClick={onClear} disabled={sorts.length === 0}>
          清除排序
        </button>
      </div>
    </div>
  );
}
