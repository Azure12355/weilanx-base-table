import type { FieldDef } from "../../src/base/types";
import { Icon } from "./icons";

export type FieldAction =
  | { kind: "edit" }
  | { kind: "align"; value: "left" | "center" | "right" }
  | { kind: "hide" }
  | { kind: "insertLeft" }
  | { kind: "insertRight" }
  | { kind: "sortAsc" }
  | { kind: "sortDesc" }
  | { kind: "groupBy" }
  | { kind: "duplicate" }
  | { kind: "freeze" }
  | { kind: "delete" };

interface Props {
  def: FieldDef;
  frozen: boolean;
  x: number;
  y: number;
  onAction: (a: FieldAction) => void;
}

export function FieldMenu({ def, frozen, x, y, onAction }: Props) {
  const align = def.align ?? "left";
  return (
    <div className="menu field-menu" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="menu-item" onClick={() => onAction({ kind: "edit" })}>
        <Icon name="edit" size={14} className="menu-ico" />编辑字段
      </div>
      <div className="menu-align">
        <span className="menu-align-label">对齐</span>
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} className={align === a ? "on" : ""} title={a} onClick={() => onAction({ kind: "align", value: a })}>
            <Icon name={a === "left" ? "alignLeft" : a === "center" ? "alignCenter" : "alignRight"} size={14} />
          </button>
        ))}
      </div>
      <div className="menu-sep" />
      <div className="menu-item" onClick={() => onAction({ kind: "sortAsc" })}>
        <Icon name="arrowUp" size={14} className="menu-ico" />升序
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "sortDesc" })}>
        <Icon name="arrowDown" size={14} className="menu-ico" />降序
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "groupBy" })}>
        <Icon name="group" size={14} className="menu-ico" />按此字段分组
      </div>
      <div className="menu-sep" />
      <div className="menu-item" onClick={() => onAction({ kind: "insertLeft" })}>
        <Icon name="insertLeft" size={14} className="menu-ico" />向左插入字段
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "insertRight" })}>
        <Icon name="insertRight" size={14} className="menu-ico" />向右插入字段
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "duplicate" })}>
        <Icon name="copy" size={14} className="menu-ico" />复制字段
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "freeze" })}>
        <Icon name="snow" size={14} className="menu-ico" />{frozen ? "取消冻结" : "冻结到此列"}
      </div>
      <div className="menu-item" onClick={() => onAction({ kind: "hide" })}>
        <Icon name="hide" size={14} className="menu-ico" />隐藏字段
      </div>
      <div className="menu-sep" />
      <div
        className={`menu-item danger${def.primary ? " disabled" : ""}`}
        onClick={() => !def.primary && onAction({ kind: "delete" })}
      >
        <Icon name="trash" size={14} className="menu-ico" />删除字段
      </div>
    </div>
  );
}
