import * as vscode from "vscode";
import * as path from "path";
import { BaseEditorProvider } from "./panel";

/** 侧边栏列出工作区内所有 .wbase / .base 文件,点击用多维表格编辑器打开 */
export class BaseFilesProvider implements vscode.TreeDataProvider<BaseFileItem> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  refresh() {
    this._onDidChange.fire();
  }

  getTreeItem(item: BaseFileItem): vscode.TreeItem {
    return item;
  }

  async getChildren(): Promise<BaseFileItem[]> {
    const uris = await vscode.workspace.findFiles("**/*.{wbase,base}", "**/node_modules/**");
    uris.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    const icon = vscode.Uri.joinPath(this.context.extensionUri, "media", "base-file.svg");
    return uris.map((uri) => new BaseFileItem(uri, icon));
  }
}

class BaseFileItem extends vscode.TreeItem {
  constructor(uri: vscode.Uri, icon: vscode.Uri) {
    super(path.basename(uri.fsPath).replace(/\.(wbase|base)$/, ""), vscode.TreeItemCollapsibleState.None);
    this.resourceUri = uri;
    this.iconPath = icon;
    this.tooltip = vscode.workspace.asRelativePath(uri);
    this.description = path.dirname(vscode.workspace.asRelativePath(uri));
    this.contextValue = "baseFile";
    this.command = {
      command: "vscode.openWith",
      title: "打开多维表格",
      arguments: [uri, BaseEditorProvider.viewType],
    };
  }
}
