import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Replace,
  ArrowLeftRight,
  Save,
  Sparkles,
  RotateCcw,
  Pencil,
  Check,
  X,
  RotateCw,
  Eye,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ActionButton } from './ActionButton';
import { DSBadge } from './DSBadge';
import { DLLNodeSnapshot } from '../dsa/DoublyLinkedList';
import { TrieSuggestion } from '../dsa/Trie';
import { HashLookupResult, WordFrequencyEntry } from '../dsa/HashTable';

interface TextEditorPanelProps {
  noteTitle: string;
  lines: DLLNodeSnapshot[];
  selectedLineNumber: number;
  undoCount: number;
  redoCount: number;
  trashCount: number;
  importWaveKey: number;
  deletingLineId: string | null;
  restoredLineNumber: number | null;
  searchResult: HashLookupResult | null;
  topWords: WordFrequencyEntry[];
  getTrieSuggestions: (prefix: string) => TrieSuggestion[];
  onUpdateNoteTitle: (newTitle: string) => void;
  onSelectLine: (lineNumber: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onWithdrawDelete: () => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  onMoveLineUp: (lineNumber: number) => void;
  onMoveLineDown: (lineNumber: number) => void;
  onInsertLine: (text: string, position: 'end' | 'above') => void;
  onUpdateLine: (lineNumber: number, newText: string) => void;
  onDeleteLine: (lineNumber: number, nodeId: string) => void;
  onSearchWord: (word: string) => void;
  onClearSearch: () => void;
  onReplaceWord: (findWord: string, replaceWith: string) => void;
  onResetSampleDoc: () => void;
  onInspectTrie: () => void;
}

function extractTrailingWord(input: string): string {
  let token = '';
  for (let i = input.length - 1; i >= 0; i -= 1) {
    const code = input.charCodeAt(i);
    const isAlphaNum =
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57);
    if (isAlphaNum) {
      token = input[i] + token;
    } else {
      break;
    }
  }
  return token;
}

function computeEditorMetrics(lines: DLLNodeSnapshot[]) {
  let wordCount = 0;
  let charCount = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i].lineText;
    charCount += text.length;
    let inWord = false;
    for (let j = 0; j < text.length; j += 1) {
      const ch = text[j];
      const isSpace = ch === ' ' || ch === '\t' || ch === '\n';
      if (!isSpace && !inWord) {
        wordCount += 1;
        inWord = true;
      } else if (isSpace) {
        inWord = false;
      }
    }
  }
  const readingSeconds = Math.max(wordCount > 0 ? 1 : 0, Math.ceil((wordCount / 200) * 60));
  const readingLabel =
    readingSeconds >= 60
      ? `${Math.ceil(readingSeconds / 60)} min read`
      : `${readingSeconds}s read`;
  return { wordCount, charCount, lineCount: lines.length, readingLabel };
}

