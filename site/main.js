// 中英切换 / 格式面板切换 / 复制按钮 / 滚动显现
document.documentElement.classList.add("js");

const DICT = {
  en: {
    "nav.agent": "For agents",
    "agent.eyebrow": "For agents",
    "agent.title": "Let your agent install it.",
    "agent.sub": "Paste one prompt into Claude Code, Codex or Cursor. It downloads the latest release, installs it and checks the result.",
    "agent.p1": "Finds VS Code, Cursor, Windsurf or Insiders on its own",
    "agent.p2": "Verifies the install before reporting back",
    "agent.p3": 'Full steps in <a href="https://github.com/Azure12355/weilanx-base-table/blob/main/docs/install-for-agents.md">install-for-agents.md</a>',
    "agent.manual": "Prefer to install by hand?",
    "agent.tab.prompt": "Prompt",
    "agent.tab.shell": "Shell",
    "agent.shell.c1": "# macOS / Linux: installs into every VS Code based editor it finds",
    "agent.shell.c2": "# Only one editor",
    "agent.prompt": `Install the Weilanx Base Table VS Code extension for me.

1. Follow https://github.com/Azure12355/weilanx-base-table/blob/main/docs/install-for-agents.md
2. On macOS / Linux, run:
   curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
   Otherwise download releases/latest/download/weilanx-base-table.vsix
   and run: code --install-extension weilanx-base-table.vsix --force
3. Verify that "code --list-extensions" contains weilanx.weilanx-base-table,
   then tell me to run "Developer: Reload Window".`,
    "title": "Weilanx Base Table · Multidimensional tables for VS Code",
    "nav.features": "Features",
    "nav.format": "File format",
    "nav.install": "Install",
    "cta.install": "Install",
    "hero.eyebrow": "VS Code extension",
    "hero.title": "Your tables, in a <em>plain JSON</em> file.",
    "hero.sub": "Views, filters, grouping and inline editing for .base files in VS Code. Readable by people and AI agents alike.",
    "features.title": "Everything a table needs. Nothing it doesn't.",
    "f.group.t": "Views that remember",
    "f.group.d": "Every view keeps its own filters, sorting, grouping, hidden columns and widths. Switch with one click.",
    "f.filter.t": "Filters that read like sentences",
    "f.filter.d": "Combine conditions with AND or OR, across 16 operators.",
    "f.types.t": "Eight field types",
    "type.text": "Text", "type.longtext": "Long text", "type.select": "Single select", "type.multi": "Multi select",
    "type.date": "Date", "type.number": "Number", "type.checkbox": "Checkbox", "type.link": "Link",
    "f.keys.t": "Real VS Code shortcuts",
    "f.keys.d": "Rebind any of them in Keyboard Shortcuts.",
    "k.undo": "Undo", "k.redo": "Redo", "k.copy": "Copy records", "k.add": "New record",
    "f.select.t": "Select, copy, paste anywhere",
    "f.select.d": "Hover a row number to multi-select. Copied records paste cleanly into Excel, Google Sheets, Feishu and WPS.",
    "format.title": "One file. Two kinds of readers.",
    "format.sub": "People get a spreadsheet. Agents get JSON they can parse in one call and edit with a few lines of code.",
    "format.human": "For people",
    "format.agent": "For agents",
    "copy": "Copy",
    "copied": "Copied",
    "fact.single": "One file per table, diff-friendly in git",
    "fact.id": "Stable record ids, safe for scripted edits",
    "fact.live": "External edits show up live in the open table",
    "install.title": "Up and running in a minute.",
    "install.sub": "Works with VS Code 1.90 or later, plus Cursor and other VS Code based editors.",
    "s1.t": "Download the .vsix",
    "s1.d": 'Grab the latest build from <a href="https://github.com/Azure12355/weilanx-base-table/releases">GitHub Releases</a>, or package it yourself:',
    "s2.t": "Install from VSIX",
    "s2.d": "Open the Extensions panel, click the ··· menu and choose Install from VSIX. Or use the CLI:",
    "s3.t": "Open or create a .base file",
    "s3.d": 'Double-click any .base file, or run "Create Base Table" from the Command Palette. The sidebar lists every table in your workspace.',
    "closing.title": "Open source, MIT licensed.",
    "closing.sub": "Issues and pull requests are welcome.",
    "foot.source": "Source",
    "foot.issues": "Issues",
  },
  zh: {
    "nav.agent": "让 Agent 安装",
    "agent.eyebrow": "给 Agent 用",
    "agent.title": "交给 Agent，一句话装好。",
    "agent.sub": "把下面这段提示词粘贴给 Claude Code、Codex 或 Cursor，它会自己下载最新版本、安装并检查结果。",
    "agent.p1": "自动找到 VS Code、Cursor、Windsurf 或 Insiders",
    "agent.p2": "装完先校验，再向你汇报",
    "agent.p3": '完整步骤见 <a href="https://github.com/Azure12355/weilanx-base-table/blob/main/docs/install-for-agents.md">install-for-agents.md</a>',
    "agent.manual": "想自己手动安装？",
    "agent.tab.prompt": "提示词",
    "agent.tab.shell": "命令行",
    "agent.shell.c1": "# macOS / Linux：自动装进本机所有基于 VS Code 的编辑器",
    "agent.shell.c2": "# 只装到某一个编辑器",
    "agent.prompt": `帮我安装 Weilanx Base Table 这个 VS Code 插件。

1. 按照 https://github.com/Azure12355/weilanx-base-table/blob/main/docs/install-for-agents.md 操作
2. macOS / Linux 直接运行：
   curl -fsSL https://raw.githubusercontent.com/Azure12355/weilanx-base-table/main/scripts/install.sh | bash
   其他系统下载 releases/latest/download/weilanx-base-table.vsix，
   再运行：code --install-extension weilanx-base-table.vsix --force
3. 确认 "code --list-extensions" 里有 weilanx.weilanx-base-table，
   然后提醒我执行 "Developer: Reload Window"。`,
    "title": "Weilanx 多维表格 · VS Code 里的多维表格",
    "nav.features": "功能",
    "nav.format": "文件格式",
    "nav.install": "安装",
    "cta.install": "安装",
    "hero.eyebrow": "VS Code 插件",
    "hero.title": "多维表格，<br>存成 <em>JSON</em> 文件。",
    "hero.sub": "在 VS Code 里给 .base 文件做视图、筛选、分组和内联编辑。人能看懂，AI Agent 也能直接读写。",
    "features.title": "表格该有的都有，多余的一样没有。",
    "f.group.t": "每个视图各记各的",
    "f.group.d": "筛选、排序、分组、隐藏列、列宽，每个视图单独保存，点一下就切换。",
    "f.filter.t": "像说话一样写筛选",
    "f.filter.d": "多个条件用「且 / 或」组合，支持 16 种比较方式。",
    "f.types.t": "8 种字段类型",
    "type.text": "文本", "type.longtext": "长文本", "type.select": "单选", "type.multi": "多选",
    "type.date": "日期", "type.number": "数字", "type.checkbox": "复选框", "type.link": "链接",
    "f.keys.t": "原生 VS Code 快捷键",
    "f.keys.d": "每一个都能在「键盘快捷方式」里改键。",
    "k.undo": "撤销", "k.redo": "重做", "k.copy": "复制记录", "k.add": "新增记录",
    "f.select.t": "多选、复制、随处粘贴",
    "f.select.d": "悬停行号即可多选。复制的记录粘贴到 Excel、Google Sheets、飞书、WPS 都会自动分格。",
    "format.title": "一个文件，两种读者。",
    "format.sub": "人看到的是一张表格；Agent 拿到的是 JSON，一次解析读全，几行代码就能改。",
    "format.human": "给人看",
    "format.agent": "给 Agent 读",
    "copy": "复制",
    "copied": "已复制",
    "fact.single": "一张表一个文件，git diff 一目了然",
    "fact.id": "每条记录有稳定 id，脚本修改不出错",
    "fact.live": "文件被外部修改，打开的表格实时刷新",
    "install.title": "一分钟装好开用。",
    "install.sub": "支持 VS Code 1.90 及以上，Cursor 等基于 VS Code 的编辑器同样可用。",
    "s1.t": "下载 .vsix",
    "s1.d": '从 <a href="https://github.com/Azure12355/weilanx-base-table/releases">GitHub Releases</a> 下载最新版本，或者自己打包：',
    "s2.t": "从 VSIX 安装",
    "s2.d": "打开扩展面板，点 ··· 菜单，选择「从 VSIX 安装」。也可以用命令行：",
    "s3.t": "打开或新建 .base 文件",
    "s3.d": "双击任意 .base 文件，或在命令面板运行「创建多维表格」。侧边栏会列出工作区里的所有表格。",
    "closing.title": "开源，MIT 协议。",
    "closing.sub": "欢迎提 Issue 和 Pull Request。",
    "foot.source": "源码",
    "foot.issues": "问题反馈",
  },
};

