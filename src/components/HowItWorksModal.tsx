import React from 'react';
import { X, BookOpen, GitBranch } from 'lucide-react';
import { ActionButton } from './ActionButton';
import { DSBadge, DSBadgeAccent } from './DSBadge';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DS_GUIDE_ITEMS: {
  name: string;
  accent: DSBadgeAccent;
  where: string;
  how: string;
}[] = [
  {
    name: 'Dynamic Array',
    accent: 'indigo',
    where: 'Task Scheduler Store',
    how: 'Stores all created tasks starting at capacity 4. Adding a 5th task triggers automatic capacity doubling (4 → 8 → 16) with a live resize alert.',
  },
  {
    name: 'Doubly Linked List',
    accent: 'indigo',
    where: 'Smart Text Editor Lines',
    how: 'Every document line is a node with prev & next pointers. Click any line or use Move Prev / Move Next to traverse bidirectionally.',
  },
  {
    name: 'Two Stacks — Undo & Redo',
    accent: 'rose',
    where: 'Note Title & Line History',
    how: 'Every Note Title edit, Line Insert, Update, Delete, or Replace pushes a command onto UndoStack (clearing RedoStack). Undo/Redo pops cleanly with underflow checks.',
  },
  {
    name: 'Queue — FIFO',
    accent: 'violet',
    where: 'Task Scheduler Execution',
    how: 'Enqueues pending tasks in arrival order. Clicking "Process Queue (FIFO)" dequeues the oldest pending task from FRONT in O(1).',
  },
  {
    name: 'Tree — Priority Queue / Max-Heap',
    accent: 'rose',
    where: 'Urgency-First Processing',
    how: 'Binary Max-Heap using bubbleUp / sinkDown so High > Medium > Low urgency tasks always sit at index [0] for O(log n) extraction.',
  },
  {
    name: 'Hash Table',
    accent: 'teal',
    where: 'Word Search & Replace',
    how: '16-bucket polynomial rolling hash with separate chaining indexes every word frequency and line location for O(1) average lookup.',
  },
  {
    name: 'Trie / Prefix Tree',
    accent: 'violet',
    where: 'Real-Time Auto-Complete',
    how: 'Character-node prefix tree indexes dictionary and document words. Type any prefix in the line input and click a suggestion or press Tab.',
  },
  {
    name: 'Tree — Binary Search Tree (BST)',
    accent: 'teal',
    where: 'Deadline Manager',
    how: 'Orders tasks chronologically by deadline date. Supports pruned date search and In-Order Traversal for earliest-deadline-first sorting.',
  },
];

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B18]/45 p-4 backdrop-blur-xs animate-fade-slide-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5D9C5] bg-[#F4ECE0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
            <h2 id="how-it-works-title" className="font-display text-lg font-semibold text-[#1E1B18]">
              How It Works &amp; Data Structure Map
            </h2>
          </div>
          <ActionButton size="sm" accent="indigo" onClick={onClose}>
            <X className="w-4 h-4" />
            <span>Close</span>
          </ActionButton>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF]/70 p-4 text-xs sm:text-sm text-[#1E1B18] leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-[#4338CA] mb-1">
              <GitBranch className="w-4 h-4 text-[#4338CA]" aria-hidden="true" />
              <span>Presentation Guide</span>
            </div>
            Every section displays its active <strong className="text-[#4338CA]">[DS Used: ...]</strong> badge. Edit the Note Title with the pencil button, add/delete lines with Undo/Redo &amp; Withdraw Delete, import/export `.txt` or `.json`, type prefixes for Trie autocomplete, search words via Hash Table, and schedule tasks across Dynamic Array, Queue (FIFO), Max-Heap Tree, and Deadline BST.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DS_GUIDE_ITEMS.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DSBadge label={item.name} accent={item.accent} />
                  <span className="text-[11px] font-medium text-[#57534E]">{item.where}</span>
                </div>
                <p className="text-xs text-[#1E1B18] leading-relaxed">{item.how}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
