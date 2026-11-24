import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  Download,
  FileText,
  History,
  Layers,
  Maximize2,
  Network,
  RotateCcw,
  RotateCw,
  SearchX,
  Trash2,
  Upload,
} from 'lucide-react';
import { DocumentLinkedList } from './dsa/DoublyLinkedList';
import { UndoStack, RedoStack } from './dsa/HistoryStacks';
import { AutocompleteTrie } from './dsa/Trie';
import { WordFrequencyHashTable, replaceWholeWordInLine, HashLookupResult } from './dsa/HashTable';
import { TaskDynamicArray } from './dsa/DynamicArray';
import { TaskFIFOQueue } from './dsa/FIFOQueue';
import { TaskMaxHeap, computeTaskHeapScore } from './dsa/MaxHeap';
import { TaskDeadlineBST } from './dsa/DeadlineBST';
import {
  DownloadExtension,
  ProjectLanguage,
  ProjectSnippet,
  ProjectStoreCollection,
  sanitizeFileSlug,
} from './dsa/ProjectStoreCollection';
import {
  AlertSeverity,
  DeletedTrashItem,
  EditorCommand,
  OperationLogEntry,
  PriorityLevel,
  StatusAlert,
  TaskItem,
  TaskStatus,
} from './dsa/types';
import { ButtonFlashProvider } from './context/ButtonFlashContext';
import { ActionButton } from './components/ActionButton';
import { DSBadge } from './components/DSBadge';
import { TextEditorPanel } from './components/TextEditorPanel';
import { TaskSchedulerPanel, TaskViewMode } from './components/TaskSchedulerPanel';
import { DataStructureInspector, InspectorTab } from './components/DataStructureInspector';
import { ProjectStorePanel } from './components/ProjectStorePanel';
import { HowItWorksModal } from './components/HowItWorksModal';
import { ImportModal } from './components/ImportModal';

const PROJECT_STORE_STORAGE_KEY = 'smart_dsa_project_store_v1';

const DEFAULT_NOTE_TITLE = 'Data Structures & Algorithms Workbench Notes';

const INITIAL_SAMPLE_LINES = [
  'Doubly Linked List stores every editor line with prev and next pointers.',
  'Undo and Redo Stacks push command frames for instant O(1) history traversal.',
  'Prefix Trie ranks word completions using manual DFS and insertion sort.',
  'Separate Chaining Hash Table indexes word frequency and line locations.',
  'Task Scheduler combines Dynamic Array, FIFO Queue, Max-Heap, and Deadline BST.',
];

