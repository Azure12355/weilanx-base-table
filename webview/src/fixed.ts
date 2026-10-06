// position: fixed 的元素,如果祖先设了 contain / transform / filter,会改为以该祖先为定位参照,
// 而不是视口(Obsidian 的 .workspace-leaf 就是 contain: strict)。
// 用视口坐标(getBoundingClientRect)定位浮层前,先减去参照元素的偏移;VS Code 里没有这种祖先,偏移为 0。
export function fixedOrigin(el: Element | null): { left: number; top: number } {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (
      cs.transform !== "none" ||
      cs.perspective !== "none" ||
      cs.filter !== "none" ||
      /paint|layout|strict|content/.test(cs.contain) ||
      /transform|filter/.test(cs.willChange)
    ) {
      const r = p.getBoundingClientRect();
      return { left: r.left, top: r.top };
    }
  }
  return { left: 0, top: 0 };
}
