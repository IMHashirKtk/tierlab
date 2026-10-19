"use client";

import { useEffect, useRef } from "react";

const activeDialogs: HTMLElement[] = [];
let previousOverflow = "";

/** Keep keyboard focus inside the top dialog and restore it on dismissal. */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    if (!activeDialogs.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeDialogs.push(dialog);
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    )).filter((element) => element.getClientRects().length > 0);
    (focusable()[0] || dialog).focus();
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || activeDialogs.at(-1) !== dialog) return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      const index = activeDialogs.indexOf(dialog);
      if (index >= 0) activeDialogs.splice(index, 1);
      if (!activeDialogs.length) document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);
  return ref;
}
