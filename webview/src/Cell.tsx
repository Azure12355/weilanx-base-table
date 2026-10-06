import { useEffect, useRef, useState } from "react";
import type { FieldDef } from "../../src/core/types";
import { tagStyle } from "./config";
import { formatDate, formatNumber } from "./format";
import { useAutoClose } from "./hooks";
import { useHost } from "./host";
import { parseWikiLink } from "../../src/core/links";

const CHECK = "✓";

/** 只读的「完整内容」展示,用于 hover 展开浮层(自动换行、全部呈现) */
export function CellPreview({ def, value, colorful }: { def: FieldDef; value: unknown; colorful: boolean }) {
  switch (def.type) {
    case "select": {
      const v = value as string | undefined;
      return v ? (
        <span className="chip" style={tagStyle(v, def, colorful)}>
          {v}
        </span>
      ) : null;
    }
    case "multi": {
      const sel: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="chips">
          {sel.map((s) => (
            <span key={s} className="chip" style={tagStyle(s, def, colorful)}>
              {s}
            </span>
          ))}
        </div>
      );
    }
    case "number":
      return <span className="num-text">{formatNumber(value, def)}</span>;
    case "date":
      return <span>{formatDate(value, def.dateFormat)}</span>;
    case "link": {
      const url = (value as string) ?? "";
      const wiki = parseWikiLink(url);
      if (wiki) return <span className="wikilink">{wiki.label}</span>;
      return (
        <a href={url} target="_blank" rel="noreferrer" className="expand-link">
          {url}
        </a>
      );
    }
    default:
      return <span className="expand-text">{(value as string) ?? ""}</span>;
  }
}

interface Props {
  def: FieldDef;
  value: unknown;
  colorful: boolean;
  onCommit: (value: unknown) => void;
}

export function Cell({ def, value, colorful, onCommit }: Props) {
  switch (def.type) {
    case "checkbox":
      return (
        <div className="cellbox cell-check">
          <input type="checkbox" checked={value === true} onChange={(e) => onCommit(e.target.checked)} />
        </div>
      );
    case "select":
      return <SelectCell def={def} value={value} colorful={colorful} onCommit={onCommit} />;
    case "multi":
      return <MultiCell def={def} value={value} colorful={colorful} onCommit={onCommit} />;
    case "date":
      return <DateCell def={def} value={value} onCommit={onCommit} />;
    case "number":
      return <NumberCell def={def} value={value} onCommit={onCommit} />;
    case "link":
      return <LinkCell value={value} onCommit={onCommit} />;
    case "longtext":
      return <LongTextCell value={value} onCommit={onCommit} />;
    case "text":
    default:
      if (parseWikiLink(value)) return <WikiCell value={value as string} onCommit={onCommit} />;
      return (
        <div className="cellbox">
          <TextEdit initial={(value as string) ?? ""} onCommit={(t) => onCommit(t === "" ? null : t)} />
        </div>
      );
  }
}

