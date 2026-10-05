import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FieldDef, Row } from "../../src/base/types";
import { Cell, CellPreview } from "./Cell";
import type { UIConfig } from "./config";
import { Caret, Icon } from "./icons";
import { toClipboard } from "./export";

/** 行号列宽存在 view.colWidths 的保留键下,可被用户拖拽调整 */
export const ROWNUM_KEY = "__rownum__";

interface Props {
  fields: Record<string, FieldDef>;
  cols: string[];
  rows: Row[];
  config: UIConfig;
  colWidths: Record<string, number>;
  groupField?: string;
  frozen?: number;
  canReorder?: boolean;
  onUpdate: (id: string, field: string, value: unknown) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onMoveRowTo: (id: string, targetId: string, before: boolean) => void;
  onHeaderMenu: (col: string, x: number, y: number) => void;
  onResize: (col: string, width: number) => void;
  onReorderCols: (from: string, to: string) => void;
  onAddField: () => void;
}

const ROWNUM_DEFAULT = 52;
/** 行号列要放下拖拽把手 + 复选框 */
const ROWNUM_MIN = 48;
const ADDCOL_W = 44;
const DEFAULT_COL = 140;
const CHECK_COL = 64;

function widthOfCol(c: string, type: FieldDef["type"] | undefined, colWidths: Record<string, number>): number {
  if (colWidths[c] != null) return colWidths[c];
  return type === "checkbox" ? CHECK_COL : DEFAULT_COL;
}

type DropHint = "before" | "after" | null;

interface RowProps {
  row: Row;
  index: number;
  cols: string[];
  fields: Record<string, FieldDef>;
  config: UIConfig;
  frozenLefts: Record<string, number>;
  showNum: boolean;
  frozen: number;
  canReorder: boolean;
  dropHint: DropHint;
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onUpdate: (id: string, field: string, value: unknown) => void;
  onDelete: (id: string) => void;
  onRowDragStart: (id: string) => void;
  onRowDragOver: (id: string, e: React.DragEvent) => void;
  onRowDrop: (id: string) => void;
  onRowDragEnd: () => void;
  onCellDown: (id: string, col: string, td: HTMLElement) => void;
}

const TableRow = memo(function TableRow({ row, index, cols, fields, config, frozenLefts, showNum, frozen, canReorder, dropHint, selected, onSelect, onUpdate, onDelete, onRowDragStart, onRowDragOver, onRowDrop, onRowDragEnd, onCellDown }: RowProps) {
  return (
    <tr
      className={[dropHint ? `drop-${dropHint}` : "", selected ? "row-selected" : ""].filter(Boolean).join(" ") || undefined}
      onDragOver={(e) => onRowDragOver(row.id, e)}
      onDrop={() => onRowDrop(row.id)}
    >
      {showNum && (
        <td
          className="rownum sticky"
          draggable
          onDragStart={() => onRowDragStart(row.id)}
          onDragEnd={onRowDragEnd}
          title={canReorder ? "拖拽调整顺序" : "当前有排序,拖拽不生效"}
        >
          <span className="rn-grip">
            <Icon name="grip" size={14} />
          </span>
          <span className="rn-num">{index + 1}</span>
          <span className="rn-check">
            <input
              type="checkbox"
              checked={selected}
              title="选择记录(Shift 连选)"
              onChange={() => undefined}
              onClick={(e) => onSelect(row.id, e)}
            />
          </span>
        </td>
      )}
      {cols.map((c, ci) => {
        const isFrozen = ci < frozen;
        const edge = isFrozen && ci === frozen - 1;
        const narrow = fields[c]?.type === "checkbox" ? " col-check" : "";
        return (
          <td
            key={c}
            className={`align-${fields[c]?.align ?? "left"}${isFrozen ? " sticky" : ""}${edge ? " sticky-edge" : ""}${narrow}`}
            style={isFrozen ? { left: frozenLefts[c] ?? 0 } : undefined}
            onMouseDown={(e) => onCellDown(row.id, c, e.currentTarget)}
          >
            <Cell def={fields[c]} value={row.values[c]} colorful={config.colorfulTags} onCommit={(v) => onUpdate(row.id, c, v)} />
          </td>
        );
      })}
      <td className="addcol ops">
        <button className="mini danger" title="删除记录" onClick={() => onDelete(row.id)}>
          <Icon name="trash" size={14} />
        </button>
      </td>
    </tr>
  );
});

