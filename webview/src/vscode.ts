// Webview ↔ 扩展 的消息桥。acquireVsCodeApi 只能调一次,单例持有。
import type { BaseTable, FieldDef, ViewDef } from "../../src/base/types";
import type { UIConfig } from "./config";

interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

// 预览模式(浏览器里没有 acquireVsCodeApi)用一个空实现,方便本地调试
const api: VsCodeApi = window.acquireVsCodeApi
  ? window.acquireVsCodeApi()
  : { postMessage: (m) => console.log("[preview] postMessage", m) };

export type OutMsg =
  | { type: "ready" }
  | { type: "updateCell"; id: string; field: string; value: unknown }
  | { type: "addRow" }
  | { type: "deleteRow"; id: string }
  | { type: "saveViews"; views: ViewDef[] }
  | { type: "renameField"; oldName: string; newName: string }
  | { type: "setField"; name: string; patch: Partial<FieldDef> }
  | { type: "addField"; name: string; def: FieldDef; after?: string }
  | { type: "duplicateField"; name: string }
  | { type: "reorderFields"; names: string[] }
  | { type: "moveRow"; id: string; targetId: string }
  | { type: "moveRowTo"; id: string; targetId: string; before: boolean }
  | { type: "deleteField"; name: string }
  | { type: "replaceAll"; doc: { fields: Record<string, FieldDef>; views: ViewDef[]; records: Record<string, unknown>[] } }
  | { type: "export"; defaultName: string; content: string };

export type InMsg =
  | { type: "tableData"; table: BaseTable; config: UIConfig }
  | { type: "command"; command: "undo" | "redo" | "addRow" | "export" };

export function post(msg: OutMsg): void {
  api.postMessage(msg);
}

export function onMessage(handler: (msg: InMsg) => void): () => void {
  const listener = (e: MessageEvent) => handler(e.data as InMsg);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
