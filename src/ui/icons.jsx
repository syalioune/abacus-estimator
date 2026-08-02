/* Action icons. Square caps, no curves beyond the arc a glyph needs —
   matches the zero-radius, no-decoration line of the rest of the system.
   Always paired with a word; these never carry meaning alone. */

const base = { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true };

export const IconPlus = (props) => (
  <svg {...base} {...props}>
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconCopy = (props) => (
  <svg {...base} {...props}>
    <rect x="5.5" y="5.5" width="8" height="8" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.5 10.5v-8h8" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const IconTrash = (props) => (
  <svg {...base} {...props}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
    <path d="M6.7 7v4M9.3 7v4" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconComment = (props) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="3.5" width="11" height="7" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 10.5v2.5l3-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
  </svg>
);

export const IconX = (props) => (
  <svg {...base} {...props}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
