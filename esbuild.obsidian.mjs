// Obsidian 插件打包:main.js(插件 + React 界面)、styles.css(主题映射 + 加作用域的共享样式)、manifest.json
// 用法:node esbuild.obsidian.mjs [--watch] [--out <dir>]
import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "dist/obsidian";
fs.mkdirSync(outDir, { recursive: true });

/** 把共享样式包进 `body .wbt-root { ... }`;@keyframes 不能嵌套,提到最外层 */
function scopedCss() {
  let src = fs.readFileSync("webview/src/style.css", "utf8");
  const keyframes = [];
  let out = "";
  for (let i = 0; i < src.length; ) {
    const k = src.indexOf("@keyframes", i);
    if (k < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, k);
    let depth = 0;
    let j = src.indexOf("{", k);
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}" && --depth === 0) break;
    }
    keyframes.push(src.slice(k, j + 1));
    i = j + 1;
  }
  // 共享样式里的 .wbt-root 就是包裹层本身
  out = out.replace(/\.wbt-root/g, "&");
  return `${fs.readFileSync("src/obsidian/theme.css", "utf8")}\n${keyframes.join("\n")}\nbody .wbt-root {\n${out}\n}\n`;
}

async function buildCss() {
  // esbuild 把 CSS 嵌套展开成普通选择器,兼容较老的手机 WebView
  const res = await esbuild.transform(scopedCss(), { loader: "css", target: ["chrome100", "safari15"], minify: false });
  fs.writeFileSync(path.join(outDir, "styles.css"), "/* Weilanx Base Table */\n" + res.code);
}

function copyManifest() {
  fs.copyFileSync("manifest.json", path.join(outDir, "manifest.json"));
}

const ctx = await esbuild.context({
  entryPoints: ["src/obsidian/main.ts"],
  bundle: true,
  outfile: path.join(outDir, "main.js"),
  format: "cjs",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
  loader: { ".css": "empty" },
});

if (watch) {
  await buildCss();
  copyManifest();
  await ctx.watch();
  fs.watch("webview/src/style.css", () => buildCss().catch(console.error));
  fs.watch("src/obsidian/theme.css", () => buildCss().catch(console.error));
} else {
  await ctx.rebuild();
  await ctx.dispose();
  await buildCss();
  copyManifest();
}
