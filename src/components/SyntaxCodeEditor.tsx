import React, { useRef } from 'react';
import {
  tokenizeCodeForHighlight,
  type SyntaxToken,
  type SyntaxTokenType,
} from '../dsa/ProjectStoreCollection';

export { tokenizeCodeForHighlight, type SyntaxToken, type SyntaxTokenType };

const TOKEN_CLASSES: Record<SyntaxTokenType, string> = {
  comment: 'text-[#15803D] italic',
  preprocessor: 'text-[#047857] font-semibold',
  string: 'text-[#B91C1C]',
  number: 'text-[#C2410C] font-medium',
  control: 'text-[#7C3AED] font-semibold',
  keyword: 'text-[#1D4ED8] font-semibold',
  type: 'text-[#0F766E] font-medium',
  function: 'text-[#92400E] font-medium',
  operator: 'text-[#475569]',
  plain: 'text-[#1E1B18]',
};

export const HighlightedCodeBlock: React.FC<{
  code: string;
  maxLines?: number;
  className?: string;
}> = ({ code, maxLines, className = '' }) => {
  const displayCode =
    maxLines !== undefined ? code.split('\n').slice(0, maxLines).join('\n') : code;
  const tokens = tokenizeCodeForHighlight(displayCode);

  return (
    <pre
      className={`rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] px-3 py-2 font-mono text-[11px] overflow-x-auto leading-relaxed ${className}`}
    >
      <code>
        {tokens.map((tok, idx) => (
          <span key={idx} className={TOKEN_CLASSES[tok.type]}>
            {tok.value}
          </span>
        ))}
      </code>
    </pre>
  );
};

interface SyntaxCodeEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

export const SyntaxCodeEditor: React.FC<SyntaxCodeEditorProps> = ({
  id,
  value,
  onChange,
  onPaste,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightPreRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = Math.max(1, value.split('\n').length);
  const tokens = tokenizeCodeForHighlight(value);

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightPreRef.current) {
      highlightPreRef.current.scrollTop = ta.scrollTop;
      highlightPreRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const nextValue = value.slice(0, start) + '    ' + value.slice(end);
      onChange(nextValue);
      window.requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 4;
          textareaRef.current.selectionEnd = start + 4;
        }
      });
    }
  };

  const sharedMetricsStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
    fontSize: '13px',
    lineHeight: '21px',
    letterSpacing: '0px',
    tabSize: 4,
    whiteSpace: 'pre',
  };

  return (
    <div className="relative flex rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden focus-within:border-[#4338CA] focus-within:ring-2 focus-within:ring-[#4338CA]/20">
      {/* Synchronized Line Number Gutter */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden border-r border-[#E5D9C5] bg-[#F4ECE0] px-2.5 py-3.5 text-right text-[#78716C] tabular-nums shrink-0 w-11 h-[310px]"
        style={{
          fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
          fontSize: '12px',
          lineHeight: '21px',
        }}
      >
        {Array.from({ length: lineCount }, (_, idx) => (
          <div key={idx + 1}>{idx + 1}</div>
        ))}
      </div>

      {/* Layered Highlighted Code + Transparent Interactive Textarea */}
      <div className="relative flex-1 min-w-0 h-[310px] bg-[#FFFDF9]">
        <pre
          ref={highlightPreRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden p-3.5"
          style={sharedMetricsStyle}
        >
          {value.length === 0 ? (
            <span className="text-[#78716C]">{placeholder}</span>
          ) : (
            <code>
              {tokens.map((tok, idx) => (
                <span key={idx} className={TOKEN_CLASSES[tok.type]}>
                  {tok.value}
                </span>
              ))}
              {value.endsWith('\n') ? ' ' : ''}
            </code>
          )}
        </pre>

        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Project code snippet editor"
          className="relative z-10 h-full w-full resize-none overflow-auto bg-transparent p-3.5 text-transparent caret-[#1E1B18] selection:bg-[#4338CA]/20 focus:outline-none"
          style={sharedMetricsStyle}
        />
      </div>
    </div>
  );
};
