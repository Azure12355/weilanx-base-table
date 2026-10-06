// Obsidian 里的表格视图:一个 .wbase 文件对应一个视图,界面直接挂在视图容器里(不用 iframe)。
// 数据流:界面发消息 → core/ops 改内存里的 doc → requestSave()(Obsidian 防抖 2 秒写回文件)。
// 外部修改(同步 / git / Agent)由 TextFileView 重新调用 setViewData,整表刷新。
import { Notice, Scope, TextFileView, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { App } from "../../webview/src/App";
import type { Host, InMsg, OutMsg } from "../../webview/src/host";
import type { UIConfig } from "../../webview/src/config";
import { BaseDoc } from "../core/types";
import { emptyDoc, parseDoc, serializeDoc, toTable } from "../core/doc";
import * as ops from "../core/ops";
import type WeilanxBaseTablePlugin from "./main";

export const VIEW_TYPE = "weilanx-base-table";

export class WbaseView extends TextFileView {
  doc: BaseDoc = emptyDoc();
  /** 最近一次读入或写出的文本,用来忽略自己保存后触发的重新加载 */
  private lastText = "";
  /** 文件不是合法 JSON 时为 true:不渲染表格,也绝不写回,避免把坏文件覆盖成空表 */
  private broken = false;
  private root: Root | null = null;
  private listeners = new Set<(m: InMsg) => void>();

  /** 每个视图一个宿主,多个表格同时打开互不串消息 */
  private readonly host: Host = {
    post: (m) => this.onMessage(m),
    subscribe: (handler) => {
      this.listeners.add(handler);
      return () => this.listeners.delete(handler);
    },
  };

  constructor(leaf: WorkspaceLeaf, private readonly plugin: WeilanxBaseTablePlugin) {
    super(leaf);
    // 快捷键只在本视图获得焦点时生效,不占用全局热键
    this.scope = new Scope(this.app.scope);
    this.scope.register(["Mod"], "z", () => this.command("undo"));
    this.scope.register(["Mod", "Shift"], "z", () => this.command("redo"));
    this.scope.register(["Mod"], "y", () => this.command("redo"));
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "多维表格";
  }

  getIcon(): string {
    return "table";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("wbt-root", "wbt-obsidian");
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
    this.listeners.clear();
  }

  // ---------- TextFileView ----------

  setViewData(data: string, clear: boolean): void {
    if (!clear && data === this.lastText) return; // 自己刚保存的内容,界面已是最新
    this.lastText = data;
    try {
      this.doc = parseDoc(data, true);
      this.broken = false;
    } catch (err) {
      this.broken = true;
      this.showError(err as Error);
      return;
    }
    if (clear || !this.root) this.mount();
    else this.push();
  }

  getViewData(): string {
    if (this.broken) return this.data; // 原样返回,不改坏文件
    this.lastText = serializeDoc(this.doc);
    return this.lastText;
  }

  clear(): void {
    this.doc = emptyDoc();
    this.lastText = "";
  }

  // ---------- 界面 ----------

  private mount(): void {
    this.root?.unmount();
    this.contentEl.empty();
    const el = this.contentEl.createDiv({ cls: "wbt-host" });
    el.style.height = "100%";
    this.root = createRoot(el);
    // key 随文件变化,切换文件时界面状态(撤销历史、选中行)整体重置
    this.root.render(createElement(App, { host: this.host, key: this.file?.path ?? "" }));
  }

  private showError(err: Error): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
    const box = this.contentEl.createDiv({ cls: "wbt-error" });
    box.createEl("h3", { text: "无法打开这个多维表格" });
    box.createEl("p", { text: "文件内容不是有效的 JSON,可能是同步冲突或手动编辑出错。为避免覆盖,插件不会写入这个文件。修好 JSON 后会自动重新加载。" });
    box.createEl("pre", { text: err.message });
  }

  private emit(m: InMsg): void {
    for (const l of this.listeners) l(m);
  }

  private config(): UIConfig {
    return this.plugin.uiConfig();
  }

  /** 把当前文档推给界面 */
  push(): void {
    if (this.broken || !this.file) return;
    this.emit({ type: "tableData", table: toTable(this.doc, this.file.path), config: this.config() });
  }

  /** 宿主命令(撤销 / 重做 / 新增 / 导出),返回 false 阻止默认按键行为 */
  command(c: "undo" | "redo" | "addRow" | "export"): boolean {
    this.emit({ type: "command", command: c });
    return false;
  }

  /** 外部(如笔记改名同步)直接修改文档后调用 */
  applyExternal(fn: (doc: BaseDoc) => void): void {
    fn(this.doc);
    this.requestSave();
    this.push();
  }

  private onMessage(m: OutMsg): void {
    const d = this.doc;
    try {
      switch (m.type) {
        case "ready":
          this.push();
          return;
        case "openLink":
          this.app.workspace.openLinkText(m.target, this.file?.path ?? "", false);
          return;
        case "export":
          void this.exportFile(m.defaultName, m.content);
          return;
        // 高频操作:界面已乐观更新,只改数据并排队保存
        case "updateCell":
          ops.updateCell(d, m.id, m.field, m.value);
          break;
        case "deleteRow":
          ops.deleteRow(d, m.id);
          break;
        case "saveViews":
          ops.saveViews(d, m.views);
          break;
        case "setField":
          ops.setField(d, m.name, m.patch);
          break;
        case "renameField":
          ops.renameField(d, m.oldName, m.newName);
          break;
        case "reorderFields":
          ops.reorderFields(d, m.names);
          break;
        case "moveRow":
          ops.moveRow(d, m.id, m.targetId);
          break;
        case "moveRowTo":
          ops.moveRowTo(d, m.id, m.targetId, m.before);
          break;
        case "replaceAll":
          ops.replaceAll(d, m.doc);
          break;
        // 需要生成新数据(id / 字段名)的操作:改完回推一次
        case "addRow":
          ops.addRow(d);
          this.requestSave();
          this.push();
          return;
        case "addField":
          ops.addField(d, m.name, m.def, m.after);
          this.requestSave();
          this.push();
          return;
        case "duplicateField":
          ops.duplicateField(d, m.name);
          this.requestSave();
          this.push();
          return;
        case "deleteField":
          ops.deleteField(d, m.name);
          this.requestSave();
          this.push();
          return;
      }
      this.requestSave();
    } catch (err) {
      new Notice(`多维表格操作失败: ${(err as Error).message}`);
      this.push(); // 出错才回推纠正
    }
  }

  /** 导出到表格所在目录,重名自动加序号 */
  private async exportFile(defaultName: string, content: string): Promise<void> {
    const dir = this.file?.parent?.path ?? "";
    const dot = defaultName.lastIndexOf(".");
    const stem = dot > 0 ? defaultName.slice(0, dot) : defaultName;
    const ext = dot > 0 ? defaultName.slice(dot) : "";
    let path = normalizePath(`${dir}/${stem}${ext}`);
    for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = normalizePath(`${dir}/${stem} ${n}${ext}`);
    try {
      const file = await this.app.vault.create(path, content);
      new Notice(`已导出到 ${file.path}`);
    } catch (err) {
      new Notice(`导出失败: ${(err as Error).message}`);
    }
  }
}

export function isWbase(file: unknown): file is TFile {
  return file instanceof TFile && file.extension === "wbase";
}