export const TextEditorPanel: React.FC<TextEditorPanelProps> = ({
  noteTitle,
  lines,
  selectedLineNumber,
  undoCount,
  redoCount,
  trashCount,
  importWaveKey,
  deletingLineId,
  restoredLineNumber,
  searchResult,
  topWords,
  getTrieSuggestions,
  onUpdateNoteTitle,
  onSelectLine,
  onUndo,
  onRedo,
  onWithdrawDelete,
  onPrevLine,
  onNextLine,
  onMoveLineUp,
  onMoveLineDown,
  onInsertLine,
  onUpdateLine,
  onDeleteLine,
  onSearchWord,
  onClearSearch,
  onReplaceWord,
  onResetSampleDoc,
  onInspectTrie,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(noteTitle);
  const [composeText, setComposeText] = useState('');
  const [editText, setEditText] = useState('');
  const [activeInputTarget, setActiveInputTarget] = useState<'compose' | 'edit'>('compose');
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);
  const composeInputRef = useRef<HTMLInputElement>(null);

  const selectedNode = lines.find((n) => n.lineNumber === selectedLineNumber) ?? null;

  useEffect(() => {
    setTitleDraft(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (selectedNode) {
      setEditText(selectedNode.lineText);
    } else {
      setEditText('');
    }
  }, [selectedLineNumber, selectedNode?.lineText]);

  const currentSourceText = activeInputTarget === 'edit' ? editText : composeText;
  const trailingPrefix = extractTrailingWord(currentSourceText);
  const suggestions = trailingPrefix.length >= 1 ? getTrieSuggestions(trailingPrefix) : [];

  useEffect(() => {
    setActiveSuggestionIdx(0);
  }, [trailingPrefix]);

  const handleSaveTitle = () => {
    onUpdateNoteTitle(titleDraft);
    if (titleDraft.trim().length > 0) {
      setIsEditingTitle(false);
    }
  };

  const applyAutocomplete = (word: string) => {
    const baseText = activeInputTarget === 'edit' ? editText : composeText;
    const prefixLen = extractTrailingWord(baseText).length;
    const nextValue = baseText.slice(0, baseText.length - prefixLen) + word + ' ';
    if (activeInputTarget === 'edit') {
      setEditText(nextValue);
      editInputRef.current?.focus();
    } else {
      setComposeText(nextValue);
      composeInputRef.current?.focus();
    }
  };

  const handleComposeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      const chosen = suggestions[activeSuggestionIdx] ?? suggestions[0];
      if (chosen) applyAutocomplete(chosen.word);
      return;
    }
    if (suggestions.length > 0 && e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (suggestions.length > 0 && e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onInsertLine(composeText, 'end');
      if (composeText.trim().length > 0) setComposeText('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0 && e.key === 'Tab') {
      e.preventDefault();
      const chosen = suggestions[activeSuggestionIdx] ?? suggestions[0];
      if (chosen) applyAutocomplete(chosen.word);
      return;
    }
    if (e.key === 'Enter' && selectedNode) {
      e.preventDefault();
      onUpdateLine(selectedNode.lineNumber, editText);
    }
  };

  const matchingLineNumbers =
    searchResult && searchResult.found ? searchResult.lineNumbers : [];

  const metrics = computeEditorMetrics(lines);

  return (
    <section
      id="text-editor"
      className="flex flex-col rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden shadow-xs"
    >
      {/* Panel Header + Editable Note Title */}
      <div className="border-b border-[#E5D9C5] bg-[#F4ECE0] px-5 py-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Doubly Linked List" accent="indigo" />
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#57534E] tabular-nums">
            <span>Lines: <strong className="text-[#4338CA]">{metrics.lineCount}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Words: <strong className="text-[#1E1B18]">{metrics.wordCount}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Chars: <strong className="text-[#1E1B18]">{metrics.charCount}</strong></span>
            <span aria-hidden="true">·</span>
            <span className="text-[#0F766E] font-medium">{metrics.readingLabel}</span>
          </div>
        </div>

        {/* Editable Note Title */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {isEditingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleDraft(noteTitle);
                    setIsEditingTitle(false);
                  }
                }}
                aria-label="Edit note title"
                autoFocus
                className="flex-1 rounded-lg border border-[#4338CA] bg-[#FFFDF9] px-3 py-1.5 text-sm font-semibold text-[#1E1B18] focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20"
              />
              <ActionButton size="sm" accent="teal" isActive onClick={handleSaveTitle}>
                <Check className="w-3.5 h-3.5" />
                <span>Save Title</span>
              </ActionButton>
              <ActionButton
                size="sm"
                accent="neutral"
                onClick={() => {
                  setTitleDraft(noteTitle);
                  setIsEditingTitle(false);
                }}
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </ActionButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <h2 className="font-display text-lg font-bold text-[#1E1B18] truncate">
                {noteTitle}
              </h2>
              <ActionButton
                size="sm"
                accent="indigo"
                onClick={() => {
                  setTitleDraft(noteTitle);
                  setIsEditingTitle(true);
                }}
                title="Edit Note Title (undoable via Two Stacks)"
                aria-label="Edit note title"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Title</span>
              </ActionButton>
            </div>
          )}
        </div>
      </div>

      {/* Undo / Redo / Withdraw Delete & Traversal Toolbar */}
      <div className="border-b border-[#E5D9C5] bg-[#F7F1E5] px-5 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Two Stacks — Undo & Redo" accent="rose" />
          <span className="text-[11px] text-[#57534E] tabular-nums">
            Undo frames: <strong className="text-[#BE123C]">{undoCount}</strong> · Redo frames:{' '}
            <strong className="text-[#0F766E]">{redoCount}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton size="sm" accent="rose" onClick={onUndo}>
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo ({undoCount})</span>
          </ActionButton>
          <ActionButton size="sm" accent="teal" onClick={onRedo}>
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo ({redoCount})</span>
          </ActionButton>
          <ActionButton size="sm" accent="violet" onClick={onWithdrawDelete}>
            <RotateCw className="w-3.5 h-3.5" />
            <span>Withdraw Delete ({trashCount})</span>
          </ActionButton>

          <div className="h-5 w-px bg-[#D6C7B2] mx-0.5 hidden sm:block" aria-hidden="true" />

          <ActionButton size="sm" accent="indigo" onClick={onPrevLine} title="Traverse backward via node.prev">
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Prev</span>
          </ActionButton>
          <ActionButton size="sm" accent="indigo" onClick={onNextLine} title="Traverse forward via node.next">
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Next</span>
          </ActionButton>
          <ActionButton
            size="sm"
            accent="teal"
            onClick={() => onMoveLineUp(selectedLineNumber)}
            title="Swap selected DLL node with prev pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Move Up</span>
          </ActionButton>
          <ActionButton
            size="sm"
            accent="teal"
            onClick={() => onMoveLineDown(selectedLineNumber)}
            title="Swap selected DLL node with next pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Move Down</span>
          </ActionButton>
        </div>
      </div>

      {/* Line Input & Trie Auto-Complete */}
      <div className="border-b border-[#E5D9C5] px-5 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Trie / Prefix Tree" accent="violet" />
          <ActionButton size="sm" accent="violet" onClick={onInspectTrie}>
            <Eye className="w-3.5 h-3.5" />
            <span>Visualize Trie</span>
          </ActionButton>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={composeInputRef}
            type="text"
            value={composeText}
            onFocus={() => setActiveInputTarget('compose')}
            onChange={(e) => {
              setActiveInputTarget('compose');
              setComposeText(e.target.value);
            }}
            onKeyDown={handleComposeKeyDown}
            placeholder="Write a new line (type prefix e.g. 'alg', 'heap' + Tab to autocomplete)..."
            aria-label="New document line input"
            className="flex-1 rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-3.5 py-2 text-sm text-[#1E1B18] placeholder-[#78716C] focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20"
          />
          <div className="flex items-center gap-2 shrink-0">
            <ActionButton
              accent="indigo"
              isActive
              onClick={() => {
                onInsertLine(composeText, 'end');
                if (composeText.trim().length > 0) setComposeText('');
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Line</span>
            </ActionButton>
            <ActionButton
              accent="violet"
              onClick={() => {
                onInsertLine(composeText, 'above');
                if (composeText.trim().length > 0) setComposeText('');
              }}
              title="Insert before selected line"
            >
              <span>Insert Above</span>
            </ActionButton>
          </div>
        </div>

        {selectedNode && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <span className="font-mono text-xs text-[#4338CA] font-semibold tabular-nums whitespace-nowrap shrink-0">
              Edit Line {selectedNode.lineNumber}:
            </span>
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onFocus={() => setActiveInputTarget('edit')}
              onChange={(e) => {
                setActiveInputTarget('edit');
                setEditText(e.target.value);
              }}
              onKeyDown={handleEditKeyDown}
              aria-label={`Edit line ${selectedNode.lineNumber}`}
              className="flex-1 rounded-lg border border-[#C7D2FE] bg-[#FBF7F0] px-3 py-1.5 font-mono text-xs sm:text-sm text-[#1E1B18] focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20"
            />
            <ActionButton
              size="sm"
              accent="teal"
              onClick={() => onUpdateLine(selectedNode.lineNumber, editText)}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Line</span>
            </ActionButton>
          </div>
        )}

        {suggestions.length > 0 && (
          <div
            className="rounded-lg border border-[#DDD6FE] bg-[#F3E8FF]/65 p-3 animate-fade-slide-in"
            role="listbox"
            aria-label="Trie autocomplete suggestions"
          >
            <div className="flex items-center justify-between text-xs text-[#5B21B6] mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" aria-hidden="true" />
                Trie Completions for <code className="font-semibold">"{trailingPrefix}"</code>
              </span>
              <span className="text-[11px] text-[#6D28D9]">Click or press Tab</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug, idx) => (
                <ActionButton
                  key={sug.word}
                  size="sm"
                  accent="violet"
                  isActive={idx === activeSuggestionIdx}
                  onClick={() => applyAutocomplete(sug.word)}
                >
                  <span className="font-mono">{sug.word}</span>
                  <span className="text-[10px] opacity-80 tabular-nums">({sug.frequency})</span>
                </ActionButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Lines List (Doubly Linked List) */}
      <div className="border-b border-[#E5D9C5] bg-[#F4ECE0]/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <DSBadge label="Doubly Linked List" accent="indigo" />
        <span className="text-[11px] text-[#57534E]">
          Click line to focus · Click Trash icon to delete (recoverable via Withdraw Delete)
        </span>
      </div>

      <div className="flex-1 min-h-[240px] max-h-[340px] overflow-y-auto divide-y divide-[#E5D9C5] bg-[#FFFDF9]">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="text-sm font-semibold text-[#1E1B18] mb-1">
              Doubly Linked List is empty
            </p>
            <p className="text-xs text-[#57534E] mb-4 max-w-sm">
              Head and Tail pointers are null. Type a line above, click Withdraw Delete, or load sample lines.
            </p>
            <ActionButton size="sm" accent="indigo" onClick={onResetSampleDoc}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Sample Lines</span>
            </ActionButton>
          </div>
        ) : (
          lines.map((node, idx) => {
            const isSelected = node.lineNumber === selectedLineNumber;
            const isSearchMatch = matchingLineNumbers.includes(node.lineNumber);
            const isDeleting = deletingLineId === node.id;
            const isRestored = restoredLineNumber === node.lineNumber;

            return (
              <div
                key={`${node.id}-${importWaveKey}`}
                onClick={() => onSelectLine(node.lineNumber)}
                style={{ animationDelay: `${Math.min(idx, 10) * 45}ms` }}
                className={`flex items-start justify-between gap-3 px-5 py-3 transition-all duration-200 cursor-pointer ${
                  isDeleting
                    ? 'opacity-0 scale-95 -translate-x-2'
                    : isRestored
                    ? 'animate-restore-pop'
                    : 'animate-import-cascade'
                } ${
                  isSelected
                    ? 'bg-[#EEF2FF]/75'
                    : isSearchMatch
                    ? 'bg-[#CCFBF1]/45 hover:bg-[#CCFBF1]/65'
                    : 'hover:bg-[#F7F1E5]/75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <ActionButton
                    size="sm"
                    accent="indigo"
                    isActive={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLine(node.lineNumber);
                    }}
                  >
                    <span className="font-mono tabular-nums">
                      L{String(node.lineNumber).padStart(2, '0')}
                    </span>
                  </ActionButton>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-[#1E1B18] break-words leading-relaxed">
                      {node.lineText}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#57534E] font-mono tabular-nums">
                      <span>
                        Prev: {node.prevLineNumber !== null ? `L${node.prevLineNumber}` : 'null'}
                      </span>
                      <span aria-hidden="true">↔</span>
                      <span className="text-[#4338CA] font-semibold">Node {node.lineNumber}</span>
                      <span aria-hidden="true">↔</span>
                      <span>
                        Next: {node.nextLineNumber !== null ? `L${node.nextLineNumber}` : 'null'}
                      </span>
                      {isSearchMatch && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#0F766E] font-semibold">Hash Match</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <ActionButton
                  size="sm"
                  accent="rose"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLine(node.lineNumber, node.id);
                  }}
                  title={`Delete Line ${node.lineNumber}`}
                  aria-label={`Delete Line ${node.lineNumber}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </ActionButton>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive DLL Chain Strip */}
      <div className="border-t border-[#E5D9C5] bg-[#F7F1E5] px-5 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#1E1B18] flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#4338CA]" aria-hidden="true" />
            Doubly Linked List Chain (click node to focus)
          </span>
          <span className="font-mono text-[11px] text-[#57534E] tabular-nums">
            {lines.length} node{lines.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="font-mono text-[11px] font-semibold text-[#57534E] px-2 py-1 rounded border border-[#D6C7B2] bg-[#FFFDF9] shrink-0">
            HEAD
          </span>
          {lines.map((node) => {
            const isSelected = node.lineNumber === selectedLineNumber;
            return (
              <React.Fragment key={`chain-${node.id}`}>
                <span className="text-[#78716C] text-xs font-mono shrink-0" aria-hidden="true">
                  ↔
                </span>
                <ActionButton
                  size="sm"
                  accent="indigo"
                  isActive={isSelected}
                  onClick={() => onSelectLine(node.lineNumber)}
                >
                  <span className="font-mono tabular-nums">
                    L{node.lineNumber}: {node.lineText.slice(0, 12)}
                    {node.lineText.length > 12 ? '…' : ''}
                  </span>
                </ActionButton>
              </React.Fragment>
            );
          })}
          <span className="text-[#78716C] text-xs font-mono shrink-0" aria-hidden="true">
            ↔
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#57534E] px-2 py-1 rounded border border-[#D6C7B2] bg-[#FFFDF9] shrink-0">
            TAIL
          </span>
        </div>
      </div>

      {/* Hash Table Word Search & Find/Replace */}
      <div className="border-t border-[#E5D9C5] bg-[#F4ECE0]/60 px-5 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Hash Table" accent="teal" />
          <span className="text-[11px] text-[#57534E]">
            Separate chaining frequency index · O(1) average lookup
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchWord(searchQuery);
              }}
              placeholder="Search word in Hash Table..."
              aria-label="Search word in hash table"
              className="flex-1 min-w-0 rounded-lg border border-[#D6C7B2] bg-[#FFFDF9] px-3 py-1.5 text-xs sm:text-sm text-[#1E1B18] placeholder-[#78716C] focus:border-[#0F766E] focus:outline-none"
            />
            <ActionButton size="sm" accent="teal" onClick={() => onSearchWord(searchQuery)}>
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </ActionButton>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace matched word with..."
              aria-label="Replacement word"
              className="flex-1 min-w-0 rounded-lg border border-[#D6C7B2] bg-[#FFFDF9] px-3 py-1.5 text-xs sm:text-sm text-[#1E1B18] placeholder-[#78716C] focus:border-[#BE123C] focus:outline-none"
            />
            <ActionButton
              size="sm"
              accent="rose"
              onClick={() => onReplaceWord(searchQuery, replaceQuery)}
            >
              <Replace className="w-3.5 h-3.5" />
              <span>Find &amp; Replace</span>
            </ActionButton>
          </div>
        </div>

        {searchResult && (
          <div className="animate-fade-slide-in flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-3.5 py-2 text-xs">
            {searchResult.found ? (
              <div className="flex flex-wrap items-center gap-2 text-[#1E1B18] tabular-nums">
                <span className="font-semibold text-[#0F766E]">Found "{searchResult.key}"</span>
                <span aria-hidden="true">·</span>
                <span>Frequency: <strong>{searchResult.count}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Bucket #{searchResult.bucketIndex} ({searchResult.probeSteps} probe{searchResult.probeSteps === 1 ? '' : 's'})</span>
                <span aria-hidden="true">·</span>
                <span>Lines: {searchResult.lineNumbers.map((l) => `L${l}`).join(', ')}</span>
              </div>
            ) : (
              <div className="text-[#BE123C] font-medium">
                Unsuccessful search: "{searchResult.key}" not found in Hash Bucket #{searchResult.bucketIndex}
              </div>
            )}
            <ActionButton size="sm" accent="neutral" onClick={onClearSearch}>
              Clear Highlight
            </ActionButton>
          </div>
        )}

        {topWords.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
            <span className="font-semibold text-[#1E1B18]">Top-5 Word Frequencies:</span>
            {topWords.slice(0, 5).map((entry) => (
              <ActionButton
                key={entry.word}
                size="sm"
                accent="neutral"
                onClick={() => {
                  setSearchQuery(entry.word);
                  onSearchWord(entry.word);
                }}
              >
                <span className="font-mono tabular-nums">
                  {entry.word} ({entry.count})
                </span>
              </ActionButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
