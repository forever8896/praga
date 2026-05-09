"use client";

// Beat 2 — the parchment IS the input. The user types directly into the
// 'BY THE HAND OF' field; status sits in mono-caps beneath. No duplicate
// input above, no separate "preview" of typed text — the parchment is the
// only place a name is entered.
import { useRef } from "react";
import { CropsSeal, FleurDeLis } from "./ornaments";

export function LivePreviewParchment({
  name,
  filled,
  onChange,
  placeholder = "yourname",
}: {
  name: string;
  filled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tilt = filled ? -0.6 : -1.5;

  return (
    <div
      style={{
        width: 300,
        maxWidth: "100%",
        margin: "0 auto",
        transform: `rotate(${tilt}deg)`,
        transition: "transform 280ms ease",
      }}
    >
      <div
        className="cartouche-parchment"
        style={{
          padding: 22,
          position: "relative",
          boxShadow: "0 8px 18px rgba(31,26,18,0.08)",
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <div style={{ position: "absolute", top: 8, right: 8, lineHeight: 0 }}>
          <CropsSeal size={18} color="var(--gilded)" />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <FleurDeLis size={16} stroke="var(--gilded)" />
        </div>
        <div
          className="kicker"
          style={{ textAlign: "center", marginBottom: 10, opacity: filled ? 1 : 0.5 }}
        >
          BY THE HAND OF
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={20}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="display"
          style={{
            fontSize: 26,
            textAlign: "center",
            color: filled ? "var(--ink)" : name ? "var(--ink-70)" : "var(--ink-50)",
            marginBottom: 6,
            minHeight: 32,
            width: "100%",
            padding: 0,
            border: "none",
            borderBottom: "0.5px dashed var(--gilded)",
            background: "transparent",
            outline: "none",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        />
        <div
          className="mono"
          style={{
            fontSize: 11,
            textAlign: "center",
            color: "var(--ink-50)",
            marginTop: 8,
            marginBottom: 14,
            wordBreak: "break-all",
          }}
        >
          {(name || "your-name") + ".pragueconnect.eth"}
        </div>
        <hr className="hr-gilded" />
        <div
          className="kicker-soft"
          style={{ textAlign: "center", marginTop: 10, fontSize: 8 }}
        >
          {filled ? "AVAILABLE TO SEAL" : "AWAITING NAME"}
        </div>
      </div>
    </div>
  );
}
