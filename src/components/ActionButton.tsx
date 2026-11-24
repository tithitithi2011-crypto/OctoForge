import React, { useId, useState, useRef, useEffect } from 'react';
import { useButtonFlash } from '../context/ButtonFlashContext';

export type ButtonAccent = 'neutral' | 'indigo' | 'violet' | 'teal' | 'rose';

interface RippleWave {
  key: number;
  x: number;
  y: number;
  diameter: number;
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  accent?: ButtonAccent;
  size?: 'sm' | 'md';
  flashId?: string;
  children: React.ReactNode;
}

const ACCENT_ACTIVE_STYLES: Record<ButtonAccent, string> = {
  neutral: 'bg-[#1E1B18] text-[#FFFDF9] border-[#1E1B18] shadow-xs',
  indigo: 'bg-[#4338CA] text-white border-[#4338CA] shadow-xs',
  violet: 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs',
  teal: 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs',
  rose: 'bg-[#BE123C] text-white border-[#BE123C] shadow-xs',
};

const ACCENT_IDLE_STYLES: Record<ButtonAccent, string> = {
  neutral:
    'bg-[#FFFDF9] text-[#1E1B18] border-[#D6C7B2] hover:bg-[#F4ECE0] hover:border-[#B8A58D]',
  indigo:
    'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] hover:bg-[#E0E7FF] hover:border-[#818CF8]',
  violet:
    'bg-[#F3E8FF] text-[#5B21B6] border-[#DDD6FE] hover:bg-[#E9D5FF] hover:border-[#A78BFA]',
  teal:
    'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4] hover:bg-[#CCFBF1] hover:border-[#2DD4BF]',
  rose:
    'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3] hover:bg-[#FFE4E6] hover:border-[#FB7185]',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  isActive = false,
  accent = 'neutral',
  size = 'md',
  flashId,
  className = '',
  children,
  disabled,
  onClick,
  type = 'button',
  ...rest
}) => {
  const autoId = useId();
  const id = flashId ?? autoId;
  const { flashedButtonId, triggerFlash } = useButtonFlash();
  const isFlashingOrange = flashedButtonId === id;

  const [ripples, setRipples] = useState<RippleWave[]>([]);
  const rippleCounter = useRef(0);
  const cleanupTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs min-h-[34px]'
      : 'px-3.5 py-2 text-xs sm:text-sm min-h-[38px]';

  let stateClasses = '';
  let inlineStyle: React.CSSProperties | undefined;

  if (disabled) {
    stateClasses =
      'bg-[#F4ECE0] text-[#A8A29E] border-[#E5D9C5] cursor-not-allowed opacity-70';
  } else if (isFlashingOrange) {
    stateClasses = 'bg-[#F97316] text-white border-[#F97316]';
    inlineStyle = { boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.28)' };
  } else if (isActive) {
    stateClasses = ACCENT_ACTIVE_STYLES[accent];
  } else {
    stateClasses = ACCENT_IDLE_STYLES[accent];
  }

  const spawnWaterRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height) * 0.78;
    const isKeyboardTrigger = e.clientX === 0 && e.clientY === 0;
    const x = isKeyboardTrigger ? rect.width / 2 : e.clientX - rect.left;
    const y = isKeyboardTrigger ? rect.height / 2 : e.clientY - rect.top;

    rippleCounter.current += 1;
    const rippleKey = rippleCounter.current;
    setRipples((prev) => [...prev, { key: rippleKey, x, y, diameter }]);

    const timerId = window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== rippleKey));
    }, 780);
    cleanupTimersRef.current.push(timerId);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      spawnWaterRipple(e);
      triggerFlash(id);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      style={inlineStyle}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium whitespace-nowrap shrink-0 transition-all duration-200 hover:-translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] cursor-pointer ${sizeClasses} ${stateClasses} ${className}`}
      {...rest}
    >
      {ripples.map((ripple) => (
        <React.Fragment key={ripple.key}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-white/55 animate-water-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.diameter}px`,
              height: `${ripple.diameter}px`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full border-2 border-white/80 animate-water-ripple-ring"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.diameter}px`,
              height: `${ripple.diameter}px`,
            }}
          />
        </React.Fragment>
      ))}
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </button>
  );
};
