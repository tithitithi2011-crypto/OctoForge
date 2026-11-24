import React, { useState } from 'react';
import {
  Plus,
  Play,
  Zap,
  Trash2,
  CheckCircle2,
  CalendarSearch,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { ActionButton } from './ActionButton';
import { DSBadge } from './DSBadge';
import { PriorityBadge } from './PriorityBadge';
import { PriorityLevel, TaskItem, TaskStatus } from '../dsa/types';

export type TaskViewMode = 'array' | 'fifo' | 'heap' | 'bst';

interface TaskSchedulerPanelProps {
  tasksInArray: TaskItem[];
  tasksInFifo: TaskItem[];
  tasksInHeap: TaskItem[];
  tasksInBst: TaskItem[];
  arrayCapacity: number;
  arrayLength: number;
  viewMode: TaskViewMode;
  importWaveKey: number;
  deletingTaskId: string | null;
  restoredTaskId: string | null;
  bstFilterDate: string | null;
  bstFilteredTasks: TaskItem[] | null;
  bstComparisons: number | null;
  onChangeViewMode: (mode: TaskViewMode) => void;
  onAddTask: (title: string, priority: PriorityLevel, deadline: string) => boolean;
  onProcessFIFO: () => void;
  onProcessMaxHeap: () => void;
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClearCompleted: () => void;
  onSearchBSTDate: (dateStr: string) => void;
  onResetBSTFilter: () => void;
  onInspectTree: (tab: 'maxHeap' | 'bst') => void;
}

function getDefaultDeadlineInput(): string {
  const now = new Date();
  now.setHours(now.getHours() + 4);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatReadableDeadline(isoLocal: string): string {
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return isoLocal;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TaskSchedulerPanel: React.FC<TaskSchedulerPanelProps> = ({
  tasksInArray,
  tasksInFifo,
  tasksInHeap,
  tasksInBst,
  arrayCapacity,
  arrayLength,
  viewMode,
  importWaveKey,
  deletingTaskId,
  restoredTaskId,
  bstFilterDate,
  bstFilteredTasks,
  bstComparisons,
  onChangeViewMode,
  onAddTask,
  onProcessFIFO,
  onProcessMaxHeap,
  onToggleTaskStatus,
  onDeleteTask,
  onClearCompleted,
  onSearchBSTDate,
  onResetBSTFilter,
  onInspectTree,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.HIGH);
  const [deadline, setDeadline] = useState(getDefaultDeadlineInput);
  const [searchDate, setSearchDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onAddTask(title, priority, deadline);
    if (ok) setTitle('');
  };

  let displayedTasks: TaskItem[] = [];
  if (bstFilteredTasks !== null) {
    displayedTasks = bstFilteredTasks;
  } else if (viewMode === 'array') {
    displayedTasks = tasksInArray;
  } else if (viewMode === 'fifo') {
    displayedTasks = tasksInFifo;
  } else if (viewMode === 'heap') {
    displayedTasks = tasksInHeap;
  } else {
    displayedTasks = tasksInBst;
  }

  const capacityPercent = Math.min(100, Math.round((arrayLength / Math.max(1, arrayCapacity)) * 100));
  const completedTasksCount = tasksInArray.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const completionPercent =
    tasksInArray.length > 0 ? Math.round((completedTasksCount / tasksInArray.length) * 100) : 0;

  return (
    <section
      id="task-scheduler"
      className="flex flex-col rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <div className="border-b border-[#E5D9C5] bg-[#F4ECE0] px-5 py-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Dynamic Array" accent="indigo" />
          <div className="text-xs text-[#57534E] tabular-nums">
            Slots: <strong className="text-[#4338CA]">{arrayLength} / {arrayCapacity}</strong>
          </div>
        </div>
        <h2 className="font-display text-lg font-bold text-[#1E1B18]">
          Task Scheduler &amp; Tree Manager
        </h2>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="border-b border-[#E5D9C5] px-5 py-4 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title (e.g., Balance BST deadline nodes)..."
          aria-label="New task title"
          className="w-full rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-3.5 py-2 text-sm text-[#1E1B18] placeholder-[#78716C] focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#4338CA]/20"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" role="group" aria-label="Task priority">
            <ActionButton
              size="sm"
              accent="rose"
              isActive={priority === PriorityLevel.HIGH}
              onClick={() => setPriority(PriorityLevel.HIGH)}
            >
              High
            </ActionButton>
            <ActionButton
              size="sm"
              accent="indigo"
              isActive={priority === PriorityLevel.MEDIUM}
              onClick={() => setPriority(PriorityLevel.MEDIUM)}
            >
              Medium
            </ActionButton>
            <ActionButton
              size="sm"
              accent="teal"
              isActive={priority === PriorityLevel.LOW}
              onClick={() => setPriority(PriorityLevel.LOW)}
            >
              Low
            </ActionButton>
          </div>

          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Task deadline"
            className="rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-3 py-1.5 text-xs text-[#1E1B18] tabular-nums focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#57534E]">Dynamic Array (`4 → 8 → 16`)</span>
              <span className="font-mono font-semibold text-[#4338CA] tabular-nums">
                {arrayLength} / {arrayCapacity} ({capacityPercent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E5D9C5] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4338CA] via-[#6D28D9] to-[#0F766E] transition-all duration-300"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#57534E]">Task Completion Progress</span>
              <span className="font-mono font-semibold text-[#0F766E] tabular-nums">
                {completedTasksCount} / {tasksInArray.length} ({completionPercent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E5D9C5] overflow-hidden">
              <div
                className="h-full bg-[#0F766E] transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        <ActionButton type="submit" accent="indigo" isActive className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </ActionButton>
      </form>

      {/* Queue (FIFO) & Tree 1 (Max-Heap) Controls */}
      <div className="border-b border-[#E5D9C5] bg-[#F7F1E5] px-5 py-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DSBadge label="Queue — FIFO" accent="violet" />
            <DSBadge label="Tree — Priority Queue / Max-Heap" accent="rose" />
          </div>
          <ActionButton size="sm" accent="rose" onClick={() => onInspectTree('maxHeap')}>
            <Eye className="w-3.5 h-3.5" />
            <span>Visualize Heap</span>
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton size="sm" accent="violet" onClick={onProcessFIFO}>
            <Play className="w-3.5 h-3.5" />
            <span>Process Queue ({tasksInFifo.length})</span>
          </ActionButton>

          <ActionButton size="sm" accent="rose" onClick={onProcessMaxHeap}>
            <Zap className="w-3.5 h-3.5" />
            <span>Extract Max-Heap ({tasksInHeap.length})</span>
          </ActionButton>
        </div>
      </div>

      {/* Tree 2: Deadline BST Search & Ordering Tabs */}
      <div className="border-b border-[#E5D9C5] px-5 py-3 space-y-2.5 bg-[#FFFDF9]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DSBadge label="Tree — Binary Search Tree (BST)" accent="teal" />
          <ActionButton size="sm" accent="teal" onClick={() => onInspectTree('bst')}>
            <Eye className="w-3.5 h-3.5" />
            <span>Visualize BST</span>
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            aria-label="Search tasks by deadline date in BST"
            className="rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-2.5 py-1.5 text-xs text-[#1E1B18] tabular-nums focus:border-[#0F766E] focus:bg-[#FFFDF9] focus:outline-none"
          />
          <ActionButton
            size="sm"
            accent="teal"
            isActive={bstFilteredTasks !== null}
            onClick={() => onSearchBSTDate(searchDate)}
          >
            <CalendarSearch className="w-3.5 h-3.5" />
            <span>Search Deadline</span>
          </ActionButton>
          {bstFilteredTasks !== null && (
            <ActionButton size="sm" accent="neutral" onClick={onResetBSTFilter}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </ActionButton>
          )}
          <ActionButton size="sm" accent="neutral" onClick={onClearCompleted} className="ml-auto">
            <span>Clear Done</span>
          </ActionButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1" role="tablist" aria-label="Task list ordering">
          <ActionButton
            size="sm"
            accent="indigo"
            role="tab"
            aria-selected={viewMode === 'array' && bstFilteredTasks === null}
            isActive={viewMode === 'array' && bstFilteredTasks === null}
            onClick={() => {
              onResetBSTFilter();
              onChangeViewMode('array');
            }}
          >
            Dynamic Array
          </ActionButton>
          <ActionButton
            size="sm"
            accent="violet"
            role="tab"
            aria-selected={viewMode === 'fifo' && bstFilteredTasks === null}
            isActive={viewMode === 'fifo' && bstFilteredTasks === null}
            onClick={() => {
              onResetBSTFilter();
              onChangeViewMode('fifo');
            }}
          >
            Queue (FIFO)
          </ActionButton>
          <ActionButton
            size="sm"
            accent="rose"
            role="tab"
            aria-selected={viewMode === 'heap' && bstFilteredTasks === null}
            isActive={viewMode === 'heap' && bstFilteredTasks === null}
            onClick={() => {
              onResetBSTFilter();
              onChangeViewMode('heap');
            }}
          >
            Max-Heap Tree
          </ActionButton>
          <ActionButton
            size="sm"
            accent="teal"
            role="tab"
            aria-selected={viewMode === 'bst' && bstFilteredTasks === null}
            isActive={viewMode === 'bst' && bstFilteredTasks === null}
            onClick={() => {
              onResetBSTFilter();
              onChangeViewMode('bst');
            }}
          >
            BST (Deadline)
          </ActionButton>
        </div>
      </div>

      {bstFilterDate && bstComparisons !== null && (
        <div className="animate-fade-slide-in border-b border-[#99F6E4] bg-[#F0FDFA] px-5 py-2 text-xs text-[#0F766E] tabular-nums font-medium">
          BST Deadline Query for <strong>{bstFilterDate}</strong> · {bstFilteredTasks?.length ?? 0} match(es) · {bstComparisons} tree comparison(s)
        </div>
      )}

      {/* Task Rows */}
      <div className="flex-1 min-h-[240px] max-h-[380px] overflow-y-auto divide-y divide-[#E5D9C5] bg-[#FFFDF9]">
        {displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="text-sm font-semibold text-[#1E1B18] mb-1">
              {bstFilteredTasks !== null
                ? `No tasks due on ${bstFilterDate}`
                : `No tasks in ${viewMode.toUpperCase()} view`}
            </p>
            <p className="text-xs text-[#57534E] max-w-xs">
              Add a task above to populate the Dynamic Array, FIFO Queue, Max-Heap Tree, and Deadline BST simultaneously.
            </p>
          </div>
        ) : (
          displayedTasks.map((task, idx) => {
            const isCompleted = task.status === TaskStatus.COMPLETED;
            const isDeleting = deletingTaskId === task.id;
            const isRestored = restoredTaskId === task.id;

            return (
              <div
                key={`${task.id}-${importWaveKey}`}
                style={{ animationDelay: `${Math.min(idx, 10) * 45}ms` }}
                className={`flex items-start justify-between gap-3 px-5 py-3 transition-all duration-200 ${
                  isDeleting
                    ? 'opacity-0 scale-95 -translate-x-2'
                    : isRestored
                    ? 'animate-restore-pop'
                    : 'animate-import-cascade'
                } ${isCompleted ? 'opacity-65' : 'hover:bg-[#F7F1E5]/75'}`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#57534E] tabular-nums">
                      #{idx + 1}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    <span
                      className={`text-sm font-semibold truncate ${
                        isCompleted ? 'line-through text-[#78716C]' : 'text-[#1E1B18]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] tabular-nums">
                    <span>Due {formatReadableDeadline(task.deadline)}</span>
                    <span aria-hidden="true">·</span>
                    <span className={isCompleted ? 'text-[#0F766E] font-medium' : 'text-[#1E1B18]'}>
                      {isCompleted ? 'Completed' : 'Pending'}
                    </span>
                    {viewMode === 'fifo' && idx === 0 && !isCompleted && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#6D28D9] font-mono font-semibold">QUEUE FRONT</span>
                      </>
                    )}
                    {viewMode === 'heap' && idx === 0 && !isCompleted && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#BE123C] font-mono font-semibold">MAX-HEAP ROOT</span>
                      </>
                    )}
                    {viewMode === 'bst' && idx === 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#0F766E] font-mono font-semibold">EARLIEST DEADLINE</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <ActionButton
                    size="sm"
                    accent={isCompleted ? 'neutral' : 'teal'}
                    isActive={isCompleted}
                    onClick={() => onToggleTaskStatus(task.id)}
                    title={isCompleted ? 'Reopen task as Pending' : 'Mark task completed'}
                    aria-label={isCompleted ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isCompleted ? 'Done' : 'Complete'}</span>
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    accent="rose"
                    onClick={() => onDeleteTask(task.id)}
                    title={`Delete ${task.title}`}
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </ActionButton>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
