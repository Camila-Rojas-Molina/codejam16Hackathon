// The drawings for MIGO's icon set (rendered by Icon.tsx). Original retro line art on a 24×24 grid:
// ink outline (the <svg> sets stroke), plus a flat accent fill via --icon-accent.
import type { ReactNode } from 'react'

const A = { fill: 'var(--icon-accent)' } // accent fill
const P = { fill: 'var(--color-sheet)' } // paper fill
const K = { fill: 'currentColor', stroke: 'none' } // solid ink

export const ICONS = {
  // ---- Interface ----------------------------------------------------------------------------
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-up-right': <path d="M7 17 17 7M9 7h8v8" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  undo: <path d="M8.5 8H4V3.5M4.4 8A8 8 0 1 1 4 13" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  grip: (
    <>
      {[8, 12, 16].map((y) => (
        <g key={y}>
          <circle cx="9" cy={y} r="1.3" {...K} />
          <circle cx="15" cy={y} r="1.3" {...K} />
        </g>
      ))}
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" {...A} />
      <path d="m20 20-5-5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="1.1" {...K} />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.8 21 19.5H3z" {...A} />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="1.1" {...K} />
    </>
  ),
  lock: (
    <>
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <rect x="5.5" y="10.5" width="13" height="9.5" {...A} />
      <circle cx="12" cy="15" r="1.4" {...K} />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" {...P} />
      <circle cx="12" cy="12" r="3.2" {...A} />
      <circle cx="12" cy="12" r="1.2" {...K} />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="m6.5 7 1 13h9l1-13z" {...A} />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  pencil: (
    <>
      <path d="m15.5 4.5 4 4L9 19H5v-4z" {...A} />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  cog: (
    <>
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" strokeWidth="2.6" />
      <circle cx="12" cy="12" r="6" {...A} />
      <circle cx="12" cy="12" r="2.4" {...P} />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" {...A} />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" {...P} />
      <rect x="4" y="5.5" width="16" height="4.5" {...A} />
      <path d="M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="9" cy="14" r="1" {...K} />
      <circle cx="12" cy="14" r="1" {...K} />
      <circle cx="15" cy="14" r="1" {...K} />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5h3L8.5 6h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" {...A} />
      <circle cx="12" cy="13.5" r="3.5" {...P} />
      <circle cx="17.8" cy="11" r=".9" {...K} />
    </>
  ),
  sparkle: <path d="M12 3c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" {...A} />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" {...A} />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" {...A} />,
  'heart-outline': <path d="M12 20s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  flame: (
    <>
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.2 3.4-8.4 1.9 1.2 2.5 3.1 2.4 4.6 1.3-.9 2-2.6 2-4.6 3 2 5.2 5 5.2 8.4 0 3.5-2.6 6.1-6.5 6.1z" {...A} />
      <path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.4-2.4 2.7-4 1.3 1.6 2.7 2.4 2.7 4 0 1.5-1.1 2.6-2.7 2.6z" {...P} />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 6H5a2.5 2.5 0 0 0 2.6 3.6M16.5 6H19a2.5 2.5 0 0 1-2.6 3.6M12 13.2v3.3M8.5 20h7" />
      <path d="M7.5 4.5h9v4.2a4.5 4.5 0 0 1-9 0z" {...A} />
      <path d="M9.5 16.5h5V20h-5z" {...P} />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <circle cx="12" cy="12" r="5.8" strokeDasharray="1.6 2" strokeWidth="1.4" />
      <path d="m12 8.6 1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z" {...K} />
    </>
  ),
  shop: (
    <>
      <path d="M5.5 11.5V20h13v-8.5" {...P} />
      <path d="M4 9.5 5.5 4.5h13L20 9.5a2.67 2.67 0 0 1-5.33 0 2.67 2.67 0 0 1-5.34 0A2.67 2.67 0 0 1 4 9.5z" {...A} />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  map: (
    <>
      <path d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" {...A} />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  // Migo the walking globe (the MAP tab): the mascot's globe with its land, big cartoon eyes, grin and
  // chunky shoes, drawn in the icon set's line style. The globe is always light sea and teal land,
  // like the mascot's blue-and-green globe; the shoes take the accent (saffron, like Migo's shoes).
  migo: (
    <>
      <path d="M10.1 16.4 9.5 18.6M13.9 16.4l.6 2.2" strokeWidth="1.6" />
      <circle cx="12" cy="9.3" r="7.3" fill="var(--color-teal-soft)" />
      <path d="M4.9 7.7c1.4-.4 2.4.4 2.3 1.6 0 .9.7 1.5.3 2.6-.3.8-1 1.1-1.7.9" fill="var(--color-teal)" strokeWidth="1" />
      <path d="M15.5 2.7c-.5 1 .2 1.9 1.2 1.9.8 0 1.2.8 2 .7" fill="var(--color-teal)" strokeWidth="1" />
      <path d="M18.8 12.4c-.9-.2-1.8.4-1.9 1.3-.1.6-.6 1-1.3 1.1" fill="var(--color-teal)" strokeWidth="1" />
      <circle cx="12" cy="9.3" r="7.3" />
      <ellipse cx="10.15" cy="8.2" rx="1.9" ry="2.7" strokeWidth="1.1" {...P} />
      <ellipse cx="13.85" cy="8.2" rx="1.9" ry="2.7" strokeWidth="1.1" {...P} />
      <ellipse cx="10.7" cy="8.75" rx=".85" ry="1.45" {...K} />
      <ellipse cx="14.4" cy="8.75" rx=".85" ry="1.45" {...K} />
      <path d="M9.3 12.5c1.6 1.5 3.8 1.5 5.4 0" strokeWidth="1.3" />
      <path d="M4.6 21.2c0-1.6 1.3-2.6 3-2.6h2.2c.7 0 1.1.4 1.1 1.1v1.5z" strokeWidth="1.4" {...A} />
      <path d="M19.4 21.2c0-1.6-1.3-2.6-3-2.6h-2.2c-.7 0-1.1.4-1.1 1.1v1.5z" strokeWidth="1.4" {...A} />
    </>
  ),
  quest: (
    <>
      <path d="M5 4.5h12.5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" {...A} />
      <path d="M8 15.5c1.8-3.4 4-1 5.5-4.5" strokeDasharray="1.4 2.4" />
      <path d="m13 6.8 2.6 2.6M15.6 6.8 13 9.4" stroke="var(--color-sienna-deep)" strokeWidth="2.2" />
    </>
  ),
  chat: (
    <>
      <path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8a1.5 1.5 0 0 1-1.5 1.5h-7L7.5 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" {...A} />
      <circle cx="8.5" cy="11" r="1" {...K} />
      <circle cx="12" cy="11" r="1" {...K} />
      <circle cx="15.5" cy="11" r="1" {...K} />
    </>
  ),
  chats: (
    <>
      <path d="M9 4.5h11A1.5 1.5 0 0 1 21.5 6v6a1.5 1.5 0 0 1-1.5 1.5h-1.5V16l-3-2.5H9A1.5 1.5 0 0 1 7.5 12V6A1.5 1.5 0 0 1 9 4.5z" {...P} />
      <path d="M4 9.5h9.5A1.5 1.5 0 0 1 15 11v5.5a1.5 1.5 0 0 1-1.5 1.5h-5l-3.5 2.5V18H4a1.5 1.5 0 0 1-1.5-1.5V11A1.5 1.5 0 0 1 4 9.5z" {...A} />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.7" {...A} />
      <path d="M4.5 20.5c.6-4 3.6-6.3 7.5-6.3s6.9 2.3 7.5 6.3" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <circle cx="9" cy="10.3" r="1.1" {...K} />
      <circle cx="15" cy="10.3" r="1.1" {...K} />
      <path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0" />
    </>
  ),
  grin: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="M8 10.5q1-1.6 2 0M14 10.5q1-1.6 2 0" />
      <path d="M7.8 13.3h8.4a4.2 4.2 0 0 1-8.4 0z" {...P} />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5.5" width="18" height="13" {...A} />
      <circle cx="8.5" cy="11" r="2.2" {...P} />
      <path d="M13 10h5M13 13.2h5M5.8 15.8h5.4" />
    </>
  ),
  stamp: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" strokeDasharray="1.6 1.6" />
      <rect x="7" y="6" width="10" height="12" {...A} />
      <path d="M12 15.5s-2.6-2.4-2.6-4.4a2.6 2.6 0 0 1 5.2 0c0 2-2.6 4.4-2.6 4.4z" {...P} />
    </>
  ),
  thumbs: (
    <>
      <path d="M4 11h3.5v9H4z" {...P} />
      <path d="m7.5 11 3.5-6.5c1.5 0 2.5 1 2.2 2.6L12.6 10h5.2a2 2 0 0 1 2 2.4l-1.3 6a2 2 0 0 1-2 1.6h-9z" {...A} />
    </>
  ),
  'hand-stop': (
    <path
      d="M8 12.5V6.3a1.3 1.3 0 0 1 2.6 0v4.2V4.8a1.3 1.3 0 0 1 2.6 0v5.7V5.8a1.3 1.3 0 0 1 2.6 0v5.2-2.3a1.3 1.3 0 0 1 2.6 0v6.4a6.4 6.4 0 0 1-6.4 6.4h-.5a5 5 0 0 1-4.1-2.1l-2.5-3.7a1.3 1.3 0 0 1 2-1.6L8 15.5z"
      {...A}
    />
  ),
  tilde: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="M7.5 12.8c1.5-2 3-2 4.5 0s3 2 4.5 0" />
    </>
  ),
  no: (
    <>
      <circle cx="12" cy="12" r="8.5" {...P} />
      <path d="M6 6l12 12" stroke="var(--color-sienna-deep)" strokeWidth="2.2" />
    </>
  ),
  shuffle: <path d="M3.5 7h3.5c4.5 0 5.5 10 10 10h3M3.5 17h3.5c4.5 0 5.5-10 10-10h3M17.8 4.5l2.5 2.5-2.5 2.5M17.8 14.5l2.5 2.5-2.5 2.5" />,

  // ---- Places & travel ------------------------------------------------------------------------
  pin: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" {...A} />
      <circle cx="12" cy="9.8" r="2.4" {...P} />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
      <path d="M3.5 12h17M5 7.5h14M5 16.5h14" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="m15 9-1.7 4.3L9 15l1.7-4.3z" {...P} />
      <circle cx="12" cy="12" r=".9" {...K} />
    </>
  ),
  suitcase: (
    <>
      <path d="M9 8V5.5h6V8" />
      <rect x="3.5" y="8" width="17" height="11.5" {...A} />
      <path d="M8 8v11.5M16 8v11.5" />
    </>
  ),
  house: (
    <>
      <path d="M6 9.5V20h12V9.5" {...A} />
      <path d="m3.5 11 8.5-7 8.5 7M10 20v-5h4v5" />
    </>
  ),
  plane: (
    <>
      <path d="M20.5 3.5 3.5 10.5l7 3 3 7z" {...A} />
      <path d="m10.5 13.5 10-10" />
    </>
  ),
  backpack: (
    <>
      <path d="M10 4.5h4M9.5 4.5v2M14.5 4.5v2" />
      <path d="M6 10a6 6 0 0 1 12 0v10.5H6z" {...A} />
      <rect x="9" y="13.5" width="6" height="4" {...P} />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V3.5" />
      <path d="M5.5 4.5h12L15 8.5l2.5 4h-12" {...A} />
    </>
  ),
  tower: (
    <>
      <path d="M12 3v2" />
      <path d="M10.5 5h3L17 20.5h-2.5L12 12l-2.5 8.5H7z" {...A} />
      <path d="M9.2 11h5.6M8.2 15.5h7.6" />
    </>
  ),
  castle: (
    <>
      <path d="M4.5 20V9h3v2h2.5V9h4v2h2.5V9h3v11z" {...A} />
      <path d="M10 20v-3.5a2 2 0 0 1 4 0V20M12 9V4.5l2.5 1-2.5 1" />
    </>
  ),
  columns: (
    <>
      <path d="M3.5 8.5 12 4l8.5 4.5z" {...A} />
      <path d="M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M3.5 20h17M4.5 18h15" />
    </>
  ),
  buildings: (
    <>
      <path d="M4 20V10h6v10" {...P} />
      <path d="M10 20V4.5h7.5V20" {...A} />
      <path d="M3 20h18M12.5 8h2.5M12.5 11.5h2.5M12.5 15h2.5M6 13h2M6 16h2" />
    </>
  ),
  frame: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" {...P} />
      <rect x="6.5" y="7.5" width="11" height="9" {...A} />
      <path d="m6.5 16.5 3.5-4 2.5 2.5 2-2 3 3.5" />
    </>
  ),
  // Two snapshots, one tilted behind the other: the GALLERY tab.
  gallery: (
    <>
      <path d="m8.6 3.2 11.8 2.1-2.2 12.4-11.8-2.1z" {...P} />
      <path d="M3.5 7.5H16v13H3.5z" {...P} />
      <path d="M3.5 7.5H16v9H3.5z" stroke="none" {...A} />
      <path d="M3.5 7.5H16v13H3.5zM3.5 16.5H16" />
      <path d="m3.5 16.5 4-4.2 2.6 2.6 1.5-1.4 3 3" />
      <circle cx="12.4" cy="10.6" r="1.2" {...K} />
    </>
  ),
  mask: (
    <>
      <path d="M5 5h14v6a7 7 0 0 1-14 0z" {...A} />
      <path d="M8 9.5q1.2-1.3 2.4 0M13.6 9.5q1.2-1.3 2.4 0M9 13.5c1.7 1.8 4.3 1.8 6 0" />
    </>
  ),
  gem: (
    <>
      <path d="M7 4.5h10l3.5 5L12 20 3.5 9.5z" {...A} />
      <path d="M3.5 9.5h17M9.5 4.5 8 9.5l4 10.5 4-10.5-1.5-5" />
    </>
  ),
  mountain: (
    <>
      <path d="m2.5 19.5 7-11 4 6 2.5-3.5 5.5 8.5z" {...A} />
      <path d="m7.4 11.8 2.1-3.3 2.1 3.2-1.3-.6-.8.7-.8-.7z" {...P} />
    </>
  ),
  tree: (
    <>
      <path d="M12 21v-6.5M9.5 21h5" />
      <circle cx="12" cy="9.5" r="6" {...A} />
      <path d="M12 14.5 9.5 12M12 12.5l2.5-2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 13 19 5 19z" {...A} />
      <path d="M5 19 14 10" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20.5v-8M7 20.5h10" />
      <path d="M12 13c-4 0-6.5-2.5-6.5-6.5 4 0 6.5 2.5 6.5 6.5zM12 11.5c0-3.5 2.2-5.5 6-5.5 0 3.5-2.2 5.5-6 5.5z" {...A} />
    </>
  ),
  wave: <path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.3" {...A} />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" />
    </>
  ),
  moon: <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" {...A} />,
  'half-moon': (
    <>
      <circle cx="12" cy="12" r="8.5" {...P} />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" {...A} />
    </>
  ),
  cloud: <path d="M7 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1.3 4.5 4.5 0 0 1 .4 9.3z" {...A} />,
  'sun-cloud': (
    <>
      <circle cx="15.5" cy="8" r="3.4" {...A} />
      <path d="M15.5 2.6v1.2M20.9 8h-1.2M19.3 4.2l-.9.9" />
      <path d="M6.5 19.5a3.5 3.5 0 0 1-.4-7 4.8 4.8 0 0 1 9.2-1.1 3.9 3.9 0 0 1 .3 8.1z" {...P} />
    </>
  ),
  sunset: (
    <>
      <path d="M7 16.5a5 5 0 0 1 10 0z" {...A} />
      <path d="M3.5 16.5h17M6.5 20h11M12 5.5v2.5M5.8 8.8l1.6 1.6M18.2 8.8l-1.6 1.6" />
    </>
  ),
  'half-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" {...P} />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" {...A} />
    </>
  ),
  'full-circle': <circle cx="12" cy="12" r="8.5" {...A} />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  stopwatch: (
    <>
      <path d="M10 3.5h4M12 3.5v3M17.6 6.9l1.4-1.4" />
      <circle cx="12" cy="13.5" r="7" {...A} />
      <path d="M12 13.5V10" />
    </>
  ),

  // ---- Getting around -------------------------------------------------------------------------
  shoe: (
    <>
      <path d="M3.5 17.5V8.5l4 1.2 2.8-2.7 3.6 4.5 5.4 1.8a2.2 2.2 0 0 1 1.6 2.1v2.1z" {...A} />
      <path d="M3.5 17.5h17.4v1.8H3.5zM10.5 11l1.6-1.4M12 13l1.6-1.4" />
    </>
  ),
  train: (
    <>
      <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v10h-15V6A1.5 1.5 0 0 1 6 4.5z" {...A} />
      <rect x="7" y="7.5" width="10" height="4" {...P} />
      <path d="m8 16-2 4.5M16 16l2 4.5M7 18.5h10" />
      <circle cx="8" cy="13.8" r=".9" {...K} />
      <circle cx="16" cy="13.8" r=".9" {...K} />
    </>
  ),
  bus: (
    <>
      <rect x="4.5" y="4" width="15" height="14" {...A} />
      <rect x="6.5" y="6.5" width="11" height="5" {...P} />
      <path d="M7.5 18v2.5M16.5 18v2.5M4.5 14.5h15" />
    </>
  ),
  bike: (
    <>
      <circle cx="6.5" cy="15.5" r="3.8" {...P} />
      <circle cx="17.5" cy="15.5" r="3.8" {...P} />
      <path d="m6.5 15.5 4-7h5.5l1.5 7M10.5 8.5l3.5 7H6.5M15 5.5h2.5M9 6.5h3" />
    </>
  ),
  car: (
    <>
      <path d="M3.5 15.5v-3.2l2-4.8h13l2 4.8v3.2z" {...A} />
      <path d="m7 11.5 1-2.5h8l1 2.5z" {...P} />
      <circle cx="7.5" cy="16.5" r="2" {...P} />
      <circle cx="16.5" cy="16.5" r="2" {...P} />
    </>
  ),

  // ---- Accessibility --------------------------------------------------------------------------
  ramp: (
    <>
      <path d="M3.5 19.5h17V8.5z" {...A} />
      <path d="M3.5 19.5h17" />
    </>
  ),
  wheelchair: (
    <>
      <circle cx="10" cy="4.5" r="1.8" {...K} />
      <path d="M10 7.5v6h5.5l2.5 5.5M10 10h4" />
      <path d="M7.2 11.8A4.6 4.6 0 1 0 14 17.6" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" {...A} />
      <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
    </>
  ),
  bench: (
    <>
      <rect x="4.5" y="6.5" width="15" height="3.2" {...A} />
      <path d="M3.5 12.5h17M5.5 9.7v8.8M18.5 9.7v8.8M5.5 15.5h13" />
    </>
  ),

  // ---- Interests, food & things to do ---------------------------------------------------------
  bowl: (
    <>
      <path d="m13 3.5-3 7M17.5 4.5 13 10.5" />
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z" {...A} />
    </>
  ),
  cup: (
    <>
      <path d="M9 3.5c-1 1.5 1 2 0 3.5M12.5 3.5c-1 1.5 1 2 0 3.5M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M4 21h14" />
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" {...A} />
    </>
  ),
  wine: (
    <>
      <path d="M7.5 3.5h9c0 4.5-1.5 8-4.5 8s-4.5-3.5-4.5-8z" {...A} />
      <path d="M12 11.5V19.5M8.5 20.5h7" />
    </>
  ),
  cart: (
    <>
      <path d="M4 8v7.5h12V8" {...P} />
      <path d="M2.5 8h15L16 4.5H4z" {...A} />
      <path d="M16 10.5h4.5" />
      <circle cx="7" cy="18.5" r="1.8" {...A} />
      <circle cx="13" cy="18.5" r="1.8" {...A} />
    </>
  ),
  basket: (
    <>
      <path d="m7 10.5 3-6M17 10.5l-3-6" />
      <path d="M3.5 10.5h17l-2 9.5h-13z" {...A} />
      <path d="M8 13v4.5M12 13v4.5M16 13v4.5" />
    </>
  ),
  carrot: (
    <>
      <path d="m15.5 8.5 2-4M15.5 8.5l4-1.5M15.5 8.5l3.5 1.8" />
      <path d="M15.5 8.5c-1.5-1.5-4-1-5 .5L4.5 19.5l10.5-6c1.5-1 2-3.5.5-5z" {...A} />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21V6" />
      {[8, 12, 16].map((y) => (
        <g key={y}>
          <path d={`M12 ${y}c-2.6 0-3.6-2-3.6-4 2.6 0 3.6 2 3.6 4zM12 ${y}c2.6 0 3.6-2 3.6-4-2.6 0-3.6 2-3.6 4z`} {...A} />
        </g>
      ))}
    </>
  ),
  milk: (
    <>
      <path d="M9.5 3.5h5v3l2 3v11h-9v-11l2-3z" {...P} />
      <path d="M7.5 12h9v5h-9z" {...A} />
    </>
  ),
  nut: (
    <>
      <path d="M12 6V3.8" />
      <path d="M7 10c0 5 2.5 9 5 10.5 2.5-1.5 5-5.5 5-10.5" {...P} />
      <path d="M5.5 10a6.5 4 0 0 1 13 0z" {...A} />
    </>
  ),
  seal: (
    <>
      <path d="m9 15-1.5 6 3-1.5 1.5 2 .5-5.5M15 15l1.5 6-3-1.5" />
      <circle cx="12" cy="10" r="6" {...A} />
      <path d="m9.5 10 1.7 1.7 3.3-3.4" />
    </>
  ),
  note: (
    <>
      <path d="M9.5 17.5V5.5l9-2v12" />
      <circle cx="7.3" cy="17.5" r="2.2" {...A} />
      <circle cx="16.3" cy="15.5" r="2.2" {...A} />
    </>
  ),
  headphones: (
    <>
      <path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" />
      <rect x="3.5" y="14" width="4" height="6" {...A} />
      <rect x="16.5" y="14" width="4" height="6" {...A} />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" {...A} />
      <path d="M3.5 12h17M12 3.5c-3.2 3-3.2 14 0 17M12 3.5c3.2 3 3.2 14 0 17" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.5 0 2-1 1.4-2.2-.6-1.2.3-2.3 1.6-2.3h2a3.5 3.5 0 0 0 3.5-3.5C20.5 7.6 16.7 3.5 12 3.5z" {...A} />
      <circle cx="7.8" cy="11" r="1.3" {...K} />
      <circle cx="10.5" cy="7.5" r="1.3" {...K} />
      <circle cx="15" cy="8" r="1.3" {...K} />
    </>
  ),
  bulb: (
    <>
      <path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z" {...A} />
      <path d="M9.5 20.5h5" />
    </>
  ),
  bag: (
    <>
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      <path d="M5.5 8h13l-1 12.5h-11z" {...A} />
    </>
  ),
  lantern: (
    <>
      <path d="M10 3.5h4M12 3.5v3.5M10.5 17v2.5h3V17" />
      <path d="M8 7h8c1.5 2 1.5 8 0 10H8C6.5 15 6.5 9 8 7z" {...A} />
      <path d="M12 7v10M9.7 7c-.8 2-.8 8 0 10M14.3 7c.8 2 .8 8 0 10" />
    </>
  ),
  book: (
    <>
      <path d="M3.5 6c3-1 6-1 8.5 1v12.5c-2.5-2-5.5-2-8.5-1z" {...A} />
      <path d="M20.5 6c-3-1-6-1-8.5 1v12.5c2.5-2 5.5-2 8.5-1z" {...P} />
    </>
  ),
  film: (
    <>
      <path d="M4 9.5h16v10H4z" {...A} />
      <path d="m4 9.5-.5-4 16-2 .5 4zM8 7l1.5 2M13 6.4l1.5 2.2" />
    </>
  ),
  chip: (
    <>
      <path d="M9.5 4v3M14.5 4v3M9.5 17v3M14.5 17v3M4 9.5h3M4 14.5h3M17 9.5h3M17 14.5h3" />
      <rect x="7" y="7" width="10" height="10" {...A} />
      <rect x="10" y="10" width="4" height="4" {...P} />
    </>
  ),
  scroll: (
    <>
      <path d="M7 5h11v12.5a2 2 0 0 1-2 2H6" {...P} />
      <path d="M7 5a2 2 0 0 0-4 0v1.5h4M6 19.5a2 2 0 0 0 2-2v-1.5H4v1.5a2 2 0 0 0 2 2z" {...A} />
      <path d="M10 9h5M10 12h5" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 8.5h10a4 4 0 0 1 4 4.4l-.4 3.6a2.3 2.3 0 0 1-4 1.2L15 16H9l-1.6 1.7a2.3 2.3 0 0 1-4-1.2L3 12.9A4 4 0 0 1 7 8.5z" {...A} />
      <path d="M7.5 11v3M6 12.5h3" />
      <circle cx="15.5" cy="11.5" r="1" {...K} />
      <circle cx="17.2" cy="13.5" r="1" {...K} />
    </>
  ),
  briefcase: (
    <>
      <path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2" />
      <rect x="3.5" y="8" width="17" height="11.5" {...A} />
      <path d="M3.5 13h17" />
    </>
  ),

  // ---- Money ------------------------------------------------------------------------------------
  tag: (
    <>
      <path d="M3.5 12.5V4.5h8l9 9-8 8z" {...A} />
      <circle cx="8" cy="9" r="1.5" {...P} />
    </>
  ),
  coins: (
    <>
      <circle cx="9.5" cy="12" r="5.5" {...P} />
      <circle cx="15" cy="13" r="5.5" {...A} />
      <path d="M15 10.5v5" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="6.5" width="18" height="11" {...A} />
      <circle cx="12" cy="12" r="2.6" {...P} />
      <path d="M6 9.5v.1M18 14.5v.1" strokeWidth="2.4" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12.5" {...A} />
      <path d="M3 10h18" strokeWidth="2.6" />
      <path d="M6 15h4" />
    </>
  ),

  // ---- People & feelings -------------------------------------------------------------------------
  people2: (
    <>
      <circle cx="8.5" cy="8.5" r="2.8" {...A} />
      <circle cx="15.5" cy="8.5" r="2.8" {...P} />
      <path d="M3.5 19c.4-3 2.4-5 5-5s4.6 2 5 5M12.6 14.4c.8-.3 1.8-.4 2.9-.4 2.6 0 4.6 2 5 5" />
    </>
  ),
  people3: (
    <>
      <circle cx="12" cy="7.5" r="2.6" {...A} />
      <circle cx="6" cy="10" r="2.2" {...P} />
      <circle cx="18" cy="10" r="2.2" {...P} />
      <path d="M7.5 19.5c.4-3 2.2-5 4.5-5s4.1 2 4.5 5M2.5 18c.3-2.2 1.6-3.6 3.5-3.6M21.5 18c-.3-2.2-1.6-3.6-3.5-3.6" />
    </>
  ),
  party: (
    <>
      <path d="m4 20 4-11 7 7z" {...A} />
      <path d="M14 4.5v2M17.5 6 16 7.5M19.5 10h-2M10.5 11.5l2 2" />
      <circle cx="19" cy="4" r="1" {...K} />
      <circle cx="21" cy="14" r="1" {...K} />
    </>
  ),
  venn: (
    <>
      <circle cx="9.3" cy="12" r="5.6" {...A} />
      <circle cx="14.7" cy="12" r="5.6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3.5 7 2.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6z" {...A} />
      <path d="m9 12 2.2 2.2 4-4.2" />
    </>
  ),
  ear: (
    <>
      <path d="M7.5 9a4.5 4.5 0 0 1 9 0c0 3-2.6 3.8-3 6.5-.4 2.6-2 4-4 3.6" {...A} />
      <path d="M10 9.5a2 2 0 0 1 4 0c0 1.2-1 1.6-1.5 2.6" />
    </>
  ),
  dice: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" {...A} />
      <circle cx="9" cy="9" r="1.2" {...K} />
      <circle cx="15" cy="15" r="1.2" {...K} />
      <circle cx="12" cy="12" r="1.2" {...K} />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="16" {...A} />
      <path d="M9 3.5h6v3H9z" {...P} />
      <path d="m8.5 11 1.3 1.3 2.2-2.3M8.5 16l1.3 1.3 2.2-2.3M13.5 11.5h2.5M13.5 16.5h2.5" />
    </>
  ),
  kite: (
    <>
      <path d="m12 3 5.5 6.5L12 16l-5.5-6.5z" {...A} />
      <path d="M12 3v13M6.5 9.5h11M12 16c-1 2 1 2.5 0 4.5" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v15.5M8 20h8M4.5 7.5h15" />
      <path d="M2.5 12.5h4a2 2 0 0 1-4 0zM17.5 12.5h4a2 2 0 0 1-4 0z" {...A} />
      <path d="m4.5 7.5-2 5M4.5 7.5l2 5M19.5 7.5l-2 5M19.5 7.5l2 5" />
    </>
  ),
  bolt: <path d="M13.5 3 5.5 13.5H12L10.5 21l8-10.5H12z" {...A} />,

  // ---- Dogs -------------------------------------------------------------------------------------
  dog: (
    <>
      <ellipse cx="6.6" cy="10" rx="1.9" ry="3.8" transform="rotate(18 6.6 10)" {...K} />
      <ellipse cx="17.4" cy="10" rx="1.9" ry="3.8" transform="rotate(-18 17.4 10)" {...K} />
      <circle cx="12" cy="12.5" r="6" {...A} />
      <circle cx="9.8" cy="11.5" r="1" {...K} />
      <circle cx="14.2" cy="11.5" r="1" {...K} />
      <ellipse cx="12" cy="14.6" rx="1.5" ry="1.1" {...K} />
    </>
  ),
  paw: (
    <>
      <ellipse cx="12" cy="15.5" rx="4.2" ry="3.6" {...A} />
      <circle cx="6.5" cy="10.5" r="1.8" {...A} />
      <circle cx="9.6" cy="6.8" r="1.8" {...A} />
      <circle cx="14.4" cy="6.8" r="1.8" {...A} />
      <circle cx="17.5" cy="10.5" r="1.8" {...A} />
    </>
  ),
  bone: (
    <g transform="rotate(-30 12 12)">
      <rect x="6.5" y="10.5" width="11" height="3" {...A} />
      <circle cx="6" cy="10.3" r="2.1" {...A} />
      <circle cx="6" cy="13.7" r="2.1" {...A} />
      <circle cx="18" cy="10.3" r="2.1" {...A} />
      <circle cx="18" cy="13.7" r="2.1" {...A} />
      <path d="M6.5 10.5h11v3h-11z" stroke="none" {...A} />
    </g>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

/** Every icon name, e.g. for the style guide. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[]
