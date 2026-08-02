/** Thin-space thousands, one decimal only when it matters. `1 284 md`. */
export const fmt = (n) => {
  const v = Math.abs(n - Math.round(n)) < 0.05 ? Math.round(n) : Number(n.toFixed(1));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
};

/** Trigger a client-side download. The tool has no server to post to. */
export function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
