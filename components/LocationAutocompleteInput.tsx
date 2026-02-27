"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = {
  label: string;
};

export default function LocationAutocompleteInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const query = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setItems([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/location/suggest?q=${encodeURIComponent(query)}`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => ({}))) as {
          results?: Suggestion[];
        };

        const nextItems = Array.isArray(data.results) ? data.results : [];
        setItems(nextItems);
        setOpen(true);
        setActiveIndex(nextItems.length > 0 ? 0 : -1);
      } catch {
        setItems([]);
        setOpen(false);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  function pick(label: string) {
    onChange(label);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % items.length);
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + items.length) % items.length);
            return;
          }

          if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            pick(items[activeIndex].label);
            return;
          }

          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && (loading || items.length > 0) && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-rose-200 bg-white shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-600">Searching addresses...</div>
          )}

          {!loading &&
            items.map((s, idx) => (
              <button
                key={`${s.label}-${idx}`}
                type="button"
                className={[
                  "block w-full px-4 py-3 text-left text-sm transition",
                  idx === activeIndex ? "bg-rose-50 text-gray-900" : "text-gray-800 hover:bg-rose-50",
                ].join(" ")}
                onMouseDown={(e) => {
                  // Prevent input blur before select.
                  e.preventDefault();
                }}
                onClick={() => pick(s.label)}
              >
                {s.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
