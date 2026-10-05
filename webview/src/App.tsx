import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BaseTable, FieldDef, ViewDef } from "../../src/base/types";
import { post, onMessage } from "./vscode";
import { applyView } from "./filter";
import { Table } from "./Table";
import { FilterPanel } from "./FilterPanel";
import { SortPanel } from "./SortPanel";
import { GroupPanel } from "./GroupPanel";
import { FieldsPanel } from "./FieldsPanel";
import { FieldMenu, type FieldAction } from "./FieldMenu";
import { FieldEditor } from "./FieldEditor";
import { ExportModal, type ExportFormat } from "./ExportModal";
import { toCSV, toJSONDoc, toXLS } from "./export";
import { Caret, Icon } from "./icons";
import { defaultConfig, ROW_HEIGHT_PX, type UIConfig } from "./config";

type Panel = "filter" | "sort" | "group" | "fields" | null;

export function App() {
  const [table, setTable] = useState<BaseTable | null>(null);
  const [config, setConfig] = useState<UIConfig>(defaultConfig);
  const [viewIdx, setViewIdx] = useState(0);
  const [rowHOverride, setRowHOverride] = useState<UIConfig["rowHeight"] | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [menuView, setMenuView] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const dragViewRef = useRef<number | null>(null);
  const [overView, setOverView] = useState<number | null>(null);
  const [fieldMenu, setFieldMenu] = useState<{ col: string; x: number; y: number } | null>(null);
  const [fieldEditor, setFieldEditor] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // 撤销/重做历史(整表快照栈)
  const [past, setPast] = useState<BaseTable[]>([]);
  const [future, setFuture] = useState<BaseTable[]>([]);
  const tableRef = useRef<BaseTable | null>(null);
  const pastRef = useRef<BaseTable[]>([]);
  const futureRef = useRef<BaseTable[]>([]);
  useEffect(() => {
    tableRef.current = table;
  }, [table]);
  useEffect(() => {
    pastRef.current = past;
  }, [past]);
  useEffect(() => {
    futureRef.current = future;
  }, [future]);

  // 变更前记录快照;dedup:同一次操作内重复调用(表引用未变)不重复入栈
  const recordHistory = useCallback(() => {
    const t = tableRef.current;
    if (!t) return;
    setPast((p) => (p[p.length - 1] === t ? p : [...p.slice(-49), t]));
    setFuture([]);
  }, []);
  const toDocMsg = (t: BaseTable) => ({ fields: t.fields, views: t.views, records: t.rows.map((r) => ({ id: r.id, ...r.values })) });
  const undo = useCallback(() => {
    const p = pastRef.current;
    const t = tableRef.current;
    if (!p.length || !t) return;
    const prev = p[p.length - 1];
    setPast(p.slice(0, -1));
    setFuture((f) => [t, ...f]);
    setTable(prev);
    post({ type: "replaceAll", doc: toDocMsg(prev) });
  }, []);
  const redo = useCallback(() => {
    const f = futureRef.current;
    const t = tableRef.current;
    if (!f.length || !t) return;
    const next = f[0];
    setFuture(f.slice(1));
    setPast((p) => [...p, t]);
    setTable(next);
    post({ type: "replaceAll", doc: toDocMsg(next) });
  }, []);
  // 宿主快捷键命令(在 VS Code「键盘快捷方式」里可改键);输入框里的撤销/重做仍作用于输入框本身
  const addRow = useCallback(() => {
    recordHistory();
    post({ type: "addRow" });
  }, [recordHistory]);
  const commandRef = useRef<(c: "undo" | "redo" | "addRow" | "export") => void>(() => {});
  commandRef.current = (c) => {
    const el = document.activeElement as HTMLElement | null;
    const editing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    if (c === "undo") editing ? document.execCommand("undo") : undo();
    else if (c === "redo") editing ? document.execCommand("redo") : redo();
    else if (c === "addRow") addRow();
    else if (c === "export") setExportOpen(true);
  };

  useEffect(() => {
    const off = onMessage((m) => {
      if (m.type === "tableData") {
        setTable(m.table);
        setConfig(m.config);
      } else if (m.type === "command") {
        commandRef.current(m.command);
      }
    });
    post({ type: "ready" });
    return off;
  }, []);

  useEffect(() => {
    const h = () => {
      setPanel(null);
      setMenuView(null);
      setFieldMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // 乐观更新:本地立即改,后台静默保存(高频操作主进程不回推)
  const onUpdate = useCallback((id: string, field: string, value: unknown) => {
    recordHistory();
    setTable((t) =>
      t ? { ...t, rows: t.rows.map((r) => (r.id === id ? { ...r, values: { ...r.values, [field]: value } } : r)) } : t
    );
    post({ type: "updateCell", id, field, value });
  }, [recordHistory]);
  const onDelete = useCallback((id: string) => {
    recordHistory();
    setTable((t) => (t ? { ...t, rows: t.rows.filter((r) => r.id !== id) } : t));
    post({ type: "deleteRow", id });
  }, [recordHistory]);

  // 批量删除只记一次历史,一次撤销全部恢复
  const onDeleteMany = useCallback((ids: string[]) => {
    if (!ids.length) return;
    recordHistory();
    const gone = new Set(ids);
    setTable((t) => (t ? { ...t, rows: t.rows.filter((r) => !gone.has(r.id)) } : t));
    for (const id of ids) post({ type: "deleteRow", id });
  }, [recordHistory]);

  // 派生值 memo 化,保证改值时传给行的 props 引用稳定
  const views = useMemo(() => (table && table.views.length ? table.views : [{ name: "全部" }]), [table]);
  const idx = Math.min(viewIdx, views.length - 1);
  const view = views[idx];
  const allCols = useMemo(() => (table ? Object.keys(table.fields) : []), [table]);
  const cols = useMemo(() => {
    const hidden = new Set(view.hiddenCols ?? []);
    return allCols.filter((c) => !hidden.has(c));
  }, [allCols, view]);
  const rows = useMemo(() => (table ? applyView(table.rows, view, table.fields) : []), [table, view]);
  const rowHeight = rowHOverride ?? config.rowHeight;
  const cellConfig = useMemo<UIConfig>(() => ({ ...config, rowHeight }), [config, rowHeight]);
  const colWidths = useMemo(() => view.colWidths ?? {}, [view]);

  if (!table) return <div className="loading">加载中…</div>;

  const filters = view.filters ?? [];
  const sorts = view.sorts ?? [];
  const group = view.group;
  const frozen = view.frozen ?? 0;

  const saveViews = (next: ViewDef[]) => {
    recordHistory();
    setTable((t) => (t ? { ...t, views: next } : t));
    post({ type: "saveViews", views: next });
  };
  const updateView = (patch: Partial<ViewDef>) => saveViews(views.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const uniqueName = (base: string) => {
    const names = new Set(views.map((v) => v.name));
    if (!names.has(base)) return base;
    let n = 2;
    while (names.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  };
  const newView = () => {
    saveViews([...views, { ...view, name: uniqueName("新视图") }]);
    setViewIdx(views.length);
  };
  const copyView = (i: number) => {
    saveViews([...views.slice(0, i + 1), { ...views[i], name: uniqueName(views[i].name + " 副本") }, ...views.slice(i + 1)]);
    setMenuView(null);
  };
  const deleteView = (i: number) => {
    if (views.length <= 1) return;
    saveViews(views.filter((_, k) => k !== i));
    setViewIdx(i <= idx ? Math.max(0, idx - 1) : idx);
    setMenuView(null);
  };
  const startRename = (i: number) => {
    setRenaming(i);
    setRenameText(views[i].name);
    setMenuView(null);
  };
  const commitRename = () => {
    if (renaming == null) return;
    const name = renameText.trim();
    if (name) saveViews(views.map((v, k) => (k === renaming ? { ...v, name } : v)));
    setRenaming(null);
  };
  const saveAsView = () => {
    saveViews([...views, { ...view, name: uniqueName("筛选视图") }]);
    setViewIdx(views.length);
    setPanel(null);
  };
  const reorderViews = (from: number, to: number) => {
    if (from === to) return;
    const activeName = views[idx].name;
    const next = [...views];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    saveViews(next);
    const ni = next.findIndex((v) => v.name === activeName);
    if (ni >= 0) setViewIdx(ni);
  };

  const handleFieldAction = (col: string, a: FieldAction) => {
    setFieldMenu(null);
    if (a.kind !== "edit") recordHistory();
    switch (a.kind) {
      case "edit":
        setFieldEditor(col);
        break;
      case "align":
        setTable((t) => (t ? { ...t, fields: { ...t.fields, [col]: { ...t.fields[col], align: a.value } } } : t));
        post({ type: "setField", name: col, patch: { align: a.value } });
        break;
      case "hide":
        updateView({ hiddenCols: [...(view.hiddenCols ?? []), col] });
        break;
      case "insertLeft": {
        const i = allCols.indexOf(col);
        post({ type: "addField", name: "新字段", def: { type: "text" }, after: i > 0 ? allCols[i - 1] : undefined });
        break;
      }
      case "insertRight":
        post({ type: "addField", name: "新字段", def: { type: "text" }, after: col });
        break;
      case "sortAsc":
        updateView({ sorts: [{ field: col, dir: "asc" }] });
        break;
      case "sortDesc":
        updateView({ sorts: [{ field: col, dir: "desc" }] });
        break;
      case "groupBy":
        updateView({ group: { field: col } });
        break;
      case "duplicate":
        post({ type: "duplicateField", name: col });
        break;
      case "freeze": {
        const ci = cols.indexOf(col);
        const cur = view.frozen ?? 0;
        const isFrozen = ci < cur;
        updateView({ frozen: isFrozen ? ci : ci + 1 });
        break;
      }
      case "delete":
        post({ type: "deleteField", name: col });
        break;
    }
  };
  const saveFieldEditor = (col: string, newName: string, patch: Partial<FieldDef>) => {
    recordHistory();
    // 乐观更新:本地立即应用(改名保序 + 合并 patch 去掉 undefined + 连带改记录键),
    // 后台静默写盘,避免「改了颜色/类型/选项却要重载才生效」
    setTable((t) => {
      if (!t) return t;
      const merged: Record<string, unknown> = { ...(t.fields[col] ?? { type: "text" }), ...patch };
      for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
      const fields: Record<string, FieldDef> = {};
      for (const [k, v] of Object.entries(t.fields)) fields[k === col ? newName : k] = (k === col ? (merged as unknown as FieldDef) : v);
      const rows =
        col === newName
          ? t.rows
          : t.rows.map((r) => {
              if (!(col in r.values)) return r;
              const values = { ...r.values };
              values[newName] = values[col];
              delete values[col];
              return { ...r, values };
            });
      return { ...t, fields, rows };
    });
    if (newName !== col) post({ type: "renameField", oldName: col, newName });
    post({ type: "setField", name: newName, patch });
    setFieldEditor(null);
  };

  // 浮层互斥:同一时间只开一个(工具栏弹层 / 视图菜单 / 字段头菜单)
  const togglePanel = (p: Panel) => {
    setPanel((cur) => (cur === p ? null : p));
    setMenuView(null);
    setFieldMenu(null);
  };
  const openFieldMenu = (col: string, x: number, y: number) => {
    setFieldMenu({ col, x, y });
    setPanel(null);
    setMenuView(null);
  };
  const openViewMenu = (i: number) => {
    setMenuView((cur) => (cur === i ? null : i));
    setPanel(null);
    setFieldMenu(null);
  };

  // 列拖拽换位:把 from 列移动到 to 列所在位置(在全部字段顺序里计算,隐藏列保持原位)
  const onReorderCols = (from: string, to: string) => {
    recordHistory();
    const order = allCols.filter((c) => c !== from);
    const ti = order.indexOf(to);
    const fromBefore = allCols.indexOf(from) < allCols.indexOf(to);
    order.splice(ti + (fromBefore ? 1 : 0), 0, from);
    setTable((t) => {
      if (!t) return t;
      const next: typeof t.fields = {};
      for (const k of order) next[k] = t.fields[k];
      return { ...t, fields: next };
    });
    post({ type: "reorderFields", names: order });
  };

  // 行拖拽排序:仅无排序/无分组时生效(有排序拖了会弹回,因为数据不变、applyView 仍按排序)
  const canReorder = sorts.length === 0 && !group;
  const onMoveRowTo = (id: string, targetId: string, before: boolean) => {
    if (id === targetId) return;
    recordHistory();
    setTable((t) => {
      if (!t) return t;
      const arr = [...t.rows];
      const i = arr.findIndex((r) => r.id === id);
      if (i < 0) return t;
      const [rec] = arr.splice(i, 1);
      const j = arr.findIndex((r) => r.id === targetId);
      if (j < 0) {
        arr.splice(i, 0, rec);
        return t;
      }
      arr.splice(before ? j : j + 1, 0, rec);
      return { ...t, rows: arr };
    });
    post({ type: "moveRowTo", id, targetId, before });
  };

  const handleExport = (format: ExportFormat) => {
    if (!table) return;
    const baseName = (table.path.split(/[\\/]/).pop() || "table").replace(/\.base$/, "");
    const content = format === "csv" ? toCSV(cols, rows) : format === "xls" ? toXLS(cols, rows) : toJSONDoc(table);
    post({ type: "export", defaultName: `${baseName}.${format}`, content });
    setExportOpen(false);
  };

  const rootStyle = {
    "--bt-row-h": `${ROW_HEIGHT_PX[rowHeight]}px`,
    "--bt-font-size": config.fontSize > 0 ? `${config.fontSize}px` : "var(--vscode-font-size, 13px)",
  } as CSSProperties;

  return (
    <div className="app" style={rootStyle}>
      <div className="views">
        {views.map((v, i) => (
          <div
            className={`view-tab${overView === i && dragViewRef.current !== null && dragViewRef.current !== i ? " view-over" : ""}`}
            key={i}
            draggable={renaming !== i}
            onDragStart={() => {
              dragViewRef.current = i;
            }}
            onDragOver={(e) => {
              if (dragViewRef.current !== null && dragViewRef.current !== i) {
                e.preventDefault();
                setOverView(i);
              }
            }}
            onDrop={() => {
              const from = dragViewRef.current;
              if (from !== null && from !== i) reorderViews(from, i);
              dragViewRef.current = null;
              setOverView(null);
            }}
            onDragEnd={() => {
              dragViewRef.current = null;
              setOverView(null);
            }}
          >
            {renaming === i ? (
              <input
                className="view-rename"
                autoFocus
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => e.key === "Enter" && commitRename()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <button className={i === idx ? "view active" : "view"} onClick={() => setViewIdx(i)} onDoubleClick={() => startRename(i)}>
                  {v.name}
                </button>
                <button className="view-menu-btn" title="视图操作" onMouseDown={(e) => e.stopPropagation()} onClick={() => openViewMenu(i)}>
                  <Caret />
                </button>
                {menuView === i && (
                  <div className="menu" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="menu-item" onClick={() => startRename(i)}>重命名</div>
                    <div className="menu-item" onClick={() => copyView(i)}>复制视图</div>
                    <div className={`menu-item danger${views.length <= 1 ? " disabled" : ""}`} onClick={() => deleteView(i)}>删除视图</div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <button className="view-add" title="新建视图" onMouseDown={(e) => e.stopPropagation()} onClick={newView}>
          ＋
        </button>
      </div>

      <div className="toolbar">
        <button className="tool primary" onClick={addRow}>
          <Icon name="add" size={15} className="tool-ico" />新增记录
        </button>
        <div className="tool-wrap">
          <button className={`tool${filters.length ? " on" : ""}`} onMouseDown={(e) => e.stopPropagation()} onClick={() => togglePanel("filter")}>
            <Icon name="filter" size={15} className="tool-ico" />筛选{filters.length ? ` ${filters.length}` : ""}
          </button>
          {panel === "filter" && (
            <FilterPanel
              fields={table.fields}
              cols={allCols}
              filters={filters}
              match={view.filterMatch ?? "all"}
              onChange={(f) => updateView({ filters: f })}
              onMatchChange={(m) => updateView({ filterMatch: m })}
              onClear={() => updateView({ filters: [], filterMatch: undefined })}
              onSaveAsView={saveAsView}
            />
          )}
        </div>
        <div className="tool-wrap">
          <button className={`tool${sorts.length ? " on" : ""}`} onMouseDown={(e) => e.stopPropagation()} onClick={() => togglePanel("sort")}>
            <Icon name="sort" size={15} className="tool-ico" />排序{sorts.length ? ` ${sorts.length}` : ""}
          </button>
          {panel === "sort" && <SortPanel cols={allCols} sorts={sorts} onChange={(s) => updateView({ sorts: s })} onClear={() => updateView({ sorts: [] })} />}
        </div>
        <div className="tool-wrap">
          <button className={`tool${group ? " on" : ""}`} onMouseDown={(e) => e.stopPropagation()} onClick={() => togglePanel("group")}>
            <Icon name="group" size={15} className="tool-ico" />分组{group ? ` · ${group.field}` : ""}
          </button>
          {panel === "group" && <GroupPanel cols={allCols} group={group} onChange={(g) => updateView({ group: g })} />}
        </div>
        <div className="tool-wrap">
          <button className={`tool${panel === "fields" ? " on" : ""}`} onMouseDown={(e) => e.stopPropagation()} onClick={() => togglePanel("fields")}>
            <Icon name="fields" size={15} className="tool-ico" />字段
          </button>
          {panel === "fields" && (
            <FieldsPanel
              fields={table.fields}
              allCols={allCols}
              hiddenCols={view.hiddenCols ?? []}
              onEdit={(c) => {
                setPanel(null);
                setFieldEditor(c);
              }}
              onToggleHidden={(c, hidden) =>
                updateView({ hiddenCols: hidden ? [...(view.hiddenCols ?? []), c] : (view.hiddenCols ?? []).filter((x) => x !== c) })
              }
              onReorder={onReorderCols}
              onAdd={() => { recordHistory(); post({ type: "addField", name: "新字段", def: { type: "text" }, after: allCols[allCols.length - 1] }); }}
            />
          )}
        </div>
        <span className="count">{rows.length} 条</span>
        <span className="spacer" />
        <span className="count">行高</span>
        <div className="seg">
          {(["compact", "medium", "tall"] as const).map((h) => (
            <button key={h} className={rowHeight === h ? "on" : ""} onClick={() => setRowHOverride(h)}>
              {h === "compact" ? "紧" : h === "medium" ? "中" : "松"}
            </button>
          ))}
        </div>
        <button className="tool icon-only" title="撤销 (Cmd/Ctrl+Z)" disabled={!past.length} onClick={undo}>
          <Icon name="undo" size={16} />
        </button>
        <button className="tool icon-only" title="重做 (Cmd/Ctrl+Shift+Z、Ctrl+Y)" disabled={!future.length} onClick={redo}>
          <Icon name="redo" size={16} />
        </button>
        <button className="tool" title="导出" onClick={() => setExportOpen(true)}>
          <Icon name="download" size={15} className="tool-ico" />导出
        </button>
      </div>

      <div className="table-wrap">
        <Table
          fields={table.fields}
          cols={cols}
          rows={rows}
          config={cellConfig}
          colWidths={colWidths}
          groupField={group?.field}
          frozen={frozen}
          canReorder={canReorder}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDeleteMany={onDeleteMany}
          onMoveRowTo={onMoveRowTo}
          onHeaderMenu={openFieldMenu}
          onResize={(col, w) => updateView({ colWidths: { ...colWidths, [col]: w } })}
          onReorderCols={onReorderCols}
          onAddField={() => { recordHistory(); post({ type: "addField", name: "新字段", def: { type: "text" }, after: allCols[allCols.length - 1] }); }}
        />
      </div>

      {fieldMenu && (
        <FieldMenu
          def={table.fields[fieldMenu.col]}
          frozen={cols.indexOf(fieldMenu.col) < frozen}
          x={fieldMenu.x}
          y={fieldMenu.y}
          onAction={(a) => handleFieldAction(fieldMenu.col, a)}
        />
      )}
      {fieldEditor && (
        <FieldEditor name={fieldEditor} def={table.fields[fieldEditor]} onSave={(newName, patch) => saveFieldEditor(fieldEditor, newName, patch)} onCancel={() => setFieldEditor(null)} />
      )}
      {exportOpen && <ExportModal onExport={handleExport} onCancel={() => setExportOpen(false)} />}
    </div>
  );
}
