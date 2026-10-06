// Weilanx Base Table · Obsidian 插件入口
import { App, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, Notice, normalizePath, moment } from "obsidian";
import { VIEW_TYPE, WbaseView, isWbase } from "./view";
import type { UIConfig } from "../../webview/src/config";
import { parseDoc, serializeDoc, starterDoc } from "../core/doc";
import { renameLinks } from "../core/links";

interface Settings {
  rowHeight: UIConfig["rowHeight"];
  showRowNumbers: boolean;
  fontSize: number;
  colorfulTags: boolean;
  wrapText: boolean;
  /** 笔记改名时同步更新表格里的 [[链接]] */
  syncLinksOnRename: boolean;
}

const DEFAULTS: Settings = {
  rowHeight: "medium",
  showRowNumbers: true,
  fontSize: 0,
  colorfulTags: true,
  wrapText: false,
  syncLinksOnRename: true,
};

/** 命令名跟随 Obsidian 界面语言 */
const zh = () => moment.locale().toLowerCase().startsWith("zh");
const t = (cn: string, en: string) => (zh() ? cn : en);

export default class WeilanxBaseTablePlugin extends Plugin {
  settings: Settings = { ...DEFAULTS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new WbaseView(leaf, this));
    this.registerExtensions(["wbase"], VIEW_TYPE);

    this.addRibbonIcon("table", t("新建多维表格", "New base table"), () => this.createTable());
    this.addCommand({ id: "create-table", name: t("新建多维表格", "Create new base table"), callback: () => this.createTable() });

    // 作用于当前表格视图的命令:没有打开表格时在命令面板里不显示
    const viewCommand = (id: string, cn: string, en: string, c: "undo" | "redo" | "addRow" | "export") =>
      this.addCommand({
        id,
        name: t(cn, en),
        checkCallback: (checking) => {
          const view = this.app.workspace.getActiveViewOfType(WbaseView);
          if (!view) return false;
          if (!checking) view.command(c);
          return true;
        },
      });
    viewCommand("undo", "撤销", "Undo", "undo");
    viewCommand("redo", "重做", "Redo", "redo");
    viewCommand("add-record", "新增记录", "Add record", "addRow");
    viewCommand("export", "导出表格", "Export table", "export");

    // 文件列表右键文件夹:在这里新建
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) return;
        menu.addItem((item) =>
          item
            .setTitle(t("新建多维表格", "New base table"))
            .setIcon("table")
            .onClick(() => this.createTable(file))
        );
      })
    );

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onRename(file, oldPath)));
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  uiConfig(): UIConfig {
    const { rowHeight, showRowNumbers, fontSize, colorfulTags, wrapText } = this.settings;
    return { rowHeight, showRowNumbers, fontSize, colorfulTags, wrapText };
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULTS, ...((await this.loadData()) as Partial<Settings> | null) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // 设置改动即时生效
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) (leaf.view as WbaseView).push();
  }

  /** 在指定目录(默认:当前文件所在目录)新建一张表并打开 */
  async createTable(folder?: TFolder): Promise<void> {
    const dir = folder?.path ?? this.app.workspace.getActiveFile()?.parent?.path ?? "";
    const base = t("新建表格", "Untitled table");
    let path = normalizePath(`${dir}/${base}.wbase`);
    for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) path = normalizePath(`${dir}/${base} ${n}.wbase`);
    const file = await this.app.vault.create(path, serializeDoc(starterDoc()));
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  /** 笔记改名:把所有表格里的 [[旧名]] 换成新名。打开着的表格直接改内存,避免和未保存的编辑冲突 */
  private async onRename(file: TAbstractFile, oldPath: string): Promise<void> {
    if (!this.settings.syncLinksOnRename || !(file instanceof TFile) || file.extension !== "md") return;
    const oldName = oldPath.split("/").pop()!.replace(/\.md$/, "");
    if (oldName === file.basename) return; // 只是换了目录,[[名字]] 仍然有效

    const open = new Map<string, WbaseView>();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      const view = leaf.view as WbaseView;
      if (view.file) open.set(view.file.path, view);
    }
    let total = 0;
    for (const f of this.app.vault.getFiles()) {
      if (!isWbase(f)) continue;
      const view = open.get(f.path);
      if (view) {
        let n = 0;
        view.applyExternal((doc) => (n = renameLinks(doc, oldName, file.basename)));
        total += n;
        continue;
      }
      await this.app.vault.process(f, (text) => {
        let doc;
        try {
          doc = parseDoc(text, true);
        } catch {
          return text; // 坏文件不动
        }
        const n = renameLinks(doc, oldName, file.basename);
        total += n;
        return n ? serializeDoc(doc) : text;
      });
    }
    if (total) new Notice(t(`已更新 ${total} 处表格链接:[[${oldName}]] → [[${file.basename}]]`, `Updated ${total} table link(s) to [[${file.basename}]]`));
  }
}

class SettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: WeilanxBaseTablePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();

    new Setting(containerEl)
      .setName(t("默认行高", "Default row height"))
      .addDropdown((d) =>
        d
          .addOptions({ compact: t("紧凑", "Compact"), medium: t("中等", "Medium"), tall: t("宽松", "Tall") })
          .setValue(s.rowHeight)
          .onChange((v) => {
            s.rowHeight = v as Settings["rowHeight"];
            void save();
          })
      );
    new Setting(containerEl).setName(t("显示行号列", "Show row numbers")).addToggle((tg) =>
      tg.setValue(s.showRowNumbers).onChange((v) => {
        s.showRowNumbers = v;
        void save();
      })
    );
    new Setting(containerEl)
      .setName(t("单元格字号", "Cell font size"))
      .setDesc(t("单位 px,0 表示跟随 Obsidian 界面字号", "In px. 0 follows the Obsidian UI font size"))
      .addText((tx) =>
        tx.setValue(String(s.fontSize)).onChange((v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) {
            s.fontSize = n;
            void save();
          }
        })
      );
    new Setting(containerEl).setName(t("彩色选项标签", "Colorful option tags")).addToggle((tg) =>
      tg.setValue(s.colorfulTags).onChange((v) => {
        s.colorfulTags = v;
        void save();
      })
    );
    new Setting(containerEl).setName(t("单元格文字换行", "Wrap text in cells")).addToggle((tg) =>
      tg.setValue(s.wrapText).onChange((v) => {
        s.wrapText = v;
        void save();
      })
    );
    new Setting(containerEl)
      .setName(t("笔记改名时同步更新链接", "Update links when notes are renamed"))
      .setDesc(t("笔记改名后,把所有表格里的 [[旧名]] 自动改成新名", "Rewrite [[old name]] in every table when a note is renamed"))
      .addToggle((tg) =>
        tg.setValue(s.syncLinksOnRename).onChange((v) => {
          s.syncLinksOnRename = v;
          void save();
        })
      );
  }
}