function nowTimeStr(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function buildOffsetDeadline(hoursAhead: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function WorkbenchApp() {
  // Core 8 Manual Data Structures
  const dllRef = useRef<DocumentLinkedList>(new DocumentLinkedList());
  const undoStackRef = useRef<UndoStack>(new UndoStack());
  const redoStackRef = useRef<RedoStack>(new RedoStack());
  const trieRef = useRef<AutocompleteTrie>(new AutocompleteTrie());
  const hashTableRef = useRef<WordFrequencyHashTable>(new WordFrequencyHashTable(16));
  const dynamicArrayRef = useRef<TaskDynamicArray>(new TaskDynamicArray(4));
  const fifoQueueRef = useRef<TaskFIFOQueue>(new TaskFIFOQueue(8));
  const maxHeapRef = useRef<TaskMaxHeap>(new TaskMaxHeap());
  const deadlineBstRef = useRef<TaskDeadlineBST>(new TaskDeadlineBST());
  const projectStoreRef = useRef<ProjectStoreCollection>(new ProjectStoreCollection(4));

  const cmdIdCounter = useRef(1);
  const taskIdCounter = useRef(1);
  const projectIdCounter = useRef(1);
  const logIdCounter = useRef(1);
  const trashIdCounter = useRef(1);

  const [, setRevision] = useState(0);
  const [activeSector, setActiveSector] = useState<'workbench' | 'projectStore'>('workbench');
  const [noteTitle, setNoteTitle] = useState<string>(DEFAULT_NOTE_TITLE);
  const [selectedLineNumber, setSelectedLineNumber] = useState<number>(1);
  const [searchResult, setSearchResult] = useState<HashLookupResult | null>(null);
  const [trashItems, setTrashItems] = useState<DeletedTrashItem[]>([]);
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('array');
  const [bstFilterDate, setBstFilterDate] = useState<string | null>(null);
  const [bstFilteredTasks, setBstFilteredTasks] = useState<TaskItem[] | null>(null);
  const [bstComparisons, setBstComparisons] = useState<number | null>(null);
  const [bstHighlightedIds, setBstHighlightedIds] = useState<string[]>([]);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('dynamicArray');
  const [inspectorExpanded, setInspectorExpanded] = useState<boolean>(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Motion & Feedback States
  const [importWaveKey, setImportWaveKey] = useState<number>(1);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [restoredLineNumber, setRestoredLineNumber] = useState<number | null>(null);
  const [restoredTaskId, setRestoredTaskId] = useState<string | null>(null);
  const [restoredProjectId, setRestoredProjectId] = useState<string | null>(null);

  const [alert, setAlert] = useState<StatusAlert>({
    id: 'init',
    severity: 'NOMINAL',
    structure: 'Workbench',
    title: 'All 8 Data Structures Initialized',
    message:
      'Dynamic Array starts at 4/4 capacity. Add 1 task to trigger capacity doubling (4 → 8). Delete any item to test Withdraw Delete.',
    complexity: 'Ready',
    timestamp: nowTimeStr(),
  });
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);

  const bump = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const recordOperation = useCallback(
    (
      severity: AlertSeverity,
      structure: string,
      operation: string,
      detail: string,
      complexity: string
    ) => {
      const ts = nowTimeStr();
      const logId = `log-${logIdCounter.current}`;
      logIdCounter.current += 1;

      setAlert({
        id: logId,
        severity,
        structure,
        title: `${structure} · ${operation}`,
        message: detail,
        complexity,
        timestamp: ts,
      });

      setLogs((prev) => {
        const next: OperationLogEntry[] = [
          {
            id: logId,
            structure,
            operation,
            detail,
            complexity,
            status: severity,
            timestamp: ts,
          },
          ...prev,
        ];
        return next.length > 60 ? next.slice(0, 60) : next;
      });
    },
    []
  );

  const rebuildEditorIndexes = useCallback(() => {
    const lines = dllRef.current.toTextArray();
    trieRef.current.rebuildFromLines(lines, true);
    hashTableRef.current.rebuildFromLines(lines);
  }, []);

  const populateSampleWorkbench = useCallback(() => {
    setNoteTitle(DEFAULT_NOTE_TITLE);
    dllRef.current.replaceLinesFromArray(INITIAL_SAMPLE_LINES);
    undoStackRef.current.clear();
    redoStackRef.current.clear();
    rebuildEditorIndexes();
    setSelectedLineNumber(1);
    setSearchResult(null);
    setTrashItems([]);

    dynamicArrayRef.current.clear();
    fifoQueueRef.current.clear();
    maxHeapRef.current.clear();
    deadlineBstRef.current.clear();

    const seedTasks: { title: string; priority: PriorityLevel; offsetHours: number }[] = [
      { title: 'Audit Doubly Linked List pointer integrity', priority: PriorityLevel.HIGH, offsetHours: 2 },
      { title: 'Verify Max-Heap sinkDown edge cases', priority: PriorityLevel.HIGH, offsetHours: 5 },
      { title: 'Benchmark Hash Table bucket load factor', priority: PriorityLevel.MEDIUM, offsetHours: 10 },
      { title: 'Document BST In-Order deadline traversal', priority: PriorityLevel.LOW, offsetHours: 26 },
    ];

    seedTasks.forEach((seed) => {
      const deadline = buildOffsetDeadline(seed.offsetHours);
      const deadlineTimestamp = new Date(deadline).getTime();
      const id = `task-${taskIdCounter.current}`;
      taskIdCounter.current += 1;
      const task: TaskItem = {
        id,
        title: seed.title,
        priority: seed.priority,
        deadline,
        deadlineTimestamp,
        status: TaskStatus.PENDING,
        createdAt: Date.now() + taskIdCounter.current,
        heapScore: computeTaskHeapScore(seed.priority, deadlineTimestamp),
      };
      dynamicArrayRef.current.push(task);
      fifoQueueRef.current.enqueue(task);
      maxHeapRef.current.insert(task);
      deadlineBstRef.current.insert(task);
    });

    setBstFilterDate(null);
    setBstFilteredTasks(null);
    setBstComparisons(null);
    setBstHighlightedIds([]);
    setImportWaveKey((k) => k + 1);
    bump();
  }, [bump, rebuildEditorIndexes]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const savedRaw = window.localStorage.getItem(PROJECT_STORE_STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) {
          const validProjects: ProjectSnippet[] = [];
          for (let i = 0; i < parsed.length; i += 1) {
            const p = parsed[i] as Partial<ProjectSnippet>;
            if (typeof p.id === 'string' && typeof p.title === 'string' && typeof p.code === 'string') {
              validProjects[validProjects.length] = {
                id: p.id,
                title: p.title,
                code: p.code,
                languages: Array.isArray(p.languages) ? (p.languages as ProjectLanguage[]) : [],
                matchedSignals: p.matchedSignals ?? { 'C++': [], C: [], Python: [], Java: [] },
                isManualOverride: Boolean(p.isManualOverride),
                createdAt: typeof p.createdAt === 'string' ? p.createdAt : nowTimeStr(),
                updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : nowTimeStr(),
              };
            }
          }
          projectStoreRef.current.replaceAll(validProjects);
          projectIdCounter.current = validProjects.length + 1;
        }
      }
    } catch {
      // Ignore storage read errors in restricted iframe environments
    }
    populateSampleWorkbench();
  }, [populateSampleWorkbench]);

  const handleLoadSampleData = () => {
    populateSampleWorkbench();
    setImportSummary('Loaded sample workbench: 5 DLL lines and 4 scheduled tasks (4/4 Dynamic Array slots).');
    recordOperation(
      'NOMINAL',
      'Workbench',
      'Sample Data Loaded',
      'Cascade-loaded Note Title, 5 DLL lines (Trie + Hash Table), and 4 tasks (Dynamic Array, Queue, Max-Heap, BST).',
      'O(n log n)'
    );
  };

  const handleClearAll = () => {
    setNoteTitle('Untitled Notes');
    dllRef.current.clear();
    undoStackRef.current.clear();
    redoStackRef.current.clear();
    rebuildEditorIndexes();
    setSelectedLineNumber(0);
    setSearchResult(null);
    setTrashItems([]);
    setImportSummary(null);

    dynamicArrayRef.current.clear();
    fifoQueueRef.current.clear();
    maxHeapRef.current.clear();
    deadlineBstRef.current.clear();
    setBstFilterDate(null);
    setBstFilteredTasks(null);
    setBstComparisons(null);
    setBstHighlightedIds([]);

    recordOperation(
      'NOMINAL',
      'Workbench',
      'Cleared All Structures',
      'Reset Note Title, Doubly Linked List, Stacks, Hash Table, Dynamic Array, Queue, Max-Heap, and BST.',
      'O(n)'
    );
    bump();
  };

  // Import & Export Handlers
  const handleImportText = (rawText: string, sourceName: string) => {
    const rawLines = rawText.split(/\r?\n/);
    const cleanLines: string[] = [];
    for (let i = 0; i < rawLines.length; i += 1) {
      const trimmed = rawLines[i].trim();
      if (trimmed.length > 0) {
        cleanLines[cleanLines.length] = trimmed;
      }
    }
    if (cleanLines.length === 0) {
      recordOperation('INVALID', 'Import TXT', 'Empty Content', 'No non-empty lines found to import.', 'O(1)');
      return;
    }

    dllRef.current.replaceLinesFromArray(cleanLines);
    undoStackRef.current.clear();
    redoStackRef.current.clear();
    rebuildEditorIndexes();
    setSelectedLineNumber(1);
    setSearchResult(null);
    setImportWaveKey((k) => k + 1);
    setImportSummary(`Imported ${cleanLines.length} line(s) from "${sourceName}" into Doubly Linked List, Trie, and Hash Table.`);
    recordOperation(
      'NOMINAL',
      'Import TXT',
      'Cascade Import Complete',
      `Imported ${cleanLines.length} line(s) from ${sourceName} and rebuilt Trie & Hash Table.`,
      'O(n)'
    );
    bump();
  };

  const handleImportJson = (rawJson: string, sourceName: string) => {
    try {
      const parsed = JSON.parse(rawJson) as {
        noteTitle?: unknown;
        lines?: unknown;
        tasks?: unknown;
      };

      let importedLinesCount = 0;
      let importedTasksCount = 0;

      if (typeof parsed.noteTitle === 'string' && parsed.noteTitle.trim().length > 0) {
        setNoteTitle(parsed.noteTitle.trim());
      }

      if (Array.isArray(parsed.lines)) {
        const cleanLines: string[] = [];
        for (let i = 0; i < parsed.lines.length; i += 1) {
          if (typeof parsed.lines[i] === 'string' && parsed.lines[i].trim().length > 0) {
            cleanLines[cleanLines.length] = parsed.lines[i].trim();
          }
        }
        dllRef.current.replaceLinesFromArray(cleanLines);
        undoStackRef.current.clear();
        redoStackRef.current.clear();
        rebuildEditorIndexes();
        setSelectedLineNumber(cleanLines.length > 0 ? 1 : 0);
        importedLinesCount = cleanLines.length;
      }

      if (Array.isArray(parsed.tasks)) {
        dynamicArrayRef.current.clear();
        fifoQueueRef.current.clear();
        maxHeapRef.current.clear();
        deadlineBstRef.current.clear();

        for (let i = 0; i < parsed.tasks.length; i += 1) {
          const item = parsed.tasks[i] as Partial<TaskItem>;
          if (typeof item.title === 'string' && item.title.trim().length > 0) {
            const priority =
              item.priority === PriorityLevel.HIGH ||
              item.priority === PriorityLevel.MEDIUM ||
              item.priority === PriorityLevel.LOW
                ? item.priority
                : PriorityLevel.MEDIUM;
            const deadline =
              typeof item.deadline === 'string' && !Number.isNaN(new Date(item.deadline).getTime())
                ? item.deadline
                : buildOffsetDeadline(4 + i);
            const deadlineTimestamp = new Date(deadline).getTime();
            const status =
              item.status === TaskStatus.COMPLETED ? TaskStatus.COMPLETED : TaskStatus.PENDING;

            const id = `task-${taskIdCounter.current}`;
            taskIdCounter.current += 1;
            const task: TaskItem = {
              id,
              title: item.title.trim(),
              priority,
              deadline,
              deadlineTimestamp,
              status,
              createdAt: Date.now() + i,
              heapScore: computeTaskHeapScore(priority, deadlineTimestamp),
            };
            dynamicArrayRef.current.push(task);
            if (status === TaskStatus.PENDING) {
              fifoQueueRef.current.enqueue(task);
              maxHeapRef.current.insert(task);
            }
            deadlineBstRef.current.insert(task);
            importedTasksCount += 1;
          }
        }
      }

      if (importedLinesCount === 0 && importedTasksCount === 0) {
        recordOperation('INVALID', 'Import JSON', 'No Valid Data', 'JSON did not contain valid lines or tasks.', 'O(1)');
        return;
      }

      setSearchResult(null);
      setBstFilterDate(null);
      setBstFilteredTasks(null);
      setBstComparisons(null);
      setImportWaveKey((k) => k + 1);
      setImportSummary(
        `Imported ${importedLinesCount} line(s) and ${importedTasksCount} task(s) from "${sourceName}".`
      );
      recordOperation(
        'NOMINAL',
        'Import JSON',
        'Workbench Imported',
        `Imported ${importedLinesCount} lines and ${importedTasksCount} tasks across all 8 data structures.`,
        'O(n log n)'
      );
      bump();
    } catch {
      recordOperation('INVALID', 'Import JSON', 'Parse Error', 'Invalid JSON format. Check brackets and quotes.', 'O(1)');
    }
  };

  const handleExportTxt = () => {
    const lines = dllRef.current.toTextArray();
    const content = `${noteTitle}\n${'='.repeat(noteTitle.length)}\n\n${lines.join('\n')}\n`;
    triggerFileDownload('workbench-notes.txt', content, 'text/plain;charset=utf-8');
    recordOperation(
      'NOMINAL',
      'Export TXT',
      'Exported Document',
      `Exported "${noteTitle}" (${lines.length} lines) as workbench-notes.txt.`,
      'O(n)'
    );
  };

  const handleExportJson = () => {
    const payload = {
      noteTitle,
      exportedAt: new Date().toISOString(),
      lines: dllRef.current.toTextArray(),
      tasks: dynamicArrayRef.current.toArray(),
    };
    triggerFileDownload(
      'workbench-snapshot.json',
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
    recordOperation(
      'NOMINAL',
      'Export JSON',
      'Exported Snapshot',
      `Exported ${payload.lines.length} lines and ${payload.tasks.length} tasks as workbench-snapshot.json.`,
      'O(n)'
    );
  };

  const handleExportReport = () => {
    const lines = dllRef.current.toTextArray();
    const tasks = dynamicArrayRef.current.toArray();
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const trieS = trieRef.current.getStats();
    const hashS = hashTableRef.current.getStats();

    const reportLines = [
      'Smart Undo-Redo Text Editor with Task Scheduler — Complexity & DS Summary Report',
      '===============================================================================',
      `Generated: ${new Date().toISOString()}`,
      `Document Title: ${noteTitle}`,
      '',
      '1. Live Data Structure Metrics',
      '------------------------------',
      `- Doubly Linked List: ${lines.length} line node(s)`,
      `- Two Stacks (Undo / Redo): ${undoStackRef.current.size} undo frame(s) / ${redoStackRef.current.size} redo frame(s)`,
      `- Trie (Prefix Tree): ${trieS.totalWords} unique words across ${trieS.totalNodes} trie nodes`,
      `- Hash Table (Chaining): ${hashS.uniqueKeys} indexed keys (${hashS.totalOccurrences} occurrences, load ${hashS.loadFactor.toFixed(2)}, ${hashS.collisions} collision(s))`,
      `- Dynamic Array: ${dynamicArrayRef.current.length} / ${dynamicArrayRef.current.capacity} slots`,
      `- Queue (FIFO): ${fifoQueueRef.current.size} pending task(s)`,
      `- Priority Queue / Max-Heap Tree: ${maxHeapRef.current.size} pending task(s)`,
      `- Deadline BST: ${deadlineBstRef.current.size} total task(s) (${completed} completed)`,
      '',
      '2. Time & Space Complexity Reference',
      '------------------------------------',
      'Doubly Linked List       | Access O(n)    | Insert O(1) end / O(n) | Delete O(n)     | Space O(n)',
      'Two Stacks (Undo & Redo) | Peek O(1)      | Push O(1)              | Pop O(1)        | Space O(h)',
      'Trie (Prefix Tree)       | Search O(L)    | Insert O(L)            | Delete O(L)     | Space O(N*A)',
      'Hash Table (Chaining)    | Search O(1)avg | Insert O(1)avg         | Delete O(1)avg  | Space O(n+B)',
      'Dynamic Array (Doubling) | Access O(1)    | Push O(1) amortized    | Remove O(n)     | Space O(c)',
      'Queue (FIFO Circular)    | Front O(1)     | Enqueue O(1) amort.    | Dequeue O(1)    | Space O(c)',
      'Max-Heap Tree            | PeekMax O(1)   | Insert O(log n)        | Extract O(logn) | Space O(n)',
      'Deadline BST             | Search O(logn) | Insert O(log n) avg    | Delete O(logn)  | Space O(n)',
      '',
      '3. Recent Operations Log (Latest 15)',
      '------------------------------------',
      ...logs.slice(0, 15).map((l) => `[${l.timestamp}] [${l.status}] ${l.structure} · ${l.operation} (${l.complexity}): ${l.detail}`),
      '',
    ];

    triggerFileDownload('dsa-summary-report.txt', reportLines.join('\n'), 'text/plain;charset=utf-8');
    recordOperation(
      'NOMINAL',
      'DS Summary Report',
      'Report Downloaded',
      'Downloaded Complexity & Data Structure Summary report (dsa-summary-report.txt).',
      'O(n)'
    );
  };

  const pushUndoCommand = (cmd: Omit<EditorCommand, 'id' | 'timestamp'>) => {
    const id = `cmd-${cmdIdCounter.current}`;
    cmdIdCounter.current += 1;
    undoStackRef.current.push({
      ...cmd,
      id,
      timestamp: nowTimeStr(),
    });
    redoStackRef.current.clear();
  };

  // Note Title Editing
  const handleUpdateNoteTitle = (rawNewTitle: string) => {
    const trimmed = rawNewTitle.trim();
    if (trimmed.length === 0) {
      recordOperation('INVALID', 'Two Stacks (Undo/Redo)', 'Invalid Title', 'Note title cannot be empty.', 'O(1)');
      return;
    }
    if (trimmed === noteTitle) {
      recordOperation('NOMINAL', 'Note Title', 'Unchanged', 'Note title remained unchanged.', 'O(1)');
      return;
    }

    const prevTitle = noteTitle;
    setNoteTitle(trimmed);
    pushUndoCommand({
      type: 'UPDATE_TITLE',
      lineNumber: 0,
      prevTitle,
      nextTitle: trimmed,
      description: `Renamed title: "${prevTitle.slice(0, 20)}" → "${trimmed.slice(0, 20)}"`,
    });
    recordOperation(
      'NOMINAL',
      'Two Stacks (Undo/Redo)',
      'Title Updated',
      `Updated Note Title to "${trimmed}" and pushed UPDATE_TITLE frame onto UndoStack.`,
      'O(1)'
    );
    bump();
  };

  // Editor Handlers
  const handleSelectLine = (lineNumber: number) => {
    setSelectedLineNumber(lineNumber);
  };

  const handlePrevLine = () => {
    if (dllRef.current.isEmpty()) {
      recordOperation('UNDERFLOW', 'Doubly Linked List', 'Prev Traversal', 'Document is empty; no previous node.', 'O(1)');
      return;
    }
    const prevNode = dllRef.current.movePrev(selectedLineNumber);
    if (prevNode === null) {
      recordOperation('NOMINAL', 'Doubly Linked List', 'At HEAD', `Line ${selectedLineNumber} is already the HEAD node (prev = null).`, 'O(1)');
      return;
    }
    setSelectedLineNumber(prevNode.lineNumber);
    recordOperation('NOMINAL', 'Doubly Linked List', 'Move Prev', `Traversed backward to Line ${prevNode.lineNumber} via node.prev.`, 'O(1)');
  };

  const handleNextLine = () => {
    if (dllRef.current.isEmpty()) {
      recordOperation('UNDERFLOW', 'Doubly Linked List', 'Next Traversal', 'Document is empty; no next node.', 'O(1)');
      return;
    }
    const nextNode = dllRef.current.moveNext(selectedLineNumber);
    if (nextNode === null) {
      recordOperation('NOMINAL', 'Doubly Linked List', 'At TAIL', `Line ${selectedLineNumber} is already the TAIL node (next = null).`, 'O(1)');
      return;
    }
    setSelectedLineNumber(nextNode.lineNumber);
    recordOperation('NOMINAL', 'Doubly Linked List', 'Move Next', `Traversed forward to Line ${nextNode.lineNumber} via node.next.`, 'O(1)');
  };

  const handleMoveLineUp = (lineNumber: number) => {
    if (dllRef.current.isEmpty() || lineNumber <= 1) {
      recordOperation('UNDERFLOW', 'Doubly Linked List', 'Cannot Move Up', 'Select Line 2 or higher to swap upward via prev/next pointers.', 'O(1)');
      return;
    }
    const res = dllRef.current.swapWithPrev(lineNumber);
    if (!res.ok) return;

    pushUndoCommand({
      type: 'MOVE_LINE',
      lineNumber,
      targetLineNumber: res.newLineNumber,
      description: `Moved Line ${lineNumber} → Line ${res.newLineNumber}`,
    });
    setSelectedLineNumber(res.newLineNumber);
    setSearchResult(null);
    recordOperation(
      'NOMINAL',
      'Doubly Linked List',
      'Swapped Node Up',
      `Rewired prev/next pointers to move Line ${lineNumber} up to Line ${res.newLineNumber}.`,
      'O(n)'
    );
    bump();
  };

  const handleMoveLineDown = (lineNumber: number) => {
    if (dllRef.current.isEmpty() || lineNumber >= dllRef.current.length) {
      recordOperation('UNDERFLOW', 'Doubly Linked List', 'Cannot Move Down', 'Selected node is already at TAIL (next = null).', 'O(1)');
      return;
    }
    const res = dllRef.current.swapWithNext(lineNumber);
    if (!res.ok) return;

    pushUndoCommand({
      type: 'MOVE_LINE',
      lineNumber,
      targetLineNumber: res.newLineNumber,
      description: `Moved Line ${lineNumber} → Line ${res.newLineNumber}`,
    });
    setSelectedLineNumber(res.newLineNumber);
    setSearchResult(null);
    recordOperation(
      'NOMINAL',
      'Doubly Linked List',
      'Swapped Node Down',
      `Rewired prev/next pointers to move Line ${lineNumber} down to Line ${res.newLineNumber}.`,
      'O(n)'
    );
    bump();
  };

  const handleInsertLine = (rawText: string, position: 'end' | 'above') => {
    const text = rawText.trim();
    if (text.length === 0) {
      recordOperation('INVALID', 'Doubly Linked List', 'Invalid Input', 'Cannot insert an empty document line.', 'O(1)');
      return;
    }

    const insertedNode =
      position === 'above' && !dllRef.current.isEmpty()
        ? dllRef.current.insertAt(selectedLineNumber, text)
        : dllRef.current.insertAtEnd(text);

    pushUndoCommand({
      type: 'INSERT_LINE',
      lineNumber: insertedNode.lineNumber,
      nextText: text,
      description: `Inserted Line ${insertedNode.lineNumber}: "${text.slice(0, 32)}${text.length > 32 ? '…' : ''}"`,
    });

    rebuildEditorIndexes();
    setSelectedLineNumber(insertedNode.lineNumber);
    setSearchResult(null);
    recordOperation(
      'NOMINAL',
      'Doubly Linked List',
      'Insert Line',
      `Inserted Line ${insertedNode.lineNumber} and pushed frame onto UndoStack.`,
      position === 'end' ? 'O(1)' : 'O(n)'
    );
    bump();
  };

  const handleUpdateLine = (lineNumber: number, rawNewText: string) => {
    const newText = rawNewText.trim();
    if (newText.length === 0) {
      recordOperation('INVALID', 'Doubly Linked List', 'Invalid Input', 'Updated line cannot be empty. Click Trash to delete it.', 'O(1)');
      return;
    }

    const res = dllRef.current.updateLine(lineNumber, newText);
    if (!res.ok || res.prevText === undefined) {
      recordOperation('NOT_FOUND', 'Doubly Linked List', 'Line Missing', `Line ${lineNumber} does not exist.`, 'O(n)');
      return;
    }

    if (res.prevText === newText) {
      recordOperation('NOMINAL', 'Doubly Linked List', 'No Changes', `Line ${lineNumber} content unchanged.`, 'O(1)');
      return;
    }

    pushUndoCommand({
      type: 'UPDATE_LINE',
      lineNumber,
      prevText: res.prevText,
      nextText: newText,
      description: `Updated Line ${lineNumber}: "${newText.slice(0, 32)}${newText.length > 32 ? '…' : ''}"`,
    });

    rebuildEditorIndexes();
    setSearchResult(null);
    recordOperation('NOMINAL', 'Doubly Linked List', 'Update Line', `Updated Line ${lineNumber} and pushed frame onto UndoStack.`, 'O(n)');
    bump();
  };

  // Delete Line with 200ms smooth shrink/fade animation before committing to Trash
  const handleDeleteLine = (lineNumber: number, nodeId: string) => {
    if (dllRef.current.isEmpty()) {
      recordOperation('UNDERFLOW', 'Doubly Linked List', 'Delete Underflow', 'Document Doubly Linked List is already empty.', 'O(1)');
      return;
    }
    setDeletingLineId(nodeId);
    window.setTimeout(() => {
      const res = dllRef.current.deleteLine(lineNumber);
      setDeletingLineId(null);
      if (!res.ok || res.deletedText === undefined) {
        recordOperation('NOT_FOUND', 'Doubly Linked List', 'Line Not Found', `Line ${lineNumber} could not be deleted.`, 'O(n)');
        return;
      }

      const trashEntry: DeletedTrashItem = {
        id: `trash-${trashIdCounter.current}`,
        kind: 'line',
        label: `Line ${lineNumber}: ${res.deletedText}`,
        lineNumber,
        lineText: res.deletedText,
        deletedAt: nowTimeStr(),
      };
      trashIdCounter.current += 1;
      setTrashItems((prev) => [trashEntry, ...prev]);

      pushUndoCommand({
        type: 'DELETE_LINE',
        lineNumber,
        prevText: res.deletedText,
        description: `Deleted Line ${lineNumber}: "${res.deletedText.slice(0, 32)}${res.deletedText.length > 32 ? '…' : ''}"`,
      });

      rebuildEditorIndexes();
      setSelectedLineNumber(res.nextFocusLine);
      setSearchResult(null);
      recordOperation(
        'NOMINAL',
        'Doubly Linked List',
        'Deleted to Trash',
        `Deleted Line ${lineNumber}. Click "Withdraw Delete" to restore it immediately.`,
        'O(n)'
      );
      bump();
    }, 180);
  };

  const handleUndo = () => {
    const popRes = undoStackRef.current.pop();
    if (!popRes.ok || !popRes.value) {
      recordOperation('UNDERFLOW', 'UndoStack', 'Stack Underflow', 'UndoStack is empty — no edits left to undo.', 'O(1)');
      return;
    }

    const cmd = popRes.value;
    if (cmd.type === 'UPDATE_TITLE' && cmd.prevTitle !== undefined) {
      setNoteTitle(cmd.prevTitle);
    } else if (cmd.type === 'INSERT_LINE') {
      const del = dllRef.current.deleteLine(cmd.lineNumber);
      setSelectedLineNumber(del.nextFocusLine);
    } else if (cmd.type === 'DELETE_LINE' && cmd.prevText !== undefined) {
      const restored = dllRef.current.insertAt(cmd.lineNumber, cmd.prevText);
      setSelectedLineNumber(restored.lineNumber);
      setRestoredLineNumber(restored.lineNumber);
      window.setTimeout(() => setRestoredLineNumber(null), 700);
    } else if (cmd.type === 'UPDATE_LINE' && cmd.prevText !== undefined) {
      dllRef.current.updateLine(cmd.lineNumber, cmd.prevText);
      setSelectedLineNumber(cmd.lineNumber);
    } else if (cmd.type === 'REPLACE_WORD' && cmd.prevSnapshot !== undefined) {
      dllRef.current.replaceLinesFromArray(cmd.prevSnapshot);
      setSelectedLineNumber(dllRef.current.length > 0 ? 1 : 0);
    } else if (cmd.type === 'MOVE_LINE' && cmd.targetLineNumber !== undefined) {
      if (cmd.targetLineNumber < cmd.lineNumber) {
        dllRef.current.swapWithNext(cmd.targetLineNumber);
      } else {
        dllRef.current.swapWithPrev(cmd.targetLineNumber);
      }
      setSelectedLineNumber(cmd.lineNumber);
    }

    redoStackRef.current.push(cmd);
    rebuildEditorIndexes();
    setSearchResult(null);
    recordOperation('NOMINAL', 'Two Stacks (Undo/Redo)', 'Undo Pop', `Reverted [${cmd.type}] and pushed frame onto RedoStack.`, 'O(1)');
    bump();
  };

  const handleRedo = () => {
    const popRes = redoStackRef.current.pop();
    if (!popRes.ok || !popRes.value) {
      recordOperation('UNDERFLOW', 'RedoStack', 'Stack Underflow', 'RedoStack is empty — nothing to redo.', 'O(1)');
      return;
    }

    const cmd = popRes.value;
    if (cmd.type === 'UPDATE_TITLE' && cmd.nextTitle !== undefined) {
      setNoteTitle(cmd.nextTitle);
    } else if (cmd.type === 'INSERT_LINE' && cmd.nextText !== undefined) {
      const inserted = dllRef.current.insertAt(cmd.lineNumber, cmd.nextText);
      setSelectedLineNumber(inserted.lineNumber);
    } else if (cmd.type === 'DELETE_LINE') {
      const del = dllRef.current.deleteLine(cmd.lineNumber);
      setSelectedLineNumber(del.nextFocusLine);
    } else if (cmd.type === 'UPDATE_LINE' && cmd.nextText !== undefined) {
      dllRef.current.updateLine(cmd.lineNumber, cmd.nextText);
      setSelectedLineNumber(cmd.lineNumber);
    } else if (cmd.type === 'REPLACE_WORD' && cmd.nextSnapshot !== undefined) {
      dllRef.current.replaceLinesFromArray(cmd.nextSnapshot);
      setSelectedLineNumber(dllRef.current.length > 0 ? 1 : 0);
    } else if (cmd.type === 'MOVE_LINE' && cmd.targetLineNumber !== undefined) {
      if (cmd.targetLineNumber < cmd.lineNumber) {
        dllRef.current.swapWithPrev(cmd.lineNumber);
      } else {
        dllRef.current.swapWithNext(cmd.lineNumber);
      }
      setSelectedLineNumber(cmd.targetLineNumber);
    }

    undoStackRef.current.push(cmd);
    rebuildEditorIndexes();
    setSearchResult(null);
    recordOperation('NOMINAL', 'Two Stacks (Undo/Redo)', 'Redo Pop', `Reapplied [${cmd.type}] and pushed frame back onto UndoStack.`, 'O(1)');
    bump();
  };

  const restoreTrashItem = (item: DeletedTrashItem) => {
    setTrashItems((prev) => prev.filter((t) => t.id !== item.id));

    if (item.kind === 'line' && item.lineText !== undefined) {
      const targetPos = item.lineNumber ?? dllRef.current.length + 1;
      const restoredNode = dllRef.current.insertAt(targetPos, item.lineText);
      pushUndoCommand({
        type: 'INSERT_LINE',
        lineNumber: restoredNode.lineNumber,
        nextText: item.lineText,
        description: `Withdrew delete (Line ${restoredNode.lineNumber})`,
      });
      rebuildEditorIndexes();
      setSelectedLineNumber(restoredNode.lineNumber);
      setRestoredLineNumber(restoredNode.lineNumber);
      window.setTimeout(() => setRestoredLineNumber(null), 700);

      recordOperation(
        'NOMINAL',
        'Doubly Linked List',
        'Delete Withdrawn (Restored)',
        `Restored "${item.lineText.slice(0, 36)}" back into Line ${restoredNode.lineNumber}.`,
        'O(n)'
      );
      bump();
      return;
    }

    if (item.kind === 'task' && item.task) {
      const t = item.task;
      const arrayRes = dynamicArrayRef.current.push(t);
      if (t.status === TaskStatus.PENDING) {
        fifoQueueRef.current.enqueue(t);
        maxHeapRef.current.insert(t);
      }
      deadlineBstRef.current.insert(t);
      setRestoredTaskId(t.id);
      window.setTimeout(() => setRestoredTaskId(null), 700);

      recordOperation(
        arrayRes.resized ? 'RESIZE' : 'NOMINAL',
        'Task Scheduler',
        'Task Restored',
        `Withdrew delete and restored task "${t.title}" into Dynamic Array, Queue, Max-Heap, and BST.`,
        'O(log n)'
      );
      bump();
      return;
    }

    if (item.kind === 'project' && item.project) {
      const proj = item.project;
      const res = projectStoreRef.current.pushOrUpdate(proj);
      try {
        window.localStorage.setItem(
          PROJECT_STORE_STORAGE_KEY,
          JSON.stringify(projectStoreRef.current.toArray())
        );
      } catch {
        // Ignore storage errors
      }
      setRestoredProjectId(proj.id);
      window.setTimeout(() => setRestoredProjectId(null), 700);
      recordOperation(
        res.resized ? 'RESIZE' : 'NOMINAL',
        'Project Store',
        'Project Restored',
        `Withdrew delete and restored project "${proj.title}" into Project Store.`,
        'O(n)'
      );
      bump();
    }
  };

  const handleWithdrawLastDelete = () => {
    if (trashItems.length === 0) {
      recordOperation('UNDERFLOW', 'Trash / Restore', 'Nothing to Withdraw', 'Recently Deleted Trash is empty — delete a line or task first.', 'O(1)');
      return;
    }
    restoreTrashItem(trashItems[0]);
  };

  const handleSearchWord = (rawWord: string) => {
    const clean = hashTableRef.current.normalizeKey(rawWord);
    if (clean.length === 0) {
      recordOperation('INVALID', 'Hash Table', 'Invalid Query', 'Enter a valid alphanumeric word to search.', 'O(1)');
      return;
    }

    const lookup = hashTableRef.current.get(clean);
    setSearchResult(lookup);
    if (lookup.found) {
      recordOperation(
        'NOMINAL',
        'Hash Table',
        'Word Lookup',
        `Found "${lookup.key}" (${lookup.count}x) in Bucket #${lookup.bucketIndex} after ${lookup.probeSteps} probe(s).`,
        'O(1) avg'
      );
    } else {
      recordOperation(
        'NOT_FOUND',
        'Hash Table',
        'Unsuccessful Search',
        `Word "${lookup.key}" does not exist in Bucket #${lookup.bucketIndex}.`,
        'O(1) avg'
      );
    }
  };

  const handleReplaceWord = (rawFind: string, rawReplace: string) => {
    const findClean = hashTableRef.current.normalizeKey(rawFind);
    const replaceClean = rawReplace.trim();
    if (findClean.length === 0 || replaceClean.length === 0) {
      recordOperation('INVALID', 'Hash Table + DLL', 'Invalid Replace', 'Provide both a search word and a non-empty replacement word.', 'O(1)');
      return;
    }

    const lookup = hashTableRef.current.get(findClean);
    if (!lookup.found) {
      setSearchResult(lookup);
      recordOperation('NOT_FOUND', 'Hash Table', 'Unsuccessful Replace', `Word "${findClean}" not found in document.`, 'O(1) avg');
      return;
    }

    const prevLines = dllRef.current.toTextArray();
    const nextLines: string[] = [];
    let totalReplacements = 0;

    for (let i = 0; i < prevLines.length; i += 1) {
      const { updatedLine, replacements } = replaceWholeWordInLine(prevLines[i], findClean, replaceClean);
      nextLines[i] = updatedLine;
      totalReplacements += replacements;
    }

    if (totalReplacements === 0) {
      recordOperation('NOT_FOUND', 'Hash Table', 'No Whole-Word Match', `No whole-word occurrences of "${findClean}" replaced.`, 'O(n)');
      return;
    }

    dllRef.current.replaceLinesFromArray(nextLines);
    pushUndoCommand({
      type: 'REPLACE_WORD',
      lineNumber: 1,
      prevSnapshot: prevLines,
      nextSnapshot: nextLines,
      description: `Replaced "${findClean}" → "${replaceClean}" (${totalReplacements}x)`,
    });
    rebuildEditorIndexes();
    setSearchResult(null);
    recordOperation(
      'NOMINAL',
      'Hash Table + DLL',
      'Find & Replace',
      `Replaced ${totalReplacements} occurrence(s) of "${findClean}" with "${replaceClean}". Undoable via UndoStack.`,
      'O(n × m)'
    );
    bump();
  };

  const handleResetSampleDocOnly = () => {
    dllRef.current.replaceLinesFromArray(INITIAL_SAMPLE_LINES);
    undoStackRef.current.clear();
    redoStackRef.current.clear();
    rebuildEditorIndexes();
    setSelectedLineNumber(1);
    setSearchResult(null);
    setImportWaveKey((k) => k + 1);
    recordOperation('NOMINAL', 'Doubly Linked List', 'Sample Lines Loaded', 'Restored 5 sample lines into Doubly Linked List, Trie, and Hash Table.', 'O(n)');
    bump();
  };

  // Task Scheduler Handlers
  const handleAddTask = (rawTitle: string, priority: PriorityLevel, deadline: string): boolean => {
    const title = rawTitle.trim();
    const ts = new Date(deadline).getTime();

    if (title.length === 0) {
      recordOperation('INVALID', 'Task Scheduler', 'Invalid Input', 'Task title cannot be empty.', 'O(1)');
      return false;
    }
    if (!deadline || Number.isNaN(ts)) {
      recordOperation('INVALID', 'Deadline BST', 'Invalid Deadline', 'Select a valid date and time for the task deadline.', 'O(1)');
      return false;
    }

    const id = `task-${taskIdCounter.current}`;
    taskIdCounter.current += 1;
    const task: TaskItem = {
      id,
      title,
      priority,
      deadline,
      deadlineTimestamp: ts,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      heapScore: computeTaskHeapScore(priority, ts),
    };

    const arrayRes = dynamicArrayRef.current.push(task);
    const queueRes = fifoQueueRef.current.enqueue(task);
    maxHeapRef.current.insert(task);
    deadlineBstRef.current.insert(task);

    if (arrayRes.resized) {
      recordOperation(
        'RESIZE',
        'Dynamic Array',
        'Capacity Doubled',
        `Added "${title}". Dynamic Array reached capacity ${arrayRes.oldCapacity} and expanded → ${arrayRes.newCapacity} slots!`,
        'O(n) resize'
      );
    } else if (queueRes.resized) {
      recordOperation(
        'RESIZE',
        'Queue (FIFO)',
        'Buffer Resized',
        `Added "${title}". Circular FIFO Queue resized ${queueRes.oldCapacity} → ${queueRes.newCapacity} slots!`,
        'O(n) resize'
      );
    } else {
      recordOperation(
        'NOMINAL',
        'Task Scheduler',
        'Task Added',
        `Inserted "${title}" into Dynamic Array [${arrayRes.index}], FIFO Queue, Max-Heap Tree, and Deadline BST.`,
        'O(log n)'
      );
    }

    setBstFilteredTasks(null);
    setBstFilterDate(null);
    setBstComparisons(null);
    setBstHighlightedIds([]);
    bump();
    return true;
  };

  const handleProcessFIFO = () => {
    const deqRes = fifoQueueRef.current.dequeue();
    if (!deqRes.ok || !deqRes.value) {
      recordOperation('UNDERFLOW', 'Queue (FIFO)', 'Queue Underflow', 'FIFO Queue is empty — no pending tasks to process.', 'O(1)');
      return;
    }

    const processed = deqRes.value;
    dynamicArrayRef.current.updateStatus(processed.id, TaskStatus.COMPLETED);
    maxHeapRef.current.removeById(processed.id);
    deadlineBstRef.current.updateTaskStatus(processed.id, processed.deadlineTimestamp, TaskStatus.COMPLETED);

    recordOperation(
      'NOMINAL',
      'Queue (FIFO)',
      'Processed Next FIFO',
      `Dequeued oldest task "${processed.title}" from FRONT and marked Completed.`,
      'O(1)'
    );
    bump();
  };

  const handleProcessMaxHeap = () => {
    const extRes = maxHeapRef.current.extractMax();
    if (!extRes.ok || !extRes.value) {
      recordOperation('UNDERFLOW', 'Max-Heap Tree', 'Heap Underflow', 'Max-Heap is empty — no urgent tasks to extract.', 'O(1)');
      return;
    }

    const extracted = extRes.value;
    dynamicArrayRef.current.updateStatus(extracted.id, TaskStatus.COMPLETED);
    fifoQueueRef.current.removeById(extracted.id);
    deadlineBstRef.current.updateTaskStatus(extracted.id, extracted.deadlineTimestamp, TaskStatus.COMPLETED);

    recordOperation(
      'NOMINAL',
      'Max-Heap Tree',
      'Extracted Max-Heap',
      `Extracted highest-priority task "${extracted.title}" (${extracted.priority}) and sank down root.`,
      'O(log n)'
    );
    bump();
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const existing = dynamicArrayRef.current.findById(taskId);
    if (!existing) return;

    const nextStatus =
      existing.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    const updated = dynamicArrayRef.current.updateStatus(taskId, nextStatus);
    if (!updated) return;

    if (nextStatus === TaskStatus.COMPLETED) {
      fifoQueueRef.current.removeById(taskId);
      maxHeapRef.current.removeById(taskId);
      recordOperation('NOMINAL', 'Task Scheduler', 'Task Completed', `Marked "${updated.title}" completed and removed from Queue/Heap.`, 'O(log n)');
    } else {
      fifoQueueRef.current.enqueue(updated);
      maxHeapRef.current.insert(updated);
      recordOperation('NOMINAL', 'Task Scheduler', 'Task Reopened', `Reopened "${updated.title}" as Pending and re-inserted into Queue & Max-Heap.`, 'O(log n)');
    }
    deadlineBstRef.current.updateTaskStatus(taskId, updated.deadlineTimestamp, nextStatus);

    if (bstFilterDate) {
      const search = deadlineBstRef.current.searchByDate(bstFilterDate);
      setBstFilteredTasks(search.matches);
    }
    bump();
  };

  // Delete Task with smooth 180ms collapse animation
  const handleDeleteTask = (taskId: string) => {
    setDeletingTaskId(taskId);
    window.setTimeout(() => {
      const removeRes = dynamicArrayRef.current.removeById(taskId);
      setDeletingTaskId(null);
      if (!removeRes.removed) return;
      const target = removeRes.removed;
      fifoQueueRef.current.removeById(taskId);
      maxHeapRef.current.removeById(taskId);
      deadlineBstRef.current.delete(taskId, target.deadlineTimestamp);

      const trashEntry: DeletedTrashItem = {
        id: `trash-${trashIdCounter.current}`,
        kind: 'task',
        label: `Task: ${target.title} (${target.priority})`,
        task: target,
        deletedAt: nowTimeStr(),
      };
      trashIdCounter.current += 1;
      setTrashItems((prev) => [trashEntry, ...prev]);

      if (bstFilterDate) {
        const search = deadlineBstRef.current.searchByDate(bstFilterDate);
        setBstFilteredTasks(search.matches);
      }

      recordOperation(
        removeRes.shrunk ? 'RESIZE' : 'NOMINAL',
        'Dynamic Array',
        'Deleted to Trash',
        `Deleted "${target.title}". Click "Withdraw Delete" to recover it.`,
        'O(n)'
      );
      bump();
    }, 180);
  };

  const handleClearCompleted = () => {
    const all = dynamicArrayRef.current.toArray();
    let removedCount = 0;
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].status === TaskStatus.COMPLETED) {
        dynamicArrayRef.current.removeById(all[i].id);
        deadlineBstRef.current.delete(all[i].id, all[i].deadlineTimestamp);
        removedCount += 1;
      }
    }
    if (removedCount === 0) {
      recordOperation('NOMINAL', 'Task Scheduler', 'No Completed Tasks', 'No completed tasks to clear.', 'O(n)');
      return;
    }
    setBstFilteredTasks(null);
    setBstFilterDate(null);
    setBstComparisons(null);
    recordOperation('NOMINAL', 'Dynamic Array + BST', 'Cleared Completed', `Removed ${removedCount} completed task(s) from Dynamic Array and BST.`, 'O(n)');
    bump();
  };

  const handleSearchBSTDate = (dateStr: string) => {
    if (!dateStr) {
      recordOperation('INVALID', 'Binary Search Tree', 'Invalid Date', 'Choose a valid calendar date to search the BST.', 'O(1)');
      return;
    }

    const res = deadlineBstRef.current.searchByDate(dateStr);
    setBstFilterDate(dateStr);
    setBstFilteredTasks(res.matches);
    setBstComparisons(res.comparisons);
    setBstHighlightedIds(res.matches.map((m) => m.id));

    if (res.found) {
      recordOperation(
        'NOMINAL',
        'Binary Search Tree (BST)',
        'Deadline Found',
        `Found ${res.matches.length} task(s) on ${dateStr} in ${res.comparisons} BST comparison(s).`,
        'O(log n + k)'
      );
    } else {
      recordOperation(
        'NOT_FOUND',
        'Binary Search Tree (BST)',
        'Unsuccessful Search',
        `No tasks scheduled for ${dateStr} (${res.comparisons} BST node comparison(s)).`,
        'O(log n)'
      );
    }
  };

  const handleResetBSTFilter = () => {
    setBstFilterDate(null);
    setBstFilteredTasks(null);
    setBstComparisons(null);
    setBstHighlightedIds([]);
  };

  const jumpToVisualizerTab = (tab: InspectorTab) => {
    setActiveSector('workbench');
    setInspectorTab(tab);
    setInspectorExpanded(true);
    window.setTimeout(() => {
      const el = document.getElementById('ds-inspector');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 40);
  };

  // Project Store Persistence & Handlers
  const persistProjectStore = () => {
    try {
      window.localStorage.setItem(
        PROJECT_STORE_STORAGE_KEY,
        JSON.stringify(projectStoreRef.current.toArray())
      );
    } catch {
      // Ignore storage write errors in private browsing/sandbox
    }
  };

  const handleSaveProject = (payload: {
    id?: string;
    title: string;
    code: string;
    languages: ProjectLanguage[];
    matchedSignals: Record<ProjectLanguage, string[]>;
    isManualOverride: boolean;
  }): boolean => {
    const cleanTitle = payload.title.trim();
    if (cleanTitle.length === 0) {
      recordOperation('INVALID', 'Project Store', 'Missing Title', 'Enter a project title before saving.', 'O(1)');
      return false;
    }
    if (payload.code.trim().length === 0) {
      recordOperation('INVALID', 'Project Store', 'Empty Code', 'Paste or write code before saving to Project Store.', 'O(1)');
      return false;
    }

    const existing = payload.id ? projectStoreRef.current.findById(payload.id) : null;
    const timestamp = nowTimeStr();
    const projectId = existing ? existing.id : `proj-${Date.now()}-${projectIdCounter.current}`;
    if (!existing) {
      projectIdCounter.current += 1;
    }

    const snippet: ProjectSnippet = {
      id: projectId,
      title: cleanTitle,
      code: payload.code,
      languages: payload.languages,
      matchedSignals: payload.matchedSignals,
      isManualOverride: payload.isManualOverride,
      createdAt: existing ? existing.createdAt : timestamp,
      updatedAt: timestamp,
    };

    const res = projectStoreRef.current.pushOrUpdate(snippet);
    persistProjectStore();

    const langLabel = payload.languages.length > 0 ? payload.languages.join(' + ') : 'Plain Text';
    recordOperation(
      res.resized ? 'RESIZE' : 'NOMINAL',
      'Project Store',
      res.updated ? 'Project Updated' : 'Project Saved',
      `${res.updated ? 'Updated' : 'Saved'} "${cleanTitle}" (${langLabel}) persistently in Project Store${
        res.resized ? ` — buffer expanded ${res.oldCap} → ${res.newCap}` : ''
      }.`,
      res.resized ? 'O(n) resize' : 'O(n)'
    );
    bump();
    return true;
  };

  const handleDeleteProject = (projectId: string) => {
    setDeletingProjectId(projectId);
    window.setTimeout(() => {
      const removed = projectStoreRef.current.removeById(projectId);
      setDeletingProjectId(null);
      if (!removed) return;
      persistProjectStore();

      const trashEntry: DeletedTrashItem = {
        id: `trash-${trashIdCounter.current}`,
        kind: 'project',
        label: `Project: ${removed.title} (${removed.languages.join(', ') || 'Text'})`,
        project: removed,
        deletedAt: nowTimeStr(),
      };
      trashIdCounter.current += 1;
      setTrashItems((prev) => [trashEntry, ...prev]);

      recordOperation(
        'NOMINAL',
        'Project Store',
        'Deleted to Trash',
        `Moved project "${removed.title}" to Recently Deleted. Click "Withdraw Delete" to restore it.`,
        'O(n)'
      );
      bump();
    }, 180);
  };

  const handleDownloadProject = (
    title: string,
    code: string,
    languages: ProjectLanguage[],
    extension: DownloadExtension | 'bundle'
  ) => {
    if (code.trim().length === 0) {
      recordOperation('INVALID', 'Project Store', 'Nothing to Download', 'Code snippet is empty.', 'O(1)');
      return;
    }

    const slug = sanitizeFileSlug(title);
    if (extension === 'bundle') {
      const header = [
        `/* Project: ${title}`,
        ` * Detected Languages: ${languages.join(', ') || 'Plain Text'}`,
        ` * Exported: ${new Date().toISOString()}`,
        ` */`,
        '',
      ].join('\n');
      const filename = `${slug}-multi-lang.txt`;
      triggerFileDownload(filename, header + code, 'text/plain;charset=utf-8');
      recordOperation(
        'NOMINAL',
        'Project Store',
        'Downloaded Bundle',
        `Downloaded multi-language bundle "${filename}".`,
        'O(n)'
      );
      return;
    }

    const filename = `${slug}.${extension}`;
    triggerFileDownload(filename, code, 'text/plain;charset=utf-8');
    recordOperation(
      'NOMINAL',
      'Project Store',
      'File Downloaded',
      `Downloaded "${filename}" (${languages.join(', ') || 'Text'}) to device.`,
      'O(n)'
    );
  };

  // Snapshots
  const dllNodes = dllRef.current.getSnapshot();
  const undoFrames = undoStackRef.current.getFrames();
  const redoFrames = redoStackRef.current.getFrames();
  const trieStats = trieRef.current.getStats();
  const hashBuckets = hashTableRef.current.getBucketsSnapshot();
  const hashStats = hashTableRef.current.getStats();
  const topWords = hashTableRef.current.getTopWords(6);

  const tasksInArray = dynamicArrayRef.current.toArray();
  const tasksInFifo = fifoQueueRef.current.toArray();
  const tasksInHeap = maxHeapRef.current.toPriorityOrderedArray();
  const tasksInBst = deadlineBstRef.current.inOrderTraversal();
  const savedProjects = projectStoreRef.current.toArray();
  const pendingCount = tasksInArray.filter((t) => t.status === TaskStatus.PENDING).length;
  const totalTreeAndIndexNodes =
    trieStats.totalNodes + hashStats.uniqueKeys + maxHeapRef.current.size + deadlineBstRef.current.size;

  const renderAlertIcon = () => {
    if (alert.severity === 'UNDERFLOW' || alert.severity === 'INVALID') {
      return <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0" aria-hidden="true" />;
    }
    if (alert.severity === 'RESIZE') {
      return <Maximize2 className="w-4 h-4 text-[#4338CA] shrink-0" aria-hidden="true" />;
    }
    if (alert.severity === 'NOT_FOUND') {
      return <SearchX className="w-4 h-4 text-[#6D28D9] shrink-0" aria-hidden="true" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />;
  };

  const alertSeverityLabel =
    alert.severity === 'RESIZE'
      ? 'CAPACITY RESIZE'
      : alert.severity === 'UNDERFLOW'
      ? 'UNDERFLOW'
      : alert.severity === 'NOT_FOUND'
      ? 'UNSUCCESSFUL SEARCH'
      : alert.severity === 'INVALID'
      ? 'INVALID INPUT'
      : 'NOMINAL';

  const alertSeverityClass =
    alert.severity === 'UNDERFLOW' || alert.severity === 'INVALID'
      ? 'text-[#BE123C]'
      : alert.severity === 'RESIZE'
      ? 'text-[#4338CA]'
      : alert.severity === 'NOT_FOUND'
      ? 'text-[#6D28D9]'
      : 'text-[#0F766E]';

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0] text-[#1E1B18]">
      {/* Clean Header: Title, Navigation, DS Guide & Utility Controls Only */}
      <header className="border-b border-[#E5D9C5] bg-[#FFFDF9]/95 backdrop-blur-xs sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <a
              href="#top"
              onClick={() => setActiveSector('workbench')}
              className="font-display text-base sm:text-lg font-bold tracking-tight text-[#1E1B18] whitespace-nowrap shrink-0"
            >
              Smart DSA Workbench
            </a>

            {/* Primary Sector Switcher */}
            <div className="flex items-center gap-2" role="navigation" aria-label="Workspace sectors">
              <ActionButton
                size="sm"
                accent="indigo"
                isActive={activeSector === 'workbench'}
                onClick={() => setActiveSector('workbench')}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Workbench</span>
              </ActionButton>
              <ActionButton
                size="sm"
                accent="teal"
                isActive={activeSector === 'projectStore'}
                onClick={() => setActiveSector('projectStore')}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Project Store ({savedProjects.length})</span>
              </ActionButton>
            </div>

            {activeSector === 'workbench' && (
              <nav className="hidden xl:flex items-center gap-4 text-xs sm:text-sm font-medium text-[#57534E]">
                <a href="#text-editor" className="hover:text-[#4338CA] transition-colors whitespace-nowrap">
                  Text Editor
                </a>
                <a href="#task-scheduler" className="hover:text-[#4338CA] transition-colors whitespace-nowrap">
                  Task Scheduler
                </a>
                <a
                  href="#ds-inspector"
                  onClick={() => setInspectorExpanded(true)}
                  className="hover:text-[#4338CA] transition-colors whitespace-nowrap"
                >
                  Visualizer
                </a>
                <a
                  href="#ds-inspector"
                  onClick={() => jumpToVisualizerTab('complexity')}
                  className="hover:text-[#4338CA] transition-colors whitespace-nowrap"
                >
                  Complexity
                </a>
              </nav>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ActionButton size="sm" accent="violet" onClick={() => setIsGuideModalOpen(true)}>
              <BookOpen className="w-3.5 h-3.5" />
              <span>DS Guide</span>
            </ActionButton>
            <ActionButton size="sm" accent="indigo" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-3.5 h-3.5" />
              <span>Import TXT/JSON</span>
            </ActionButton>
            <ActionButton size="sm" accent="teal" onClick={handleExportTxt}>
              <Download className="w-3.5 h-3.5" />
              <span>Export TXT</span>
            </ActionButton>
            <ActionButton size="sm" accent="indigo" onClick={handleExportJson}>
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </ActionButton>
            <ActionButton size="sm" accent="violet" onClick={handleExportReport}>
              <Download className="w-3.5 h-3.5" />
              <span>DS Report</span>
            </ActionButton>
            <ActionButton size="sm" accent="teal" onClick={handleLoadSampleData}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Sample</span>
            </ActionButton>
            <ActionButton size="sm" accent="rose" onClick={handleClearAll}>
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </ActionButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1B18] tracking-tight text-balance">
              {activeSector === 'projectStore'
                ? 'Project Store — Multi-Language Code Repository'
                : 'Smart Undo-Redo Text Editor with Task Scheduler'}
            </h1>
            <p className="text-sm text-[#57534E] max-w-4xl">
              {activeSector === 'projectStore'
                ? 'Paste C++, C, Python, Java, or combined multi-language snippets to auto-detect syntax, save persistently, and download in .txt, .cpp, .c, .py, or .java.'
                : 'Data Structure Visualizer & Workbench backed by manual TypeScript implementations. Every panel displays its [DS Used] badge with water-ripple & 2.5s Sunset Orange click feedback.'}
            </p>
          </div>
        </div>

        {/* 4 Summary Stat Cards (Workbench Sector) */}
        {activeSector === 'workbench' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <DSBadge label="Doubly Linked List" accent="indigo" />
              <FileText className="w-4 h-4 text-[#4338CA]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#57534E]">Document Line Nodes</div>
              <div className="font-display text-2xl font-bold text-[#1E1B18] tabular-nums">
                {dllNodes.length}
              </div>
              <div className="text-xs text-[#57534E] tabular-nums">
                Active cursor: {selectedLineNumber > 0 ? `Line ${selectedLineNumber}` : 'null'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <DSBadge label="Two Stacks — Undo & Redo" accent="rose" />
              <History className="w-4 h-4 text-[#BE123C]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#57534E]">Undo / Redo Stack Depth</div>
              <div className="font-display text-2xl font-bold text-[#1E1B18] tabular-nums">
                {undoFrames.length} / {redoFrames.length}
              </div>
              <div className="text-xs text-[#57534E] tabular-nums">
                Undo frames · Redo frames
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <DSBadge label="Dynamic Array" accent="violet" />
              <Database className="w-4 h-4 text-[#6D28D9]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#57534E]">Pending / Total Tasks</div>
              <div className="font-display text-2xl font-bold text-[#1E1B18] tabular-nums">
                {pendingCount} / {tasksInArray.length}
              </div>
              <div className="text-xs text-[#57534E] tabular-nums">
                Capacity: {dynamicArrayRef.current.length} / {dynamicArrayRef.current.capacity}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <DSBadge label="Trie · Heap · BST · Hash" accent="teal" />
              <Network className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#57534E]">Tree &amp; Hash Nodes</div>
              <div className="font-display text-2xl font-bold text-[#1E1B18] tabular-nums">
                {totalTreeAndIndexNodes}
              </div>
              <div className="text-xs text-[#57534E] tabular-nums">
                Trie {trieStats.totalNodes} · Hash {hashStats.uniqueKeys} · Heap {maxHeapRef.current.size} · BST {deadlineBstRef.current.size}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Import Cascade Summary Banner */}
        {importSummary && (
          <div className="animate-fade-slide-in flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2.5 text-xs text-[#0F766E] font-medium">
            <span>{importSummary}</span>
            <ActionButton size="sm" accent="teal" onClick={() => setImportSummary(null)}>
              Dismiss
            </ActionButton>
          </div>
        )}

        {/* Live Operation Status Banner (with One-Click Withdraw Delete when Trash has items) */}
        <div
          key={alert.id}
          role="status"
          aria-live="polite"
          className="animate-fade-slide-in flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] px-4 py-3 text-xs sm:text-sm shadow-2xs"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            {renderAlertIcon()}
            <div className="min-w-0">
              <span className={`font-mono text-xs font-bold mr-2 ${alertSeverityClass}`}>
                {alertSeverityLabel}
              </span>
              <span className="font-semibold text-[#1E1B18] mr-1.5">{alert.title}:</span>
              <span className="text-[#57534E]">{alert.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-[#57534E] tabular-nums shrink-0">
            {trashItems.length > 0 && (
              <ActionButton size="sm" accent="violet" onClick={handleWithdrawLastDelete}>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Withdraw Delete</span>
              </ActionButton>
            )}
            <span className="text-[#4338CA] font-semibold">{alert.complexity}</span>
            <span aria-hidden="true">·</span>
            <span>{alert.timestamp}</span>
          </div>
        </div>

        {/* Recently Deleted Drawer / Strip */}
        <div className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] px-5 py-3.5 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <DSBadge label="Trash Buffer & Restore" accent="rose" />
              <span className="text-sm font-semibold text-[#1E1B18]">
                Recently Deleted ({trashItems.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ActionButton size="sm" accent="violet" onClick={handleWithdrawLastDelete}>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Withdraw Delete</span>
              </ActionButton>
              {trashItems.length > 0 && (
                <ActionButton
                  size="sm"
                  accent="neutral"
                  onClick={() => {
                    setTrashItems([]);
                    recordOperation('NOMINAL', 'Trash', 'Emptied Trash', 'Cleared recently deleted items.', 'O(1)');
                  }}
                >
                  <span>Empty Trash</span>
                </ActionButton>
              )}
            </div>
          </div>

          {trashItems.length === 0 ? (
            <p className="text-xs text-[#57534E]">
              Trash is empty. Click any <strong>Delete</strong> icon on a line or task to move it here, then click <strong>Withdraw Delete</strong> or <strong>Restore</strong> to recover it with a highlight pulse.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trashItems.map((item) => (
                <div
                  key={item.id}
                  className="animate-fade-slide-in flex items-center gap-2 rounded-lg border border-[#FECDD3] bg-[#FFF1F2]/70 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono font-semibold text-[#BE123C] uppercase">
                    {item.kind}
                  </span>
                  <span className="text-[#1E1B18] max-w-[240px] truncate" title={item.label}>
                    {item.label}
                  </span>
                  <span className="text-[#57534E] tabular-nums">({item.deletedAt})</span>
                  <ActionButton size="sm" accent="teal" onClick={() => restoreTrashItem(item)}>
                    <RotateCw className="w-3 h-3" />
                    <span>Restore</span>
                  </ActionButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeSector === 'projectStore' ? (
          <ProjectStorePanel
            projects={savedProjects}
            arrayCapacity={projectStoreRef.current.capacity}
            deletingProjectId={deletingProjectId}
            restoredProjectId={restoredProjectId}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
            onDownloadProject={handleDownloadProject}
          />
        ) : (
          <>
            {/* Main Two-Column Workbench */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <TextEditorPanel
                  noteTitle={noteTitle}
                  lines={dllNodes}
                  selectedLineNumber={selectedLineNumber}
                  undoCount={undoFrames.length}
                  redoCount={redoFrames.length}
                  trashCount={trashItems.length}
                  importWaveKey={importWaveKey}
                  deletingLineId={deletingLineId}
                  restoredLineNumber={restoredLineNumber}
                  searchResult={searchResult}
                  topWords={topWords}
                  getTrieSuggestions={(prefix) => trieRef.current.getSuggestions(prefix, 6)}
                  onUpdateNoteTitle={handleUpdateNoteTitle}
                  onSelectLine={handleSelectLine}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onWithdrawDelete={handleWithdrawLastDelete}
                  onPrevLine={handlePrevLine}
                  onNextLine={handleNextLine}
                  onMoveLineUp={handleMoveLineUp}
                  onMoveLineDown={handleMoveLineDown}
                  onInsertLine={handleInsertLine}
                  onUpdateLine={handleUpdateLine}
                  onDeleteLine={handleDeleteLine}
                  onSearchWord={handleSearchWord}
                  onClearSearch={() => setSearchResult(null)}
                  onReplaceWord={handleReplaceWord}
                  onResetSampleDoc={handleResetSampleDocOnly}
                  onInspectTrie={() => jumpToVisualizerTab('trie')}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <TaskSchedulerPanel
                  tasksInArray={tasksInArray}
                  tasksInFifo={tasksInFifo}
                  tasksInHeap={tasksInHeap}
                  tasksInBst={tasksInBst}
                  arrayCapacity={dynamicArrayRef.current.capacity}
                  arrayLength={dynamicArrayRef.current.length}
                  viewMode={taskViewMode}
                  importWaveKey={importWaveKey}
                  deletingTaskId={deletingTaskId}
                  restoredTaskId={restoredTaskId}
                  bstFilterDate={bstFilterDate}
                  bstFilteredTasks={bstFilteredTasks}
                  bstComparisons={bstComparisons}
                  onChangeViewMode={setTaskViewMode}
                  onAddTask={handleAddTask}
                  onProcessFIFO={handleProcessFIFO}
                  onProcessMaxHeap={handleProcessMaxHeap}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onDeleteTask={handleDeleteTask}
                  onClearCompleted={handleClearCompleted}
                  onSearchBSTDate={handleSearchBSTDate}
                  onResetBSTFilter={handleResetBSTFilter}
                  onInspectTree={(tab) => jumpToVisualizerTab(tab)}
                />
              </div>
            </div>

            {/* Bottom Live Data Structure Visualizer & Complexity Table */}
            <DataStructureInspector
              activeTab={inspectorTab}
              onChangeTab={setInspectorTab}
              isExpanded={inspectorExpanded}
              onToggleExpand={() => setInspectorExpanded((prev) => !prev)}
              dllNodes={dllNodes}
              selectedLineNumber={selectedLineNumber}
              onSelectLine={handleSelectLine}
              undoFrames={undoFrames}
              redoFrames={redoFrames}
              trieStats={trieStats}
              inspectTriePrefix={(prefix) => trieRef.current.inspectPrefixBranch(prefix, 36)}
              hashBuckets={hashBuckets}
              hashStats={hashStats}
              dynamicArraySlots={dynamicArrayRef.current.getRawSlots()}
              dynamicArrayLength={dynamicArrayRef.current.length}
              dynamicArrayCapacity={dynamicArrayRef.current.capacity}
              dynamicArrayResizeHistory={dynamicArrayRef.current.getResizeHistory()}
              fifoSlots={fifoQueueRef.current.getBufferSlots()}
              fifoFront={fifoQueueRef.current.frontIndex}
              fifoRear={fifoQueueRef.current.rearIndex}
              fifoSize={fifoQueueRef.current.size}
              fifoCapacity={fifoQueueRef.current.capacity}
              heapArray={maxHeapRef.current.getHeapArray()}
              bstLayout={deadlineBstRef.current.getTreeLayout()}
              bstInOrder={tasksInBst}
              bstHighlightedIds={bstHighlightedIds}
              logs={logs}
            />
          </>
        )}
        {/* Dedicated Bottom Team & Project Credits Section */}
        <section
          aria-label="Team and Project Credits"
          className="rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] px-5 py-5 shadow-xs space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5D9C5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#1E1B18]">
                Team &amp; Project Credits
              </h2>
              <p className="text-xs text-[#57534E] mt-0.5">
                Data Structures &amp; Algorithms Workbench — Collaborative Engineering Credits
              </p>
            </div>
            <span className="inline-flex items-center rounded-md border border-[#E5D9C5] bg-[#F4ECE0] px-2.5 py-1 text-xs font-medium text-[#57534E]">
              8 Manual Data Structures
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] px-4 py-3">
              <div className="text-sm font-semibold text-[#1E1B18]">Surma Akter</div>
              <div className="text-xs font-mono text-[#57534E] mt-0.5">ID: 252311292</div>
            </div>
            <div className="rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] px-4 py-3">
              <div className="text-sm font-semibold text-[#1E1B18]">Sijan Mahmud</div>
              <div className="text-xs font-mono text-[#57534E] mt-0.5">ID: 252311293</div>
            </div>
            <div className="rounded-lg border border-[#E5D9C5] bg-[#FBF7F0] px-4 py-3">
              <div className="text-sm font-semibold text-[#1E1B18]">Tarequle Islam</div>
              <div className="text-xs font-mono text-[#57534E] mt-0.5">ID: 252311297</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5D9C5] bg-[#FFFDF9] mt-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-[#57534E]">
          <div>
            <span className="font-semibold text-[#1E1B18]">
              Smart Undo-Redo Text Editor with Task Scheduler
            </span>{' '}
            · Data Structure Visualizer &amp; Workbench
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSector('workbench')}
              className="hover:text-[#4338CA] transition-colors cursor-pointer"
            >
              Workbench
            </button>
            <button
              type="button"
              onClick={() => setActiveSector('projectStore')}
              className="hover:text-[#4338CA] transition-colors cursor-pointer"
            >
              Project Store
            </button>
            <a
              href="#ds-inspector"
              onClick={() => jumpToVisualizerTab('complexity')}
              className="hover:text-[#4338CA] transition-colors"
            >
              Complexity Table
            </a>
          </div>
        </div>
      </footer>

      <HowItWorksModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportText={handleImportText}
        onImportJson={handleImportJson}
      />
    </div>
  );
}

export default function App() {
  return (
    <ButtonFlashProvider>
      <WorkbenchApp />
    </ButtonFlashProvider>
  );
}