function TextEdit({
  initial,
  onCommit,
  inputType = "text",
  autoFocus = false,
}: {
  initial: string;
  onCommit: (t: string) => void;
  inputType?: string;
  autoFocus?: boolean;
}) {
  const [v, setV] = useState(initial);
  const focused = useRef(false);
  // 外部值变化(撤销/重做、后台回推)且当前未在编辑时,同步到输入框,避免显示旧值
  useEffect(() => {
    if (!focused.current) setV(initial);
  }, [initial]);
  return (
    <input
      type={inputType}
      value={v}
      autoFocus={autoFocus}
      onFocus={() => (focused.current = true)}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (v !== initial) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function SelectCell({ def, value, colorful, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useAutoClose<HTMLDivElement>(open, () => setOpen(false));
  const v = value as string | undefined;
  return (
    <div className="cell-select" ref={ref} onClick={() => setOpen((o) => !o)}>
      <div className="cellbox">
        {v ? (
          <span className="chip" style={tagStyle(v, def, colorful)}>
            {v}
          </span>
        ) : (
          <span className="placeholder">选择…</span>
        )}
      </div>
      {open && (
        <div className="pop select-pop" onClick={(e) => e.stopPropagation()}>
          <div
            className="opt clear"
            onClick={() => {
              onCommit(null);
              setOpen(false);
            }}
          >
            <span className="opt-check" />
            <span className="placeholder">清空</span>
          </div>
          {(def.options ?? []).map((o) => (
            <div
              key={o}
              className={`opt${v === o ? " on" : ""}`}
              onClick={() => {
                onCommit(o);
                setOpen(false);
              }}
            >
              <span className="opt-check">{v === o ? CHECK : ""}</span>
              <span className="chip" style={tagStyle(o, def, colorful)}>
                {o}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiCell({ def, value, colorful, onCommit }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useAutoClose<HTMLDivElement>(open, () => setOpen(false));
  const sel: string[] = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (o: string) => {
    const next = sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o];
    onCommit(next.length ? next : null);
  };
  return (
    <div className="cell-select" ref={ref} onClick={() => setOpen((o) => !o)}>
      <div className="cellbox">
        <div className="chips">
          {sel.length ? (
            sel.map((s) => (
              <span key={s} className="chip" style={tagStyle(s, def, colorful)}>
                {s}
              </span>
            ))
          ) : (
            <span className="placeholder">选择…</span>
          )}
        </div>
      </div>
      {open && (
        <div className="pop select-pop" onClick={(e) => e.stopPropagation()}>
          {(def.options ?? []).map((o) => (
            <div key={o} className={`opt${sel.includes(o) ? " on" : ""}`} onClick={() => toggle(o)}>
              <span className="opt-check">{sel.includes(o) ? CHECK : ""}</span>
              <span className="chip" style={tagStyle(o, def, colorful)}>
                {o}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberCell({ def, value, onCommit }: { def: FieldDef; value: unknown; onCommit: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (editing) {
    return (
      <div className="cellbox">
        <input
          type="number"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const orig = value == null ? "" : String(value);
            if (draft !== orig) onCommit(draft === "" ? null : Number(draft));
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
    );
  }
  const text = formatNumber(value, def);
  return (
    <div
      className="cellbox cell-click"
      onClick={() => {
        setDraft(value == null ? "" : String(value));
        setEditing(true);
      }}
    >
      {text !== "" ? <span className="num-text">{text}</span> : <span className="placeholder">输入…</span>}
    </div>
  );
}

function DateCell({ def, value, onCommit }: { def: FieldDef; value: unknown; onCommit: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="cellbox">
        <input
          type="date"
          autoFocus
          value={value ? String(value).slice(0, 10) : ""}
          onChange={(e) => onCommit(e.target.value || null)}
          onBlur={() => setEditing(false)}
        />
      </div>
    );
  }
  const text = formatDate(value, def.dateFormat);
  return (
    <div className="cellbox cell-click cell-date" onClick={() => setEditing(true)}>
      {text ? (
        <>
          <span className="date-ico" aria-hidden>📅</span>
          <span>{text}</span>
        </>
      ) : (
        <span className="placeholder">选择日期…</span>
      )}
    </div>
  );
}

function LongTextCell({ value, onCommit }: { value: unknown; onCommit: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useAutoClose<HTMLDivElement>(open, () => setOpen(false));
  const text = (value as string) ?? "";
  return (
    <div
      className="cell-select"
      ref={ref}
      onClick={() => {
        setDraft(text);
        setOpen(true);
      }}
    >
      <div className="cellbox">
        {text ? <span className="longtext-preview">{text}</span> : <span className="placeholder">输入…</span>}
      </div>
      {open && (
        <div className="pop longtext-pop" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="longtext-area"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="longtext-foot">
            <button className="btn" onClick={() => setOpen(false)}>
              取消
            </button>
            <button
              className="btn primary"
              onClick={() => {
                if (draft !== text) onCommit(draft === "" ? null : draft);
                setOpen(false);
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** [[笔记]] 链接:点击交给宿主打开(Obsidian 跳转笔记,VS Code 在工作区里找同名 .md) */
function WikiCell({ value, onCommit }: { value: string; onCommit: (v: unknown) => void }) {
  const host = useHost();
  const [editing, setEditing] = useState(false);
  const wiki = parseWikiLink(value);
  if (editing || !wiki) {
    return (
      <div className="cellbox">
        <TextEdit
          initial={value}
          autoFocus={editing}
          onCommit={(t) => {
            onCommit(t === "" ? null : t);
            setEditing(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="cellbox cell-link">
      <a
        className="wikilink"
        href="#"
        title={wiki.target}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          host.post({ type: "openLink", target: wiki.target });
        }}
      >
        {wiki.label}
      </a>
      <button className="mini" onClick={() => setEditing(true)} title="编辑">
        ✎
      </button>
    </div>
  );
}

function LinkCell({ value, onCommit }: { value: unknown; onCommit: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const url = (value as string) ?? "";
  if (!editing && parseWikiLink(url)) return <WikiCell value={url} onCommit={onCommit} />;
  if (editing || !url) {
    return (
      <div className="cellbox">
        <TextEdit
          initial={url}
          onCommit={(t) => {
            onCommit(t === "" ? null : t);
            setEditing(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="cellbox cell-link">
      <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {url}
      </a>
      <button className="mini" onClick={() => setEditing(true)} title="编辑">
        ✎
      </button>
    </div>
  );
}
