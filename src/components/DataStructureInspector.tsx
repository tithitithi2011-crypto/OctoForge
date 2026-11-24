import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ActionButton, ButtonAccent } from './ActionButton';
import { DSBadge, DSBadgeAccent } from './DSBadge';
import { DLLNodeSnapshot } from '../dsa/DoublyLinkedList';
import { EditorCommand, OperationLogEntry, PriorityLevel, TaskItem } from '../dsa/types';
import { TrieNodeInspection } from '../dsa/Trie';
import { HashBucketSnapshot } from '../dsa/HashTable';
import { BSTVisualNode } from '../dsa/DeadlineBST';

export type InspectorTab =
  | 'dynamicArray'
  | 'dll'
  | 'stacks'
  | 'fifoQueue'
  | 'maxHeap'
  | 'hashtable'
  | 'trie'
  | 'bst'
  | 'logs'
  | 'complexity';

interface DataStructureInspectorProps {
  activeTab: InspectorTab;
  onChangeTab: (tab: InspectorTab) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  dllNodes: DLLNodeSnapshot[];
  selectedLineNumber: number;
  onSelectLine: (lineNumber: number) => void;
  undoFrames: EditorCommand[];
  redoFrames: EditorCommand[];
  trieStats: { totalWords: number; totalNodes: number };
  inspectTriePrefix: (prefix: string) => TrieNodeInspection[];
  hashBuckets: HashBucketSnapshot[];
  hashStats: { uniqueKeys: number; totalOccurrences: number; loadFactor: number; collisions: number };
  dynamicArraySlots: (TaskItem | null)[];
  dynamicArrayLength: number;
  dynamicArrayCapacity: number;
  dynamicArrayResizeHistory: string[];
  fifoSlots: (TaskItem | null)[];
  fifoFront: number;
  fifoRear: number;
  fifoSize: number;
  fifoCapacity: number;
  heapArray: TaskItem[];
  bstLayout: BSTVisualNode[];
  bstInOrder: TaskItem[];
  bstHighlightedIds: string[];
  logs: OperationLogEntry[];
}

const COMPLEXITY_ROWS = [
  {
    ds: '1. Dynamic Array',
    role: 'Resizable Task Backing Store',
    access: 'O(1) by index',
    insert: 'O(1) amortized / O(n) resize',
    delete: 'O(n) left-shift',
    space: 'O(capacity)',
  },
  {
    ds: '2. Doubly Linked List',
    role: 'Document Line Storage',
    access: 'O(n) traversal',
    insert: 'O(1) at ends / O(n) by index',
    delete: 'O(1) with node ref / O(n) by index',
    space: 'O(n)',
  },
  {
    ds: '3. Two Stacks (Undo/Redo)',
    role: 'Note Title & Line History',
    access: 'O(1) peek top',
    insert: 'O(1) push',
    delete: 'O(1) pop',
    space: 'O(h) history depth',
  },
  {
    ds: '4. Queue (FIFO)',
    role: 'First-In First-Out Execution',
    access: 'O(1) front peek',
    insert: 'O(1) amortized enqueue',
    delete: 'O(1) dequeue',
    space: 'O(capacity)',
  },
  {
    ds: '5. Tree — Max-Heap',
    role: 'Urgency-First Priority Queue',
    access: 'O(1) peek max',
    insert: 'O(log n) bubbleUp',
    delete: 'O(log n) sinkDown',
    space: 'O(n)',
  },
  {
    ds: '6. Hash Table (Chained)',
    role: 'Word Search & Frequency Index',
    access: 'O(1) avg / O(n) worst',
    insert: 'O(1) avg / O(n) worst',
    delete: 'O(1) avg / O(n) worst',
    space: 'O(B + U) buckets + keys',
  },
  {
    ds: '7. Trie / Prefix Tree',
    role: 'Real-Time Word Auto-Complete',
    access: 'O(L) prefix length',
    insert: 'O(L) characters',
    delete: 'O(L + k) subtree walk',
    space: 'O(N × Σ) nodes',
  },
  {
    ds: '8. Tree — Binary Search Tree',
    role: 'Deadline Ordering & Date Search',
    access: 'O(log n) avg / O(n) skewed',
    insert: 'O(log n) avg / O(n) worst',
    delete: 'O(log n) avg / O(n) worst',
    space: 'O(n)',
  },
];

