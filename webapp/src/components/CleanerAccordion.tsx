"use client";

import { useState, type ReactNode } from "react";

// A cleaner's card on the Cleaners page: collapsed to a name row until
// tapped, the same pattern as the Properties page's rows.
export default function CleanerAccordion({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: ReactNode;
  meta: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = `cleaner-body-${id}`;
  return (
    <div className={`property-card property-accordion${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="property-toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="property-toggle-chevron" aria-hidden="true">
          ▸
        </span>
        <span className="property-toggle-name">{title}</span>
        <span className="property-toggle-meta">{meta}</span>
      </button>
      {open ? (
        <div className="property-body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
