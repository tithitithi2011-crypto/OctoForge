import React from 'react';
import { AlertTriangle, ArrowDown, Flame } from 'lucide-react';
import { PriorityLevel } from '../dsa/types';

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  if (priority === PriorityLevel.HIGH) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3] whitespace-nowrap shrink-0">
        <Flame className="w-3 h-3 text-[#BE123C]" aria-hidden="true" />
        <span>High</span>
      </span>
    );
  }

  if (priority === PriorityLevel.MEDIUM) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3 h-3 text-[#4338CA]" aria-hidden="true" />
        <span>Medium</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-[#CCFBF1]/70 text-[#0F766E] border border-[#99F6E4] whitespace-nowrap shrink-0">
      <ArrowDown className="w-3 h-3 text-[#0F766E]" aria-hidden="true" />
      <span>Low</span>
    </span>
  );
};
