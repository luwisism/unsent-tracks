"use client";

interface MemberBadgeProps {
  badge?: string | null;
  lightSurface?: boolean;
}

export default function MemberBadge({ badge, lightSurface = false }: MemberBadgeProps) {
  const clean = (badge || "").trim().toUpperCase();
  if (!clean) return null;

  return (
    <span
      title={`SIDE B ${clean}`}
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] leading-none ${
        lightSurface
          ? "border-[#111111] bg-[#E11D2A] text-white"
          : "border-white/75 bg-[#E11D2A] text-white"
      }`}
    >
      <span aria-hidden="true">◉</span>
      <span>{clean}</span>
    </span>
  );
}
