// The "Calendar + Checkmark" mark: booked and cleaned. Kept as one inline
// SVG component so the topbar and every other page that shows the
// CleanCal wordmark stay in sync if this ever changes.
export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="10" y="16" width="76" height="70" rx="14" fill="#0A4B48" />
      <rect x="24" y="4" width="8" height="20" rx="4" fill="#E4572E" />
      <rect x="64" y="4" width="8" height="20" rx="4" fill="#E4572E" />
      <rect x="10" y="30" width="76" height="10" fill="#07302D" />
      <path
        d="M28 54 L44 70 L70 40"
        stroke="#F2F8F7"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
