"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-orange hover:bg-orange/90 text-white rounded-3xl px-6 py-3 text-sm font-semibold uppercase transition-all duration-300 cursor-pointer"
    >
      {label}
    </button>
  );
}
