import { useEffect, useLayoutEffect, useRef } from "react";

/** 当 open 时,点击 ref 元素之外(mousedown)或按 Esc 则调用 onClose */
export function useAutoClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // 延迟一帧注册,避免打开时的那次点击立刻把自己关掉
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** 弹层渲染后如果超出视口右边(手机窄屏),整体左移到可见区域内 */
export function useKeepInViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    const r = el.getBoundingClientRect();
    const overflow = r.right - (window.innerWidth - 8);
    if (overflow > 0) el.style.transform = `translateX(${-Math.min(overflow, r.left - 8)}px)`;
  });
  return ref;
}
