import React from 'react';
import { Cpu } from 'lucide-react';

export type DSBadgeAccent = 'indigo' | 'violet' | 'teal' | 'rose';

interface DSBadgeProps {
  label: string;
  accent?: DSBadgeAccent;
}

const ACCENT_MAP: Record<DSBadgeAccent, string> = {
  indigo: 'bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE]',
  violet: 'bg-[#F3E8FF] text-[#6D28D9] border-[#DDD6FE]',
  teal: 'bg-[#CCFBF1]/60 text-[#0F766E] border-[#99F6E4]',
  rose: 'bg-[#FFE4E6]/70 text-[#BE123C] border-[#FECDD3]',
};

export const DSBadge: React.FC<DSBadgeProps> = ({ label, accent = 'indigo' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-mono font-semibold tracking-tight whitespace-nowrap shrink-0 ${ACCENT_MAP[accent]}`}
    >
      <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>DS Used: {label}</span>
    </span>
  );
};