const TAB_ITEMS: { id: InspectorTab; label: string; accent: ButtonAccent; dsLabel: string; badgeAccent: DSBadgeAccent }[] = [
  { id: 'dynamicArray', label: 'Dynamic Array', accent: 'indigo', dsLabel: 'Dynamic Array', badgeAccent: 'indigo' },
  { id: 'dll', label: 'Doubly Linked List', accent: 'indigo', dsLabel: 'Doubly Linked List', badgeAccent: 'indigo' },
  { id: 'stacks', label: 'Undo/Redo Stacks', accent: 'rose', dsLabel: 'Two Stacks — Undo & Redo', badgeAccent: 'rose' },
  { id: 'fifoQueue', label: 'Queue (FIFO)', accent: 'violet', dsLabel: 'Queue — FIFO', badgeAccent: 'violet' },
  { id: 'maxHeap', label: 'Max-Heap Tree', accent: 'rose', dsLabel: 'Tree — Priority Queue / Max-Heap', badgeAccent: 'rose' },
  { id: 'hashtable', label: 'Hash Table', accent: 'teal', dsLabel: 'Hash Table', badgeAccent: 'teal' },
  { id: 'trie', label: 'Trie Tree', accent: 'violet', dsLabel: 'Trie / Prefix Tree', badgeAccent: 'violet' },
  { id: 'bst', label: 'Deadline BST', accent: 'teal', dsLabel: 'Tree — Binary Search Tree (BST)', badgeAccent: 'teal' },
  { id: 'logs', label: 'Operation Log', accent: 'neutral', dsLabel: 'All 8 Structures Trace', badgeAccent: 'indigo' },
  { id: 'complexity', label: 'Complexity Table', accent: 'indigo', dsLabel: 'Time & Space Complexity Reference', badgeAccent: 'violet' },
];

function getPriorityStroke(priority: PriorityLevel): string {
  if (priority === PriorityLevel.HIGH) return '#BE123C';
  if (priority === PriorityLevel.MEDIUM) return '#4338CA';
  return '#0F766E';
}

