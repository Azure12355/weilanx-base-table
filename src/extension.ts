import * as vscode from "vscode";
import * as path from "path";
import { BaseEditorProvider, BaseTableController, HostCommand } from "./panel";
import { BaseFilesProvider } from "./tree";

/** 新建 .base 的起始内容:一个主字段 + 一个带配色的状态字段 + 「全部」视图 */
function starterDoc(): string {
  return (
    JSON.stringify(
      {
        fields: {
          标题: { type: "text", primary: true },
          状态: {
            type: "select",
            options: ["待办", "进行中", "已完成"],
            colors: { 待办: "gray", 进行中: "blue", 已完成: "green" },
          },
        },
        views: [{ name: "全部" }],
        records: [],
      },
      null,
      2
    ) + "\n"
  );
}

async function isDir(uri: vscode.Uri): Promise<boolean> {
  try {
    return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

/**
 * Material Icon Theme 不显示插件贡献的语言图标,只认它自己的关联配置。
 * 首次激活时给 *.base 关联它内置的 table 图标;只做一次,用户删掉后不再写回。
 */
async function ensureMaterialIcon(context: vscode.ExtensionContext) {
  const KEY = "materialIconAssociated";
  if (context.globalState.get<boolean>(KEY)) return;
  const theme = vscode.workspace.getConfiguration("workbench").get<string>("iconTheme");
  if (theme !== "material-icon-theme") return;
  const cfg = vscode.workspace.getConfiguration("material-icon-theme");
  const assoc = { ...(cfg.get<Record<string, string>>("files.associations") ?? {}) };
  if (!assoc["*.base"]) {
    assoc["*.base"] = "table";
    await cfg.update("files.associations", assoc, vscode.ConfigurationTarget.Global);
  }
  await context.globalState.update(KEY, true);
}

export function activate(context: vscode.ExtensionContext) {
  ensureMaterialIcon(context).catch(() => undefined);

  // 表格内快捷键(撤销/重做/新增记录/导出):在「键盘快捷方式」里可改键
  const hostCommands: Record<string, HostCommand> = {
    "baseTable.undo": "undo",
    "baseTable.redo": "redo",
    "baseTable.addRow": "addRow",
    "baseTable.export": "export",
  };
  for (const [id, command] of Object.entries(hostCommands)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, () => BaseTableController.active?.runCommand(command))
    );
  }
  context.subscriptions.push(
    vscode.commands.registerCommand("baseTable.openKeybindings", () =>
      vscode.commands.executeCommand("workbench.action.openGlobalKeybindings", "baseTable.")
    )
  );

  // 双击 .base 文件 → 自定义编辑器直接打开多维表格
  context.subscriptions.push(BaseEditorProvider.register(context));

  // 侧边栏「多维表格」目录树:列出工作区内所有 .base
  const treeProvider = new BaseFilesProvider(context);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("baseTable.files", treeProvider));
  context.subscriptions.push(vscode.commands.registerCommand("baseTable.refreshTree", () => treeProvider.refresh()));
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.base");
  watcher.onDidCreate(() => treeProvider.refresh());
  watcher.onDidDelete(() => treeProvider.refresh());
  watcher.onDidChange(() => treeProvider.refresh());
  context.subscriptions.push(watcher);

  // 创建多维表格:右键文件夹 / 命令面板(Ctrl+Shift+P)
  context.subscriptions.push(
    vscode.commands.registerCommand("baseTable.create", async (uri?: vscode.Uri) => {
      const name = await vscode.window.showInputBox({
        prompt: "多维表格名称",
        value: "新建表格",
        validateInput: (v) => (v.trim() ? undefined : "请输入名称"),
      });
      if (!name) return;
      const fileName = name.trim().replace(/\.base$/, "") + ".base";

      // 目标目录:右键的文件夹 → 右键文件的父目录 → 工作区根 → 另存为对话框
      let folder: vscode.Uri | undefined;
      if (uri) folder = (await isDir(uri)) ? uri : vscode.Uri.file(path.dirname(uri.fsPath));
      folder = folder ?? vscode.workspace.workspaceFolders?.[0]?.uri;

      let target: vscode.Uri | undefined;
      if (folder) {
        target = vscode.Uri.joinPath(folder, fileName);
        try {
          await vscode.workspace.fs.stat(target);
          vscode.window.showErrorMessage(`已存在同名文件: ${fileName}`);
          return;
        } catch {
          /* 不存在,继续 */
        }
      } else {
        target = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(fileName),
          filters: { "多维表格": ["base"] },
          title: "创建多维表格",
        });
      }
      if (!target) return;

      await vscode.workspace.fs.writeFile(target, Buffer.from(starterDoc(), "utf8"));
      await vscode.commands.executeCommand("vscode.openWith", target, BaseEditorProvider.viewType);
    })
  );

  // 命令/右键:用自定义编辑器打开选中的 .base 文件(兜底入口)
  context.subscriptions.push(
    vscode.commands.registerCommand("baseTable.open", async (uri?: vscode.Uri) => {
      let target = uri;
      if (!target) {
        const picked = await vscode.window.showOpenDialog({
          canSelectFolders: false,
          canSelectFiles: true,
          canSelectMany: false,
          filters: { "多维表格": ["base"] },
          title: "选择一个 .base 多维表格文件",
        });
        target = picked?.[0];
      }
      if (!target) return;
      if (!target.fsPath.endsWith(".base")) {
        vscode.window.showErrorMessage("请选择一个 .base 文件(多维表格)");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", target, BaseEditorProvider.viewType);
    })
  );
}

export function deactivate() {}
