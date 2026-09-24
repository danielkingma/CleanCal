"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
        <div className={`dropdown-panel${align === "left" ? " align-left" : ""}`}>{children}</div>
      ) : null}
    </div>
  );
}
