// 界面 ↔ 宿主 的消息桥。
// VS Code:界面跑在 webview 里,用 acquireVsCodeApi().postMessage 和 window message 事件通信(默认)。
// Obsidian:界面直接挂在视图里,每个视图把自己的 Host 作为 <App host> 传入。
import type { BaseTable, FieldDef, ViewDef } from "../../src/core/types";
import type { UIConfig } from "./config";
import { createContext, useContext } from "react";

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
  | { type: "export"; defaultName: string; content: string }
  | { type: "openLink"; target: string };

export type InMsg =
  | { type: "tableData"; table: BaseTable; config: UIConfig }
  | { type: "command"; command: "undo" | "redo" | "addRow" | "export" };

export interface Host {
  /** 界面 → 宿主 */
  post(msg: OutMsg): void;
  /** 订阅 宿主 → 界面 的消息,返回取消订阅 */
  subscribe(handler: (msg: InMsg) => void): () => void;
}

interface VsCodeApi {
  postMessage(msg: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

function webviewHost(): Host {
  // acquireVsCodeApi 只能调一次;浏览器预览模式下没有它,用打印代替
  const api: VsCodeApi = window.acquireVsCodeApi
    ? window.acquireVsCodeApi()
    : { postMessage: (m) => console.log("[preview] postMessage", m) };
  return {
    post: (msg) => api.postMessage(msg),
    subscribe(handler) {
      const listener = (e: MessageEvent) => handler(e.data as InMsg);
      window.addEventListener("message", listener);
      return () => window.removeEventListener("message", listener);
    },
  };
}

let vscodeHost: Host | null = null;
/** VS Code webview / 浏览器预览的默认宿主(单例) */
export function defaultHost(): Host {
  return (vscodeHost ??= webviewHost());
}

/** 当前界面实例的宿主;Obsidian 里每个表格视图各有一个,互不串消息 */
export const HostContext = createContext<Host | null>(null);

export function useHost(): Host {
  return useContext(HostContext) ?? defaultHost();
}
