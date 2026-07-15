"use client";

export function OpenMapButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="inline-link"
      type="button"
      onClick={() => window.dispatchEvent(new Event("lattice:open-map"))}
    >
      {children}
    </button>
  );
}
