"use client";

export function OpenMapButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="inline-link"
      type="button"
      onClick={(event) => window.dispatchEvent(new CustomEvent("lattice:open-map", {
        detail: { trigger: event.currentTarget },
      }))}
    >
      {children}
    </button>
  );
}
