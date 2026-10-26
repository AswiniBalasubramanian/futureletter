import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
addEventListener("popstate", notify);

/** Client-side navigation: push the path, scroll to the top, re-render. */
export function go(path: string) {
  if (path === location.pathname) return;
  history.pushState(null, "", path);
  scrollTo(0, 0);
  notify();
}

export const usePath = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => location.pathname);
