import { useKeepInViewport } from "./hooks";
import { useState } from "react";
import type { FieldDef } from "../../src/core/types";
import { Icon } from "./icons";

interface Props {
  fields: Record<string, FieldDef>;
  allCols: string[];
  hiddenCols: string[];
  onEdit: (col: string) => void;
  onToggleHidden: (col: string, hidden: boolean) => void;
  onReorder: (from: string, to: string) => void;
  onAdd: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  text: "文本",
  longtext: "长文本",
  select: "单选",
  multi: "多选",
  date: "日期",
  number: "数字",
  checkbox: "复选",
  link: "链接",
};

export function FieldsPanel({ fields, allCols, hiddenCols, onEdit, onToggleHidden, onReorder, onAdd }: Props) {
  const keepRef = useKeepInViewport<HTMLDivElement>();
  const hidden = new Set(hiddenCols);
  const [dragFrom, setDragFrom] = useState<string | null>(null);

  return (
    <div ref={keepRef} className="popover fields-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="pop-head">字段配置</div>
      <div className="fields-list">
        {allCols.map((c) => {
          const def = fields[c];
          const isHidden = hidden.has(c);
          return (
            <div
              key={c}
              className={`fields-row${dragFrom === c ? " dragging" : ""}`}
              draggable
              onDragStart={() => setDragFrom(c)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom && dragFrom !== c) onReorder(dragFrom, c);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
            >
              <span className="fields-handle" title="拖拽排序">
                <Icon name="grip" size={13} />
              </span>
              <Icon name={def?.type ?? "text"} size={14} className="fields-ico" />
              <span className="fields-name" onClick={() => onEdit(c)}>
                {c}
                {def?.primary ? <Icon name="star" size={11} className="pk" /> : null}
              </span>
              <span className="fields-type">{TYPE_LABEL[def?.type ?? "text"]}</span>
              <button className="fields-edit" title="编辑字段" onClick={() => onEdit(c)}>
                <Icon name="edit" size={14} />
              </button>
              <button
                className={`fields-eye${isHidden ? " off" : ""}`}
                title={def?.primary ? "主字段不可隐藏" : isHidden ? "显示" : "隐藏"}
                disabled={def?.primary}
                onClick={() => !def?.primary && onToggleHidden(c, !isHidden)}
              >
                <Icon name={isHidden ? "eyeOff" : "eye"} size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <button className="pop-add" onClick={onAdd}>
        ＋ 新增字段
      </button>
    </div>
  );
}
