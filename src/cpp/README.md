# C++17 Core Data Structures & Workbench Engine

This directory contains the complete, standalone **C++17** implementation of all data structures and core algorithms powering the **Smart Undo-Redo Text Editor with Task Scheduler — Data Structure Visualizer & Workbench**.

## Architecture

- **`include/types.hpp`**: Shared enums (`PriorityLevel`, `TaskStatus`, `EditorOperationType`, `ProjectLanguage`, `SyntaxTokenType`, `AlertSeverity`) and snapshot structures.
- **`include/DynamicArray.hpp`**: Manual resizing array (`TaskItem**` raw buffer) with automatic capacity doubling (`4 -> 8 -> 16...`) and quarter-shrink.
- **`include/DoublyLinkedList.hpp`**: Manual doubly linked list (`LineNode` with `prev` / `next` pointers) supporting bidirectional traversal and pointer-rewiring node swaps (`swapWithPrev`, `swapWithNext`).
- **`include/HistoryStacks.hpp`**: Manual linked-node `ManualStack<T>`, `UndoStack`, and `RedoStack` with explicit stack underflow handling.
- **`include/FIFOQueue.hpp`**: Manual circular ring-buffer queue (`frontIdx_`, `rearIdx_`) with automatic capacity doubling (`8 -> 16...`).
- **`include/MaxHeap.hpp`**: Manual binary max-heap priority queue (`bubbleUp`, `sinkDown`, `computeTaskHeapScore`, `extractMax`, and heap-ordered traversal without `std::sort`).
- **`include/HashTable.hpp`**: Separate-chaining hash table (`WordFrequencyHashTable`) with polynomial rolling hash (`base 31`), collision chains, insertion-sorted Top-K frequency retrieval, and whole-word replacement.
- **`include/Trie.hpp`**: Manual 36-slot (`a-z`, `0-9`) prefix tree (`AutocompleteTrie`) with DFS word collection and frequency-ranked suggestions.
- **`include/DeadlineBST.hpp`**: Manual deadline-ordered Binary Search Tree (`TaskDeadlineBST`) with in-order successor deletion, calendar-date range search pruning, and earliest-deadline-first in-order traversal.
- **`include/ProjectStoreCollection.hpp`**: Manual Dynamic Array + Separate-Chaining Hash Index for stored code projects, paired with `detectCodeLanguages` and single-pass `tokenizeCodeForHighlight`.
- **`src/WorkbenchEngine.cpp`**: Unified `SmartDSAWorkbenchEngine` coordinating editor undo/redo history, indexing, task scheduling, and syntax analysis.
- **`tests/test_dsa_suite.cpp`**: C++17 assertion test suite covering all 9 data structures.

## Build & Verification

Run the native C++17 test suite:

```bash
cd cpp && make test
```

Compile to WebAssembly (optional, requires Emscripten `em++`):

```bash
cd cpp && make wasm
```

For Netlify static deployment, the root Vite application builds via `npm run build` (`dist/`) using the 1:1 TypeScript adapter in `src/dsa/` with identical classes, methods, and algorithmic behavior.