export const DataStructureInspector: React.FC<DataStructureInspectorProps> = ({
  activeTab,
  onChangeTab,
  isExpanded,
  onToggleExpand,
  dllNodes,
  selectedLineNumber,
  onSelectLine,
  undoFrames,
  redoFrames,
  trieStats,
  inspectTriePrefix,
  hashBuckets,
  hashStats,
  dynamicArraySlots,
  dynamicArrayLength,
  dynamicArrayCapacity,
  dynamicArrayResizeHistory,
  fifoSlots,
  fifoFront,
  fifoRear,
  fifoSize,
  fifoCapacity,
  heapArray,
  bstLayout,
  bstInOrder,
  bstHighlightedIds,
  logs,
}) => {
  const [trieFilterPrefix, setTrieFilterPrefix] = useState('');

  const trieNodes = inspectTriePrefix(trieFilterPrefix);
  const activeTabMeta = TAB_ITEMS.find((t) => t.id === activeTab) ?? TAB_ITEMS[0];

  const renderHeapSVG = () => {
    if (heapArray.length === 0) {
      return (
        <div className="py-10 text-center text-xs text-[#57534E]">
          Max-Heap Tree is empty. Add tasks to visualize the complete binary tree and array mapping.
        </div>
      );
    }

    const displayNodes = heapArray.slice(0, 15);
    const width = 760;
    const height = 260;

    const getCoords = (idx: number) => {
      const level = Math.floor(Math.log2(idx + 1));
      const levelStart = Math.pow(2, level) - 1;
      const posInLevel = idx - levelStart;
      const nodesInLevel = Math.pow(2, level);
      const x = ((posInLevel + 0.5) / nodesInLevel) * width;
      const y = 38 + level * 62;
      return { x, y };
    };

    return (
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px] h-[250px] rounded-lg border border-[#D6C7B2] bg-[#FBF7F0]"
          role="img"
          aria-label="Max-Heap Binary Tree Visualization"
        >
          {displayNodes.map((_, idx) => {
            if (idx === 0) return null;
            const parentIdx = Math.floor((idx - 1) / 2);
            const p = getCoords(parentIdx);
            const c = getCoords(idx);
            return (
              <line
                key={`edge-${idx}`}
                x1={p.x}
                y1={p.y}
                x2={c.x}
                y2={c.y}
                stroke="#B8A58D"
                strokeWidth={1.75}
              />
            );
          })}
          {displayNodes.map((task, idx) => {
            const { x, y } = getCoords(idx);
            const stroke = getPriorityStroke(task.priority);
            const isRoot = idx === 0;
            return (
              <g key={task.id} transform={`translate(${x}, ${y})`}>
                <rect
                  x={-48}
                  y={-20}
                  width={96}
                  height={40}
                  rx={8}
                  fill={isRoot ? '#BE123C' : '#FFFDF9'}
                  stroke={isRoot ? '#9F1239' : stroke}
                  strokeWidth={2}
                />
                <text
                  y={-4}
                  textAnchor="middle"
                  fill={isRoot ? '#FFFDF9' : '#1E1B18'}
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  [{idx}] {task.priority.slice(0, 3)}
                </text>
                <text
                  y={11}
                  textAnchor="middle"
                  fill={isRoot ? '#FFE4E6' : '#57534E'}
                  fontSize={10}
                  fontFamily="Inter, system-ui, -apple-system, sans-serif"
                >
                  {task.title.length > 12 ? `${task.title.slice(0, 11)}…` : task.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderBSTSVG = () => {
    if (bstLayout.length === 0) {
      return (
        <div className="py-10 text-center text-xs text-[#57534E]">
          Deadline BST is empty. Add tasks to visualize deadline-ordered nodes and In-Order Traversal.
        </div>
      );
    }

    const maxX = Math.max(1, bstLayout.length - 1);
    const maxDepth = bstLayout.reduce((acc, n) => (n.y > acc ? n.y : acc), 0);
    const width = Math.max(720, bstLayout.length * 105);
    const height = Math.max(240, (maxDepth + 1) * 68 + 40);

    const coordById: Record<string, { x: number; y: number }> = {};
    bstLayout.forEach((n) => {
      const x = bstLayout.length === 1 ? width / 2 : 68 + (n.x / maxX) * (width - 136);
      const y = 38 + n.y * 64;
      coordById[n.id] = { x, y };
    });

    return (
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px] max-h-[300px] rounded-lg border border-[#D6C7B2] bg-[#FBF7F0]"
          role="img"
          aria-label="Deadline Binary Search Tree Visualization"
        >
          {bstLayout.map((n) => {
            const parentPos = coordById[n.id];
            if (!parentPos) return null;
            const leftPos = n.leftId ? coordById[n.leftId] : null;
            const rightPos = n.rightId ? coordById[n.rightId] : null;
            return (
              <React.Fragment key={`bst-edges-${n.id}`}>
                {leftPos && (
                  <line
                    x1={parentPos.x}
                    y1={parentPos.y}
                    x2={leftPos.x}
                    y2={leftPos.y}
                    stroke="#B8A58D"
                    strokeWidth={1.75}
                  />
                )}
                {rightPos && (
                  <line
                    x1={parentPos.x}
                    y1={parentPos.y}
                    x2={rightPos.x}
                    y2={rightPos.y}
                    stroke="#B8A58D"
                    strokeWidth={1.75}
                  />
                )}
              </React.Fragment>
            );
          })}
          {bstLayout.map((n) => {
            const pos = coordById[n.id];
            if (!pos) return null;
            const isHighlighted = bstHighlightedIds.includes(n.id);
            const datePart = n.task.deadline.split('T')[0];
            const timePart = n.task.deadline.split('T')[1] ?? '';
            return (
              <g key={`bst-node-${n.id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  x={-50}
                  y={-21}
                  width={100}
                  height={42}
                  rx={8}
                  fill={isHighlighted ? '#0F766E' : '#FFFDF9'}
                  stroke={isHighlighted ? '#115E59' : getPriorityStroke(n.task.priority)}
                  strokeWidth={2}
                />
                <text
                  y={-4}
                  textAnchor="middle"
                  fill={isHighlighted ? '#FFFDF9' : '#1E1B18'}
                  fontSize={9.5}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {datePart.slice(5)} {timePart}
                </text>
                <text
                  y={11}
                  textAnchor="middle"
                  fill={isHighlighted ? '#CCFBF1' : '#57534E'}
                  fontSize={10}
                  fontFamily="Inter, system-ui, -apple-system, sans-serif"
                >
                  {n.task.title.length > 13 ? `${n.task.title.slice(0, 12)}…` : n.task.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <section
      id="ds-inspector"
      className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D9C5] bg-[#F4ECE0] px-5 py-4">
        <div className="space-y-1.5">
          <DSBadge label={activeTabMeta.dsLabel} accent={activeTabMeta.badgeAccent} />
          <h2 className="font-display text-lg font-bold text-[#1E1B18]">
            Live Data Structure Visualizer &amp; Complexity Reference
          </h2>
        </div>
        <ActionButton
          size="sm"
          accent="indigo"
          isActive={isExpanded}
          onClick={onToggleExpand}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{isExpanded ? 'Collapse Visualizer' : 'Expand Visualizer'}</span>
        </ActionButton>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-wrap items-center gap-1.5 border-b border-[#E5D9C5] bg-[#F7F1E5] px-5 py-3"
        role="tablist"
        aria-label="Data Structure Inspector Tabs"
      >
        {TAB_ITEMS.map((tab) => (
          <ActionButton
            key={tab.id}
            size="sm"
            accent={tab.accent}
            role="tab"
            aria-selected={activeTab === tab.id}
            isActive={activeTab === tab.id}
            onClick={() => {
              onChangeTab(tab.id);
              if (!isExpanded) onToggleExpand();
            }}
          >
            {tab.label}
          </ActionButton>
        ))}
      </div>

      {isExpanded && (
        <div className="p-5 animate-fade-slide-in">
          {/* Dynamic Array */}
          {activeTab === 'dynamicArray' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E] font-mono tabular-nums">
                <span>
                  length: <strong className="text-[#1E1B18]">{dynamicArrayLength}</strong> · capacity:{' '}
                  <strong className="text-[#4338CA]">{dynamicArrayCapacity}</strong>
                </span>
                <span>
                  Resize log:{' '}
                  {dynamicArrayResizeHistory.length === 0
                    ? 'none yet (add 5th task to trigger 4 → 8)'
                    : dynamicArrayResizeHistory.join(' | ')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {dynamicArraySlots.map((slot, idx) => (
                  <div
                    key={`da-slot-${idx}`}
                    className={`rounded-lg border p-2.5 text-xs ${
                      slot !== null
                        ? 'border-[#C7D2FE] bg-[#EEF2FF]/70 text-[#1E1B18]'
                        : 'border-dashed border-[#D6C7B2] bg-[#FBF7F0] text-[#78716C]'
                    }`}
                  >
                    <div className="font-mono text-[11px] font-semibold text-[#4338CA] tabular-nums mb-1">
                      [{idx}]
                    </div>
                    {slot !== null ? (
                      <div className="truncate font-semibold" title={slot.title}>
                        {slot.title}
                      </div>
                    ) : (
                      <div className="font-mono text-[11px]">null (free)</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DLL */}
          {activeTab === 'dll' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E] tabular-nums">
                <span>
                  HEAD → {dllNodes[0] ? `Line ${dllNodes[0].lineNumber}` : 'null'} · TAIL →{' '}
                  {dllNodes.length > 0 ? `Line ${dllNodes[dllNodes.length - 1].lineNumber}` : 'null'}
                </span>
                <span>Click any node to select it in the editor</span>
              </div>
              {dllNodes.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#57534E]">
                  Doubly Linked List is empty (`head = null`, `tail = null`).
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dllNodes.map((node) => {
                    const isSelected = node.lineNumber === selectedLineNumber;
                    return (
                      <ActionButton
                        key={node.id}
                        accent="indigo"
                        isActive={isSelected}
                        onClick={() => onSelectLine(node.lineNumber)}
                        className="!h-auto !w-full !flex-col !items-stretch !justify-start !p-3 !text-left !whitespace-normal"
                      >
                        <div className="flex items-center justify-between font-mono text-xs mb-1 tabular-nums w-full">
                          <span className="font-semibold">Line {node.lineNumber}</span>
                          <span className="opacity-75">{node.id}</span>
                        </div>
                        <p className="font-mono text-xs truncate mb-1.5 w-full">{node.lineText}</p>
                        <div className="flex items-center justify-between font-mono text-[11px] opacity-80 tabular-nums w-full">
                          <span>prev: {node.prevLineNumber ? `L${node.prevLineNumber}` : 'null'}</span>
                          <span>next: {node.nextLineNumber ? `L${node.nextLineNumber}` : 'null'}</span>
                        </div>
                      </ActionButton>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stacks */}
          {activeTab === 'stacks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2]/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1E1B18]">Undo Stack</h3>
                  <span className="font-mono text-xs font-semibold text-[#BE123C] tabular-nums">
                    size: {undoFrames.length}
                  </span>
                </div>
                {undoFrames.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#57534E]">
                    UndoStack is empty (popping triggers STACK_UNDERFLOW).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {undoFrames.map((frame, idx) => (
                      <div
                        key={frame.id}
                        className={`rounded-md border px-3 py-2 text-xs ${
                          idx === 0
                            ? 'border-[#FB7185] bg-[#FFFDF9] text-[#1E1B18] shadow-xs'
                            : 'border-[#E5D9C5] bg-[#FFFDF9]/80 text-[#57534E]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono mb-0.5">
                          <span className="font-semibold text-[#BE123C]">
                            {idx === 0 ? 'TOP → ' : `#${undoFrames.length - idx} `}
                            {frame.type}
                          </span>
                          <span className="text-[#57534E] tabular-nums">{frame.timestamp}</span>
                        </div>
                        <p className="truncate">{frame.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[#99F6E4] bg-[#F0FDFA]/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1E1B18]">Redo Stack</h3>
                  <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
                    size: {redoFrames.length}
                  </span>
                </div>
                {redoFrames.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#57534E]">
                    RedoStack is empty (popping triggers STACK_UNDERFLOW).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {redoFrames.map((frame, idx) => (
                      <div
                        key={frame.id}
                        className={`rounded-md border px-3 py-2 text-xs ${
                          idx === 0
                            ? 'border-[#2DD4BF] bg-[#FFFDF9] text-[#1E1B18] shadow-xs'
                            : 'border-[#E5D9C5] bg-[#FFFDF9]/80 text-[#57534E]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono mb-0.5">
                          <span className="font-semibold text-[#0F766E]">
                            {idx === 0 ? 'TOP → ' : `#${redoFrames.length - idx} `}
                            {frame.type}
                          </span>
                          <span className="text-[#57534E] tabular-nums">{frame.timestamp}</span>
                        </div>
                        <p className="truncate">{frame.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FIFO Queue */}
          {activeTab === 'fifoQueue' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#57534E] font-mono tabular-nums">
                <span>size: <strong className="text-[#1E1B18]">{fifoSize}</strong></span>
                <span>capacity: <strong className="text-[#1E1B18]">{fifoCapacity}</strong></span>
                <span>frontIdx: <strong className="text-[#6D28D9]">{fifoFront}</strong></span>
                <span>rearIdx: <strong className="text-[#0F766E]">{fifoRear}</strong></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {fifoSlots.map((slot, idx) => {
                  const isFront = fifoSize > 0 && idx === fifoFront;
                  const isRear = idx === fifoRear;
                  return (
                    <div
                      key={`fifo-slot-${idx}`}
                      className={`rounded-lg border p-2.5 text-xs ${
                        isFront
                          ? 'border-[#6D28D9] bg-[#F3E8FF]/70 text-[#1E1B18]'
                          : slot !== null
                          ? 'border-[#D6C7B2] bg-[#FFFDF9] text-[#1E1B18]'
                          : 'border-dashed border-[#D6C7B2] bg-[#FBF7F0] text-[#78716C]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1 tabular-nums">
                        <span>[{idx}]</span>
                        <span className="text-[#6D28D9] font-semibold">
                          {isFront ? 'FRONT' : isRear ? 'REAR' : ''}
                        </span>
                      </div>
                      {slot !== null ? (
                        <div className="truncate font-semibold" title={slot.title}>
                          {slot.title}
                        </div>
                      ) : (
                        <div className="font-mono text-[11px]">empty</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Max-Heap */}
          {activeTab === 'maxHeap' && (
            <div className="space-y-4">
              {renderHeapSVG()}
              <div>
                <h4 className="text-xs font-semibold text-[#57534E] mb-2">
                  Underlying 0-Indexed Heap Array
                </h4>
                <div className="flex flex-wrap gap-2">
                  {heapArray.length === 0 ? (
                    <span className="text-xs text-[#78716C]">[]</span>
                  ) : (
                    heapArray.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-mono tabular-nums ${
                          idx === 0
                            ? 'border-[#BE123C] bg-[#BE123C] text-white font-semibold'
                            : 'border-[#D6C7B2] bg-[#FBF7F0] text-[#1E1B18]'
                        }`}
                      >
                        [{idx}] {item.priority.slice(0, 3)} · {item.title.slice(0, 14)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hash Table */}
          {activeTab === 'hashtable' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#57534E] font-mono tabular-nums">
                <span>Buckets: <strong className="text-[#1E1B18]">{hashBuckets.length}</strong></span>
                <span>Unique Keys: <strong className="text-[#1E1B18]">{hashStats.uniqueKeys}</strong></span>
                <span>Total Tokens: <strong className="text-[#1E1B18]">{hashStats.totalOccurrences}</strong></span>
                <span>Load Factor α: <strong className="text-[#0F766E]">{hashStats.loadFactor}</strong></span>
                <span>Chained Collisions: <strong className="text-[#1E1B18]">{hashStats.collisions}</strong></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                {hashBuckets.map((bucket) => (
                  <div
                    key={bucket.index}
                    className="flex items-start gap-2.5 rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] px-3 py-2 text-xs font-mono"
                  >
                    <span className="text-[#0F766E] font-semibold tabular-nums shrink-0">
                      [{String(bucket.index).padStart(2, '0')}]
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[#1E1B18]">
                      {bucket.chain.length === 0 ? (
                        <span className="text-[#A8A29E]">null</span>
                      ) : (
                        bucket.chain.map((entry, idx) => (
                          <React.Fragment key={entry.key}>
                            {idx > 0 && <span className="text-[#78716C]">→</span>}
                            <span className="rounded bg-[#FFFDF9] border border-[#D6C7B2] px-1.5 py-0.5 tabular-nums">
                              {entry.key} ({entry.count})
                            </span>
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trie */}
          {activeTab === 'trie' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={trieFilterPrefix}
                    onChange={(e) => setTrieFilterPrefix(e.target.value)}
                    placeholder="Inspect Trie branch by prefix (e.g., 'tr', 'ha')..."
                    aria-label="Inspect Trie prefix"
                    className="rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-3 py-1.5 text-xs text-[#1E1B18] placeholder-[#78716C] focus:border-[#6D28D9] focus:bg-[#FFFDF9] focus:outline-none"
                  />
                  {trieFilterPrefix && (
                    <ActionButton size="sm" accent="neutral" onClick={() => setTrieFilterPrefix('')}>
                      Reset
                    </ActionButton>
                  )}
                </div>
                <div className="text-xs text-[#57534E] font-mono tabular-nums">
                  Words: <strong className="text-[#1E1B18]">{trieStats.totalWords}</strong> · Nodes:{' '}
                  <strong className="text-[#6D28D9]">{trieStats.totalNodes}</strong>
                </div>
              </div>

              {trieNodes.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#57534E]">
                  No Trie branch matches prefix "{trieFilterPrefix}".
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto">
                  {trieNodes.map((n) => (
                    <div
                      key={n.nodeId}
                      className={`rounded-lg border px-3 py-2 text-xs font-mono ${
                        n.isEndOfWord
                          ? 'border-[#DDD6FE] bg-[#F3E8FF]/65 text-[#1E1B18]'
                          : 'border-[#E5D9C5] bg-[#FBF7F0] text-[#57534E]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#6D28D9]">'{n.char}'</span>
                        <span className="text-[11px] text-[#57534E] tabular-nums">d={n.depth}</span>
                      </div>
                      <div className="text-[11px] truncate">prefix: "{n.prefix}"</div>
                      <div className="text-[11px] text-[#57534E] mt-1">
                        {n.isEndOfWord ? `END (freq ${n.frequency})` : 'internal'} · children: [
                        {n.childKeys.join(',')}]
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deadline BST */}
          {activeTab === 'bst' && (
            <div className="space-y-4">
              {renderBSTSVG()}
              <div>
                <h4 className="text-xs font-semibold text-[#57534E] mb-2">
                  In-Order Traversal (Earliest Deadline First)
                </h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  {bstInOrder.length === 0 ? (
                    <span className="text-xs text-[#78716C]">Tree is empty</span>
                  ) : (
                    bstInOrder.map((t, idx) => (
                      <React.Fragment key={t.id}>
                        {idx > 0 && <span className="text-[#78716C] font-mono text-xs">→</span>}
                        <span
                          className={`rounded border px-2.5 py-1 text-xs font-mono tabular-nums ${
                            bstHighlightedIds.includes(t.id)
                              ? 'border-[#0F766E] bg-[#0F766E] text-white font-semibold'
                              : 'border-[#D6C7B2] bg-[#FBF7F0] text-[#1E1B18]'
                          }`}
                        >
                          {t.deadline.replace('T', ' ')} ({t.title.slice(0, 14)})
                        </span>
                      </React.Fragment>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Operation Log */}
          {activeTab === 'logs' && (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E5D9C5] rounded-lg border border-[#D6C7B2] bg-[#FBF7F0]">
              {logs.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#57534E]">
                  No operations logged yet. Interact with the editor or task scheduler above.
                </p>
              ) : (
                logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 text-xs bg-[#FFFDF9]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono font-semibold ${
                            entry.status === 'UNDERFLOW' || entry.status === 'INVALID'
                              ? 'text-[#BE123C]'
                              : entry.status === 'RESIZE'
                              ? 'text-[#4338CA]'
                              : entry.status === 'NOT_FOUND'
                              ? 'text-[#6D28D9]'
                              : 'text-[#0F766E]'
                          }`}
                        >
                          [{entry.status}]
                        </span>
                        <span className="font-semibold text-[#1E1B18]">{entry.structure}</span>
                        <span className="text-[#57534E]">· {entry.operation}</span>
                      </div>
                      <p className="text-[#57534E] mt-0.5">{entry.detail}</p>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-[#57534E] tabular-nums shrink-0">
                      <span className="text-[#4338CA] font-semibold">{entry.complexity}</span>
                      <span>{entry.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Complexity Table */}
          {activeTab === 'complexity' && (
            <div className="overflow-x-auto rounded-lg border border-[#D6C7B2] bg-[#FFFDF9]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5D9C5] bg-[#F4ECE0] text-[#57534E]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data Structure</th>
                    <th className="px-4 py-3 font-semibold">Workbench Role</th>
                    <th className="px-4 py-3 font-semibold">Access / Search</th>
                    <th className="px-4 py-3 font-semibold">Insert / Push</th>
                    <th className="px-4 py-3 font-semibold">Delete / Pop</th>
                    <th className="px-4 py-3 font-semibold">Space</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D9C5] text-[#1E1B18]">
                  {COMPLEXITY_ROWS.map((row) => (
                    <tr key={row.ds} className="hover:bg-[#FBF7F0]">
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{row.ds}</td>
                      <td className="px-4 py-2.5 text-[#57534E]">{row.role}</td>
                      <td className="px-4 py-2.5 font-mono text-[#4338CA] font-medium tabular-nums">{row.access}</td>
                      <td className="px-4 py-2.5 font-mono text-[#6D28D9] font-medium tabular-nums">{row.insert}</td>
                      <td className="px-4 py-2.5 font-mono text-[#BE123C] font-medium tabular-nums">{row.delete}</td>
                      <td className="px-4 py-2.5 font-mono text-[#0F766E] font-medium tabular-nums">{row.space}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
