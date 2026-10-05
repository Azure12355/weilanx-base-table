import type { GroupSpec } from "../../src/base/types";

interface Props {
  cols: string[];
  group: GroupSpec | undefined;
  onChange: (group: GroupSpec | undefined) => void;
}

export function GroupPanel({ cols, group, onChange }: Props) {
  return (
    <div className="popover group-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="pop-head">分组</div>
      <div className="cond-list">
        <div className="cond">
          <span className="cond-lead">按</span>
          <select
            className="cond-field"
            value={group?.field ?? ""}
            onChange={(e) => onChange(e.target.value ? { field: e.target.value } : undefined)}
          >
            <option value="">不分组</option>
            {cols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="cond-lead">分组</span>
        </div>
      </div>
      <div className="pop-foot">
        <button className="pop-link danger" onClick={() => onChange(undefined)} disabled={!group}>
          清除分组
        </button>
      </div>
    </div>
  );
}
