// Prague neighborhoods — a curated picker that replaces the free-text
// "location" input. Free-text gave us 8/8 users defaulting to "Praha"; a
// picker forces a real choice (or no choice at all) and makes the data useful
// for discovery later on.
//
// Order roughly groups Old Town districts first, then the inner ring (Žižkov,
// Karlín, Vinohrady etc), then the outer ring. The picker is just a styled
// <select> so it works inside any form without extra wiring.

export const PRAGUE_NEIGHBOURHOODS: ReadonlyArray<string> = [
  "Staré Město",
  "Nové Město",
  "Malá Strana",
  "Hradčany",
  "Josefov",
  "Vinohrady",
  "Žižkov",
  "Karlín",
  "Letná",
  "Bubeneč",
  "Holešovice",
  "Smíchov",
  "Vršovice",
  "Nusle",
  "Vyšehrad",
  "Dejvice",
  "Břevnov",
  "Libeň",
  "Praha — other",
] as const;

/** Returns true if `value` is a known Prague neighborhood we offer in the
 *  picker. "Praha" alone (the legacy default) is intentionally NOT in the
 *  list — it counts as "no real choice". */
export function isKnownNeighbourhood(value: string | null | undefined): boolean {
  if (!value) return false;
  return PRAGUE_NEIGHBOURHOODS.includes(value);
}

export function NeighbourhoodPicker({
  value,
  onChange,
  placeholderLabel = "— pick a neighbourhood —",
  style,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholderLabel?: string;
  style?: React.CSSProperties;
}) {
  // A legacy value like "Praha" is shown in the dropdown as a one-off option
  // so the user sees what's currently set and can change it without first
  // wiping the field.
  const showLegacy = !!value && !isKnownNeighbourhood(value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: "transparent",
        border: "0.5px solid var(--gilded)",
        borderRadius: 0,
        fontFamily: "var(--body)",
        fontSize: 15,
        color: value ? "var(--ink)" : "var(--ink-50)",
        outline: "none",
        boxSizing: "border-box",
        appearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%23B79F4E' stroke-width='1'><path d='M1 1.5 L6 6 L11 1.5'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "10px 7px",
        paddingRight: 32,
        ...style,
      }}
    >
      <option value="">{placeholderLabel}</option>
      {showLegacy && (
        <option value={value}>{value} (current)</option>
      )}
      {PRAGUE_NEIGHBOURHOODS.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