const toggle = document.getElementById("lang-toggle");
let lang = localStorage.getItem("lang") || (navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en");

function applyLang(next) {
  lang = next;
  const d = DICT[lang];
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = d.title;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = d[el.dataset.i18n];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = d[el.dataset.i18nHtml];
    if (v != null) el.innerHTML = v;
  });
  toggle.textContent = lang === "zh" ? "EN" : "中文";
  toggle.setAttribute("aria-label", lang === "zh" ? "Switch to English" : "切换到中文");
}
toggle.addEventListener("click", () => {
  const next = lang === "zh" ? "en" : "zh";
  localStorage.setItem("lang", next);
  applyLang(next);
});
applyLang(lang);

// 格式面板:给人看 / 给 Agent 读
const tabs = [...document.querySelectorAll(".switch-btn")];
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      const pane = document.getElementById(t.getAttribute("aria-controls"));
      pane.hidden = !on;
      pane.classList.toggle("is-active", on);
    });
  });
});

// Agent 模块:提示词 / 命令行 切换
const agentTabs = [...document.querySelectorAll(".agent-tab")];
agentTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    agentTabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      const pane = document.getElementById(t.getAttribute("aria-controls"));
      pane.hidden = !on;
      pane.classList.toggle("is-active", on);
    });
  });
});

// 复制按钮(data-copy 指定元素;data-copy-active 复制 Agent 模块当前面板)
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const src = btn.dataset.copyActive
      ? document.querySelector(".agent-pane:not([hidden])")
      : document.getElementById(btn.dataset.copy);
    try {
      await navigator.clipboard.writeText(src.innerText);
    } catch {
      return;
    }
    const label = btn.querySelector("span");
    const icon = btn.querySelector("i");
    btn.classList.add("is-done");
    icon.className = "ph ph-check";
    if (label) label.textContent = DICT[lang].copied;
    setTimeout(() => {
      btn.classList.remove("is-done");
      icon.className = "ph ph-copy";
      if (label) label.textContent = DICT[lang].copy;
    }, 1400);
  });
});

// 滚动显现(IntersectionObserver,不监听 scroll)
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
