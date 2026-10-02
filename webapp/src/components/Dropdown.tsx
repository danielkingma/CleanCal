"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface DropdownProps {
  label: string;
  triggerClassName: string;
  align?: "left" | "right";
  children: ReactNode;
}

// A lightweight menu button: click to open, click outside or Escape to
// close. Deliberately does NOT close on every inner click -- one of the
// items that ends up inside this (NotificationsToggle) does async work
// after its own click, and unmounting it mid-flight (which closing the
// panel would do, since it's conditionally rendered) would abandon that
// work instead of just letting it finish out of sight. A menu item that
// navigates away (Link, external href) closes it implicitly anyway.
export default function Dropdown({ label, triggerClassName, align = "right", children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // `align` is only ever a starting guess -- which side actually fits
  // depends on where this particular button ends up on this particular
  // screen, which changes with viewport width and with how many sibling
  // buttons come before it (a cleaner's lone "Menu" button, with no
  // "Manage" button ahead of it, sits much further left on a narrow
  // phone than an Owner's does, and the same fixed `right: 0` anchor
  // that stays on-screen for the Owner opens almost entirely off the
  // left edge for the cleaner). Rather than hand-tuning `align` per
  // button per page per breakpoint, measure the panel against the
  // viewport every time it opens and flip it to whichever side actually
  // fits -- runs before paint, so there's no visible jump.
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const margin = 8;
    panel.classList.toggle("align-left", align === "left");
    const rect = panel.getBoundingClientRect();
    // Anchored from the right edge (no align-left) extends further left
    // the wider it is, so overflowing the right edge is only possible
    // when it's anchored from the left instead -- and vice versa. Each
    // branch here switches to the *other* anchor, which moves the panel
    // the opposite direction.
    if (rect.right > window.innerWidth - margin) {
      panel.classList.remove("align-left");
    } else if (rect.left < margin) {
      panel.classList.add("align-left");
    }
  }, [open, align]);

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label} <span className="dropdown-caret">▾</span>
      </button>
      {open ? (
        <div ref={panelRef} className={`dropdown-panel${align === "left" ? " align-left" : ""}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
