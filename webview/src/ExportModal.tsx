import { useState } from "react";

export type ExportFormat = "csv" | "xls" | "json";

const FORMATS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: "csv", label: "CSV", desc: "通用表格,Excel / 数值分析都能打开" },
  { value: "xls", label: "Excel", desc: "Excel / WPS 直接打开的 .xls" },
  { value: "json", label: "JSON", desc: "完整结构(字段 + 视图 + 记录)" },
];

interface Props {
  onExport: (format: ExportFormat) => void;
  onCancel: () => void;
}

export function ExportModal({ onExport, onCancel }: Props) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  return (
    <div className="modal-mask" onMouseDown={onCancel}>
      <div className="modal export-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">导出</div>
        <label className="fld-label">选择格式</label>
        <div className="export-list">
          {FORMATS.map((f) => (
            <button key={f.value} className={`export-opt${format === f.value ? " on" : ""}`} onClick={() => setFormat(f.value)}>
              <span className="export-radio" />
              <span className="export-meta">
                <span className="export-name">{f.label}</span>
                <span className="export-desc">{f.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" onClick={() => onExport(format)}>
            导出
          </button>
        </div>
      </div>
    </div>
  );
}
