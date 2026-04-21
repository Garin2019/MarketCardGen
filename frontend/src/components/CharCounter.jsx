const LIMITS = { short: 255, long: 5000 };

export function getLimit(_context, field) {
  return LIMITS[field] ?? LIMITS.short;
}

export function getStatus(length, limit) {
  if (length > limit)        return "error";
  if (length >= limit * 0.9) return "warning";
  return "ok";
}

/**
 * CharCounter
 * Props: text, field ("short"|"long")
 */
export default function CharCounter({ text = "", field = "short" }) {
  const limit  = getLimit("", field);
  const length = text.length;
  const status = getStatus(length, limit);

  const label = { ok: "✅", warning: "⚠️", error: "❌" }[status];
  const color = { ok: "#15803d", warning: "#b45309", error: "#b91c1c" }[status];

  return (
    <span className="char-counter" style={{ color }}>
      {label} {length} / {limit}
    </span>
  );
}