export function Table({ fields, cols, rows, config, colWidths, groupField, frozen = 0, canReorder = false, onUpdate, onDelete, onDeleteMany, onMoveRowTo, onHeaderMenu, onResize, onReorderCols, onAddField }: Props) {
  const wrapClass = config.wrapText ? "wrap" : "nowrap";
  const [drag, setDrag] = useState<{ col: string; startX: number; startW: number } | null>(null);
  const [localW, setLocalW] = useState<{ col: string; w: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const dragColRef = useRef<string | null>(null);
  // 行拖拽
  const dragRowRef = useRef<string | null>(null);
  const [overRow, setOverRow] = useState<{ id: string; before: boolean } | null>(null);
  // 点击选中聚焦某格 → 内容被截断时在原位展开完整内容;失焦(点别处)恢复
  const [expand, setExpand] = useState<{ id: string; col: string; rect: DOMRect } | null>(null);

  const onCellDown = useCallback((id: string, col: string, td: HTMLElement) => {
    // 下一帧测量,等输入框等聚焦态布局稳定
    requestAnimationFrame(() => {
      const cb = td.querySelector<HTMLElement>(".cellbox");
      const inp = td.querySelector<HTMLElement>("input:not([type=checkbox])");
      const truncated =
        (!!cb && (cb.scrollWidth > cb.clientWidth + 1 || cb.scrollHeight > cb.clientHeight + 1)) ||
        (!!inp && inp.scrollWidth > inp.clientWidth + 1);
      setExpand(truncated ? { id, col, rect: td.getBoundingClientRect() } : null);
    });
  }, []);

  // 点击单元格以外的地方 → 失焦收起;滚动时也收起(rect 失效)
  useEffect(() => {
    if (!expand) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".grid td") && !el.closest(".cell-expand")) setExpand(null);
    };
    const close = () => setExpand(null);
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("wheel", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [expand]);

  useEffect(() => {
    if (!drag) return;
    const minW = drag.col === ROWNUM_KEY ? ROWNUM_MIN : 36;
    const move = (e: MouseEvent) => setLocalW({ col: drag.col, w: Math.max(minW, drag.startW + (e.clientX - drag.startX)) });
    const up = () => {
      if (localW) onResize(localW.col, localW.w);
      setDrag(null);
      setLocalW(null);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [drag, localW, onResize]);

  const widthOf = (c: string): number => (localW && localW.col === c ? localW.w : widthOfCol(c, fields[c]?.type, colWidths));
  const startResize = (e: React.MouseEvent, col: string) => {
    e.stopPropagation();
    e.preventDefault();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLElement | null;
    setDrag({ col, startX: e.clientX, startW: th?.offsetWidth ?? colWidths[col] ?? 160 });
  };

  // 行拖拽回调
  const onRowDragStart = (id: string) => {
    dragRowRef.current = id;
  };
  const onRowDragOver = (id: string, e: React.DragEvent) => {
    if (!dragRowRef.current || dragRowRef.current === id || !canReorder) return; // 有排序时不接受 drop → 松手弹回
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    setOverRow((cur) => (cur && cur.id === id && cur.before === before ? cur : { id, before }));
  };
  const onRowDrop = (id: string) => {
    const src = dragRowRef.current;
    const before = overRow?.before ?? true;
    dragRowRef.current = null;
    setOverRow(null);
    if (src && canReorder && src !== id) onMoveRowTo(src, id, before);
  };
  const onRowDragEnd = () => {
    dragRowRef.current = null;
    setOverRow(null);
  };

  const groups = useMemo(() => {
    if (!groupField) return null;
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const v = r.values[groupField];
      const key = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()];
  }, [rows, groupField]);

  const totalCols = (config.showRowNumbers ? 1 : 0) + cols.length + 1;
  const toggle = (key: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // 行号列宽(可拖拽,存 colWidths 的保留键)
  const rownumW = Math.max(ROWNUM_MIN, localW && localW.col === ROWNUM_KEY ? localW.w : colWidths[ROWNUM_KEY] ?? ROWNUM_DEFAULT);

  // 多选记录:悬停行号出现复选框,Shift 连选;Cmd/Ctrl+C 复制选中记录
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 按屏幕显示顺序(分组时为分组后的顺序)排列的行,连选和复制都按这个顺序
  const ordered = useMemo(
    () => (groups ? groups.flatMap(([key, grs]) => (collapsed.has(key) ? [] : grs)) : rows),
    [groups, rows, collapsed]
  );
  // 视图切换/筛选/删除后不可见的记录自动移出选择
  const selectedRows = useMemo(() => ordered.filter((r) => picked.has(r.id)), [ordered, picked]);
  const selectedIds = useMemo(() => new Set(selectedRows.map((r) => r.id)), [selectedRows]);
  const allPicked = ordered.length > 0 && selectedRows.length === ordered.length;

  const onSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      const anchor = anchorRef.current;
      setPicked((prev) => {
        const next = new Set(prev);
        if (e.shiftKey && anchor) {
          const a = ordered.findIndex((r) => r.id === anchor);
          const b = ordered.findIndex((r) => r.id === id);
          if (a >= 0 && b >= 0) {
            for (let k = Math.min(a, b); k <= Math.max(a, b); k++) next.add(ordered[k].id);
            return next;
          }
        }
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      anchorRef.current = id;
    },
    [ordered]
  );
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(ordered.map((r) => r.id)));
  const clearPicked = () => setPicked(new Set());

  const copyRef = useRef<() => number>(() => 0);
  copyRef.current = () => {
    if (!selectedRows.length) return 0;
    const { text, html } = toClipboard(cols, selectedRows);
    const onCopy = (ev: ClipboardEvent) => {
      ev.preventDefault();
      ev.clipboardData?.setData("text/plain", text);
      ev.clipboardData?.setData("text/html", html);
    };
    document.addEventListener("copy", onCopy, { once: true, capture: true });
    const ok = document.execCommand("copy");
    document.removeEventListener("copy", onCopy, { capture: true });
    if (!ok) navigator.clipboard?.writeText(text).catch(() => undefined);
    setToast(`已复制 ${selectedRows.length} 条记录`);
    return selectedRows.length;
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const isEditing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === "TEXTAREA" || el.isContentEditable) return true;
      return el.tagName === "INPUT" && (el as HTMLInputElement).type !== "checkbox";
    };
    const hasTextSelection = () => !!window.getSelection()?.toString();
    // 键盘复制;VS Code 宿主也可能通过 execCommand("copy") 触发 copy 事件,两条路径都接住
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEditing()) {
        setPicked((p) => (p.size ? new Set() : p));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "c") {
        if (isEditing() || hasTextSelection()) return;
        if (copyRef.current()) e.preventDefault();
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isEditing() || hasTextSelection() || !selectedRowsRef.current.length) return;
      const { text, html } = toClipboard(colsRef.current, selectedRowsRef.current);
      e.preventDefault();
      e.clipboardData?.setData("text/plain", text);
      e.clipboardData?.setData("text/html", html);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("copy", onCopy);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", onCopy);
    };
  }, []);
  const selectedRowsRef = useRef<Row[]>([]);
  selectedRowsRef.current = selectedRows;
  const colsRef = useRef<string[]>(cols);
  colsRef.current = cols;

  // 测量表头冻结列的真实左偏移(含边框),避免公式累加的像素级错位。
  // 用 offsetWidth 累加而非 offsetLeft——offsetLeft 在 sticky 元素被「粘住」
  // 滚动时会返回位移后的位置,导致滚动中调列宽把冻结列推偏;offsetWidth 与滚动无关。
  const headRowRef = useRef<HTMLTableRowElement>(null);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const rowEl = headRowRef.current;
    if (!rowEl) return;
    const ths = rowEl.querySelectorAll<HTMLTableCellElement>("th");
    const base = config.showRowNumbers ? 1 : 0;
    let x = 0;
    for (let k = 0; k < base; k++) x += ths[k]?.offsetWidth ?? 0; // 行号列宽
    const next: Record<string, number> = {};
    for (let ci = 0; ci < cols.length; ci++) {
      const th = ths[base + ci];
      if (!th) break;
      if (ci < frozen) next[cols[ci]] = x;
      x += th.offsetWidth;
    }
    const changed =
      Object.keys(next).length !== Object.keys(measured).length ||
      Object.keys(next).some((k) => next[k] !== measured[k]);
    if (changed) setMeasured(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, colWidths, frozen, config.showRowNumbers, localW, rownumW, rows.length]);

  // 冻结列最终左偏移:优先测量值,未测量时用公式近似(首帧兜底)
  const frozenLefts = useMemo(() => {
    const m: Record<string, number> = {};
    let x = config.showRowNumbers ? rownumW : 0;
    for (let ci = 0; ci < cols.length; ci++) {
      if (ci < frozen) m[cols[ci]] = measured[cols[ci]] ?? x;
      x += widthOf(cols[ci]);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, colWidths, frozen, config.showRowNumbers, measured, rownumW, localW]);

  const renderRow = (r: Row, i: number) => (
    <TableRow
      key={r.id}
      row={r}
      index={i}
      cols={cols}
      fields={fields}
      config={config}
      frozenLefts={frozenLefts}
      showNum={config.showRowNumbers}
      frozen={frozen}
      canReorder={canReorder}
      dropHint={overRow && overRow.id === r.id ? (overRow.before ? "before" : "after") : null}
      selected={selectedIds.has(r.id)}
      onSelect={onSelect}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onRowDragStart={onRowDragStart}
      onRowDragOver={onRowDragOver}
      onRowDrop={onRowDrop}
      onRowDragEnd={onRowDragEnd}
      onCellDown={onCellDown}
    />
  );

  const expandRow = expand ? rows.find((r) => r.id === expand.id) : null;
  const expandDef = expand ? fields[expand.col] : null;

  return (
    <>
    <table className={`grid ${wrapClass}`}>
      <colgroup>
        {config.showRowNumbers && <col style={{ width: rownumW }} />}
        {cols.map((c) => (
          <col key={c} style={{ width: widthOf(c) }} />
        ))}
        <col style={{ width: ADDCOL_W }} />
      </colgroup>
      <thead>
        <tr ref={headRowRef}>
          {config.showRowNumbers && (
            <th className={`rownum sticky${selectedRows.length ? " has-picked" : ""}`}>
              <span className="rn-hash">#</span>
              <span className="rn-check">
                <input
                  type="checkbox"
                  title={allPicked ? "取消全选" : "全选"}
                  checked={allPicked}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedRows.length > 0 && !allPicked;
                  }}
                  onChange={toggleAll}
                />
              </span>
              <div className="col-resize" onMouseDown={(e) => startResize(e, ROWNUM_KEY)} />
            </th>
          )}
          {cols.map((c, ci) => {
            const isFrozen = ci < frozen;
            const cls = [
              isFrozen ? "sticky" : "",
              isFrozen && ci === frozen - 1 ? "sticky-edge" : "",
              dragCol === c ? "col-dragging" : "",
              overCol === c && dragCol && dragCol !== c ? "col-over" : "",
              fields[c]?.type === "checkbox" ? "col-check" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <th
                key={c}
                className={cls || undefined}
                style={isFrozen ? { left: frozenLefts[c] ?? 0 } : undefined}
                draggable
                onDragStart={(e) => {
                  dragColRef.current = c;
                  setDragCol(c);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  const src = dragColRef.current;
                  if (src && src !== c) {
                    e.preventDefault();
                    setOverCol(c);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const src = dragColRef.current;
                  if (src && src !== c) onReorderCols(src, c);
                  dragColRef.current = null;
                  setDragCol(null);
                  setOverCol(null);
                }}
                onDragEnd={() => {
                  dragColRef.current = null;
                  setDragCol(null);
                  setOverCol(null);
                }}
              >
                <div
                  className="th-inner"
                  onClick={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    onHeaderMenu(c, r.left, r.bottom + 4);
                  }}
                >
                  <Icon name={fields[c]?.type ?? "text"} size={16} className="fico" />
                  <span className="th-name">{c}</span>
                  {fields[c]?.primary ? <Icon name="star" size={14} className="pk" /> : null}
                  {ci < frozen ? <Icon name="snow" size={14} className="frozen-dot" /> : null}
                  <span className="th-caret">
                    <Caret />
                  </span>
                </div>
                <div className="col-resize" onMouseDown={(e) => startResize(e, c)} />
              </th>
            );
          })}
          <th className="addcol">
            <button className="addcol-btn" title="新增字段" onClick={onAddField}>
              <Icon name="add" size={15} />
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {groups
          ? groups.map(([key, grs]) => (
              <Fragment key={"grp:" + key}>
                <tr className="group-head">
                  <td className="group-head-cell" colSpan={totalCols} onClick={() => toggle(key)}>
                    <span className="group-caret">{collapsed.has(key) ? "▸" : "▾"}</span>
                    <span className="group-field">{groupField}</span>
                    <span className="group-name">{key || "(空)"}</span>
                    <span className="group-count">{grs.length}</span>
                  </td>
                </tr>
                {!collapsed.has(key) && grs.map((r, i) => renderRow(r, i))}
              </Fragment>
            ))
          : rows.map((r, i) => renderRow(r, i))}
        {rows.length === 0 && (
          <tr>
            <td className="empty" colSpan={totalCols}>
              没有记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {(selectedRows.length > 0 || toast) && (
      <div className="pick-bar">
        {selectedRows.length > 0 && (
          <>
            <span className="pick-count">已选择 {selectedRows.length} 条记录</span>
            <button className="pick-btn" title="复制 (Cmd/Ctrl+C)" onClick={() => copyRef.current()}>
              复制
            </button>
            <button
              className="pick-btn danger"
              onClick={() => {
                onDeleteMany(selectedRows.map((r) => r.id));
                clearPicked();
              }}
            >
              删除
            </button>
            <button className="pick-btn" title="取消选择 (Esc)" onClick={clearPicked}>
              取消
            </button>
          </>
        )}
        {toast && <span className="pick-toast">{toast}</span>}
      </div>
    )}
    {expand && expandRow && expandDef && expandDef.type !== "checkbox" && (
      <div
        className="cell-expand"
        style={{ left: expand.rect.left, top: expand.rect.top, minWidth: expand.rect.width, minHeight: expand.rect.height }}
      >
        <div className={`cell-expand-inner align-${expandDef.align ?? "left"}`}>
          <CellPreview def={expandDef} value={expandRow.values[expand.col]} colorful={config.colorfulTags} />
        </div>
      </div>
    )}
    </>
  );
}
