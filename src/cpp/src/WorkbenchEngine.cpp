#include "../include/types.hpp"
#include "../include/DynamicArray.hpp"
#include "../include/DoublyLinkedList.hpp"
#include "../include/HistoryStacks.hpp"
#include "../include/FIFOQueue.hpp"
#include "../include/MaxHeap.hpp"
#include "../include/HashTable.hpp"
#include "../include/Trie.hpp"
#include "../include/DeadlineBST.hpp"
#include "../include/ProjectStoreCollection.hpp"

#include <string>
#include <vector>

namespace smart_dsa {

/**
 * Unified C++17 Workbench Engine coordinating all 9 manual data structures:
 * 1. DynamicArray (Task records, capacity doubling 4 -> 8 -> 16)
 * 2. DoublyLinkedList (Editor document lines with prev/next pointer rewiring)
 * 3. HistoryStacks (UndoStack & RedoStack)
 * 4. FIFOQueue (Circular buffer pending task queue)
 * 5. MaxHeap (Priority Queue binary heap with bubbleUp / sinkDown)
 * 6. HashTable (Separate-chaining word frequency index & whole-word replace)
 * 7. Trie (Prefix tree autocomplete ranked by frequency)
 * 8. DeadlineBST (Calendar-date range pruning & earliest-deadline in-order traversal)
 * 9. ProjectStoreCollection (Dynamic Array + Hash Index + Multi-Language Detector & Tokenizer)
 */
class SmartDSAWorkbenchEngine {
private:
  DocumentLinkedList dll_;
  UndoStack undoStack_;
  RedoStack redoStack_;
  AutocompleteTrie trie_;
  WordFrequencyHashTable hashTable_{16};
  TaskDynamicArray dynamicArray_{4};
  TaskFIFOQueue fifoQueue_{8};
  TaskMaxHeap maxHeap_;
  TaskDeadlineBST deadlineBst_;
  ProjectStoreCollection projectStore_{4};

  std::string noteTitle_ = "Data Structures & Algorithms Workbench Notes";
  int cmdCounter_ = 1;
  int taskCounter_ = 1;

  void rebuildEditorIndexes() {
    std::vector<std::string> lines = dll_.toTextArray();
    trie_.rebuildFromLines(lines, true);
    hashTable_.rebuildFromLines(lines);
  }

  void pushUndoCommand(EditorCommand cmd) {
    cmd.id = "cmd-" + std::to_string(cmdCounter_++);
    undoStack_.push(cmd);
    redoStack_.clear();
  }

public:
  const std::string& noteTitle() const { return noteTitle_; }
  const DocumentLinkedList& document() const { return dll_; }
  const UndoStack& undoStack() const { return undoStack_; }
  const RedoStack& redoStack() const { return redoStack_; }
  const AutocompleteTrie& trie() const { return trie_; }
  const WordFrequencyHashTable& hashTable() const { return hashTable_; }
  const TaskDynamicArray& taskArray() const { return dynamicArray_; }
  const TaskFIFOQueue& fifoQueue() const { return fifoQueue_; }
  const TaskMaxHeap& maxHeap() const { return maxHeap_; }
  const TaskDeadlineBST& deadlineBst() const { return deadlineBst_; }
  const ProjectStoreCollection& projectStore() const { return projectStore_; }

  bool updateNoteTitle(const std::string& newTitle, const std::string& timestamp = "") {
    if (newTitle.empty() || newTitle == noteTitle_) return false;
    EditorCommand cmd;
    cmd.type = EditorOperationType::UPDATE_TITLE;
    cmd.prevTitle = noteTitle_;
    cmd.nextTitle = newTitle;
    cmd.description = "Renamed title";
    cmd.timestamp = timestamp;
    noteTitle_ = newTitle;
    pushUndoCommand(cmd);
    return true;
  }

  int insertLine(const std::string& text, int positionLineNumber = -1, const std::string& timestamp = "") {
    if (text.empty()) return 0;
    LineNode* inserted = (positionLineNumber > 0 && !dll_.isEmpty())
                             ? dll_.insertAt(positionLineNumber, text)
                             : dll_.insertAtEnd(text);

    EditorCommand cmd;
    cmd.type = EditorOperationType::INSERT_LINE;
    cmd.lineNumber = inserted->lineNumber;
    cmd.nextText = text;
    cmd.description = "Inserted Line " + std::to_string(inserted->lineNumber);
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    rebuildEditorIndexes();
    return inserted->lineNumber;
  }

  bool updateLine(int lineNumber, const std::string& newText, const std::string& timestamp = "") {
    if (newText.empty()) return false;
    std::string prevText;
    if (!dll_.updateLine(lineNumber, newText, prevText) || prevText == newText) {
      return false;
    }

    EditorCommand cmd;
    cmd.type = EditorOperationType::UPDATE_LINE;
    cmd.lineNumber = lineNumber;
    cmd.prevText = prevText;
    cmd.nextText = newText;
    cmd.description = "Updated Line " + std::to_string(lineNumber);
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    rebuildEditorIndexes();
    return true;
  }

  DLLDeleteResult deleteLine(int lineNumber, const std::string& timestamp = "") {
    DLLDeleteResult res = dll_.deleteLine(lineNumber);
    if (!res.ok) return res;

    EditorCommand cmd;
    cmd.type = EditorOperationType::DELETE_LINE;
    cmd.lineNumber = lineNumber;
    cmd.prevText = res.deletedText;
    cmd.description = "Deleted Line " + std::to_string(lineNumber);
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    rebuildEditorIndexes();
    return res;
  }

  bool moveLineUp(int lineNumber, const std::string& timestamp = "") {
    DLLSwapResult res = dll_.swapWithPrev(lineNumber);
    if (!res.ok) return false;
    EditorCommand cmd;
    cmd.type = EditorOperationType::MOVE_LINE;
    cmd.lineNumber = lineNumber;
    cmd.targetLineNumber = res.newLineNumber;
    cmd.hasTargetLineNumber = true;
    cmd.description = "Moved Line " + std::to_string(lineNumber) + " up";
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    return true;
  }

  bool moveLineDown(int lineNumber, const std::string& timestamp = "") {
    DLLSwapResult res = dll_.swapWithNext(lineNumber);
    if (!res.ok) return false;
    EditorCommand cmd;
    cmd.type = EditorOperationType::MOVE_LINE;
    cmd.lineNumber = lineNumber;
    cmd.targetLineNumber = res.newLineNumber;
    cmd.hasTargetLineNumber = true;
    cmd.description = "Moved Line " + std::to_string(lineNumber) + " down";
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    return true;
  }

  int replaceWordAcrossDocument(
      const std::string& findWord,
      const std::string& replaceWith,
      const std::string& timestamp = "") {
    HashLookupResult lookup = hashTable_.get(findWord);
    if (!lookup.found) return 0;

    std::vector<std::string> prevLines = dll_.toTextArray();
    std::vector<std::string> nextLines;
    nextLines.reserve(prevLines.size());
    int totalReplacements = 0;

    for (size_t i = 0; i < prevLines.size(); ++i) {
      WholeWordReplaceResult rr = replaceWholeWordInLine(prevLines[i], lookup.key, replaceWith);
      nextLines.push_back(rr.updatedLine);
      totalReplacements += rr.replacements;
    }

    if (totalReplacements == 0) return 0;

    dll_.replaceLinesFromArray(nextLines);
    EditorCommand cmd;
    cmd.type = EditorOperationType::REPLACE_WORD;
    cmd.lineNumber = 1;
    cmd.prevSnapshot = prevLines;
    cmd.nextSnapshot = nextLines;
    cmd.description = "Replaced \"" + lookup.key + "\" -> \"" + replaceWith + "\"";
    cmd.timestamp = timestamp;
    pushUndoCommand(cmd);
    rebuildEditorIndexes();
    return totalReplacements;
  }

  bool undo() {
    StackPopResult<EditorCommand> popRes = undoStack_.pop();
    if (!popRes.ok) return false;

    const EditorCommand& cmd = popRes.value;
    if (cmd.type == EditorOperationType::UPDATE_TITLE) {
      noteTitle_ = cmd.prevTitle;
    } else if (cmd.type == EditorOperationType::INSERT_LINE) {
      dll_.deleteLine(cmd.lineNumber);
    } else if (cmd.type == EditorOperationType::DELETE_LINE) {
      dll_.insertAt(cmd.lineNumber, cmd.prevText);
    } else if (cmd.type == EditorOperationType::UPDATE_LINE) {
      std::string dummy;
      dll_.updateLine(cmd.lineNumber, cmd.prevText, dummy);
    } else if (cmd.type == EditorOperationType::REPLACE_WORD) {
      dll_.replaceLinesFromArray(cmd.prevSnapshot);
    } else if (cmd.type == EditorOperationType::MOVE_LINE && cmd.hasTargetLineNumber) {
      if (cmd.targetLineNumber < cmd.lineNumber) {
        dll_.swapWithNext(cmd.targetLineNumber);
      } else {
        dll_.swapWithPrev(cmd.targetLineNumber);
      }
    }

    redoStack_.push(cmd);
    rebuildEditorIndexes();
    return true;
  }

  bool redo() {
    StackPopResult<EditorCommand> popRes = redoStack_.pop();
    if (!popRes.ok) return false;

    const EditorCommand& cmd = popRes.value;
    if (cmd.type == EditorOperationType::UPDATE_TITLE) {
      noteTitle_ = cmd.nextTitle;
    } else if (cmd.type == EditorOperationType::INSERT_LINE) {
      dll_.insertAt(cmd.lineNumber, cmd.nextText);
    } else if (cmd.type == EditorOperationType::DELETE_LINE) {
      dll_.deleteLine(cmd.lineNumber);
    } else if (cmd.type == EditorOperationType::UPDATE_LINE) {
      std::string dummy;
      dll_.updateLine(cmd.lineNumber, cmd.nextText, dummy);
    } else if (cmd.type == EditorOperationType::REPLACE_WORD) {
      dll_.replaceLinesFromArray(cmd.nextSnapshot);
    } else if (cmd.type == EditorOperationType::MOVE_LINE && cmd.hasTargetLineNumber) {
      if (cmd.targetLineNumber < cmd.lineNumber) {
        dll_.swapWithPrev(cmd.lineNumber);
      } else {
        dll_.swapWithNext(cmd.lineNumber);
      }
    }

    undoStack_.push(cmd);
    rebuildEditorIndexes();
    return true;
  }

  DynamicArrayPushResult addTask(
      const std::string& title,
      PriorityLevel priority,
      const std::string& deadline,
      int64_t deadlineTimestamp,
      int64_t createdAt) {
    TaskItem task;
    task.id = "task-" + std::to_string(taskCounter_++);
    task.title = title;
    task.priority = priority;
    task.deadline = deadline;
    task.deadlineTimestamp = deadlineTimestamp;
    task.status = TaskStatus::PENDING;
    task.createdAt = createdAt;
    task.heapScore = computeTaskHeapScore(priority, deadlineTimestamp);

    DynamicArrayPushResult arrRes = dynamicArray_.push(task);
    fifoQueue_.enqueue(task);
    maxHeap_.insert(task);
    deadlineBst_.insert(task);
    return arrRes;
  }

  QueueDequeueResult processNextFIFO() {
    QueueDequeueResult res = fifoQueue_.dequeue();
    if (!res.ok) return res;
    TaskItem updated;
    dynamicArray_.updateStatus(res.value.id, TaskStatus::COMPLETED, updated);
    maxHeap_.removeById(res.value.id);
    deadlineBst_.updateTaskStatus(res.value.id, res.value.deadlineTimestamp, TaskStatus::COMPLETED);
    return res;
  }

  HeapExtractResult processMaxHeap() {
    HeapExtractResult res = maxHeap_.extractMax();
    if (!res.ok) return res;
    TaskItem updated;
    dynamicArray_.updateStatus(res.value.id, TaskStatus::COMPLETED, updated);
    fifoQueue_.removeById(res.value.id);
    deadlineBst_.updateTaskStatus(res.value.id, res.value.deadlineTimestamp, TaskStatus::COMPLETED);
    return res;
  }

  bool toggleTaskStatus(const std::string& taskId) {
    const TaskItem* existing = dynamicArray_.findById(taskId);
    if (existing == nullptr) return false;

    TaskStatus nextStatus =
        (existing->status == TaskStatus::COMPLETED) ? TaskStatus::PENDING : TaskStatus::COMPLETED;
    TaskItem updated;
    if (!dynamicArray_.updateStatus(taskId, nextStatus, updated)) return false;

    if (nextStatus == TaskStatus::COMPLETED) {
      fifoQueue_.removeById(taskId);
      maxHeap_.removeById(taskId);
    } else {
      fifoQueue_.enqueue(updated);
      maxHeap_.insert(updated);
    }
    deadlineBst_.updateTaskStatus(taskId, updated.deadlineTimestamp, nextStatus);
    return true;
  }

  bool deleteTask(const std::string& taskId) {
    DynamicArrayRemoveResult res = dynamicArray_.removeById(taskId);
    if (!res.found) return false;
    fifoQueue_.removeById(taskId);
    maxHeap_.removeById(taskId);
    deadlineBst_.remove(taskId, res.removed.deadlineTimestamp);
    return true;
  }

  ProjectSaveResult saveProject(const ProjectSnippet& snippet) {
    return projectStore_.pushOrUpdate(snippet);
  }

  bool deleteProject(const std::string& projectId, ProjectSnippet& outRemoved) {
    return projectStore_.removeById(projectId, outRemoved);
  }

  struct EditorMetrics {
    int wordCount = 0;
    int charCount = 0;
    int lineCount = 0;
    int readingSeconds = 0;
    std::string readingLabel;
  };

  EditorMetrics computeEditorMetrics() const {
    std::vector<std::string> lines = dll_.toTextArray();
    int words = 0;
    int chars = 0;
    for (size_t i = 0; i < lines.size(); ++i) {
      const std::string& text = lines[i];
      chars += static_cast<int>(text.size());
      bool inWord = false;
      for (size_t j = 0; j < text.size(); ++j) {
        char ch = text[j];
        bool isSpace = (ch == ' ' || ch == '\t' || ch == '\n');
        if (!isSpace && !inWord) {
          ++words;
          inWord = true;
        } else if (isSpace) {
          inWord = false;
        }
      }
    }
    int secs = 0;
    if (words > 0) {
      secs = (words * 60 + 199) / 200;
      if (secs < 1) secs = 1;
    }
    std::string label = (secs >= 60)
                            ? (std::to_string((secs + 59) / 60) + " min read")
                            : (std::to_string(secs) + "s read");
    return {words, chars, static_cast<int>(lines.size()), secs, label};
  }

  struct DeletedTrashItem {
    enum class Kind { LINE, TASK, PROJECT };
    std::string id;
    Kind kind = Kind::LINE;
    std::string label;
    int lineNumber = 0;
    std::string lineText;
    TaskItem task;
    ProjectSnippet project;
    std::string deletedAt;
  };

private:
  std::vector<DeletedTrashItem> trashBuffer_;
  int trashCounter_ = 1;

public:
  const std::vector<DeletedTrashItem>& trashItems() const { return trashBuffer_; }

  bool deleteLineToTrash(int lineNumber, const std::string& timestamp = "") {
    DLLDeleteResult res = deleteLine(lineNumber, timestamp);
    if (!res.ok) return false;
    DeletedTrashItem entry;
    entry.id = "trash-" + std::to_string(trashCounter_++);
    entry.kind = DeletedTrashItem::Kind::LINE;
    entry.label = "Line " + std::to_string(lineNumber) + ": " + res.deletedText;
    entry.lineNumber = lineNumber;
    entry.lineText = res.deletedText;
    entry.deletedAt = timestamp;
    trashBuffer_.insert(trashBuffer_.begin(), entry);
    return true;
  }

  bool deleteTaskToTrash(const std::string& taskId, const std::string& timestamp = "") {
    DynamicArrayRemoveResult res = dynamicArray_.removeById(taskId);
    if (!res.found) return false;
    fifoQueue_.removeById(taskId);
    maxHeap_.removeById(taskId);
    deadlineBst_.remove(taskId, res.removed.deadlineTimestamp);

    DeletedTrashItem entry;
    entry.id = "trash-" + std::to_string(trashCounter_++);
    entry.kind = DeletedTrashItem::Kind::TASK;
    entry.label = "Task: " + res.removed.title;
    entry.task = res.removed;
    entry.deletedAt = timestamp;
    trashBuffer_.insert(trashBuffer_.begin(), entry);
    return true;
  }

  bool deleteProjectToTrash(const std::string& projectId, const std::string& timestamp = "") {
    ProjectSnippet removed;
    if (!projectStore_.removeById(projectId, removed)) return false;

    DeletedTrashItem entry;
    entry.id = "trash-" + std::to_string(trashCounter_++);
    entry.kind = DeletedTrashItem::Kind::PROJECT;
    entry.label = "Project: " + removed.title;
    entry.project = removed;
    entry.deletedAt = timestamp;
    trashBuffer_.insert(trashBuffer_.begin(), entry);
    return true;
  }

  bool withdrawLastDelete(const std::string& timestamp = "") {
    if (trashBuffer_.empty()) return false;
    DeletedTrashItem item = trashBuffer_.front();
    trashBuffer_.erase(trashBuffer_.begin());

    if (item.kind == DeletedTrashItem::Kind::LINE) {
      int targetPos = (item.lineNumber > 0) ? item.lineNumber : (dll_.length() + 1);
      LineNode* restored = dll_.insertAt(targetPos, item.lineText);
      EditorCommand cmd;
      cmd.type = EditorOperationType::INSERT_LINE;
      cmd.lineNumber = restored->lineNumber;
      cmd.nextText = item.lineText;
      cmd.description = "Withdrew delete (Line " + std::to_string(restored->lineNumber) + ")";
      cmd.timestamp = timestamp;
      pushUndoCommand(cmd);
      rebuildEditorIndexes();
      return true;
    }

    if (item.kind == DeletedTrashItem::Kind::TASK) {
      dynamicArray_.push(item.task);
      if (item.task.status == TaskStatus::PENDING) {
        fifoQueue_.enqueue(item.task);
        maxHeap_.insert(item.task);
      }
      deadlineBst_.insert(item.task);
      return true;
    }

    projectStore_.pushOrUpdate(item.project);
    return true;
  }

  int clearCompletedTasks() {
    std::vector<TaskItem> all = dynamicArray_.toArray();
    int removed = 0;
    for (size_t i = 0; i < all.size(); ++i) {
      if (all[i].status == TaskStatus::COMPLETED) {
        dynamicArray_.removeById(all[i].id);
        deadlineBst_.remove(all[i].id, all[i].deadlineTimestamp);
        ++removed;
      }
    }
    return removed;
  }

  std::string exportDocumentTxt() const {
    std::string out = noteTitle_ + "\n" + std::string(noteTitle_.size(), '=') + "\n\n";
    std::vector<std::string> lines = dll_.toTextArray();
    for (size_t i = 0; i < lines.size(); ++i) {
      out += lines[i] + "\n";
    }
    return out;
  }

  std::string generateSummaryReportText() const {
    std::vector<TaskItem> tasks = dynamicArray_.toArray();
    int completed = 0;
    for (size_t i = 0; i < tasks.size(); ++i) {
      if (tasks[i].status == TaskStatus::COMPLETED) ++completed;
    }
    TrieStats ts = trie_.getStats();
    HashTableStats hs = hashTable_.getStats();

    std::string report;
    report += "Smart Undo-Redo Text Editor with Task Scheduler — Complexity & DS Summary Report\n";
    report += "===============================================================================\n";
    report += "Document Title: " + noteTitle_ + "\n\n";
    report += "- Doubly Linked List: " + std::to_string(dll_.length()) + " line node(s)\n";
    report += "- Two Stacks (Undo / Redo): " + std::to_string(undoStack_.size()) + " / " + std::to_string(redoStack_.size()) + "\n";
    report += "- Trie (Prefix Tree): " + std::to_string(ts.totalWords) + " unique words, " + std::to_string(ts.totalNodes) + " nodes\n";
    report += "- Hash Table: " + std::to_string(hs.uniqueKeys) + " unique keys, " + std::to_string(hs.collisions) + " collisions\n";
    report += "- Dynamic Array: " + std::to_string(dynamicArray_.length()) + " / " + std::to_string(dynamicArray_.capacity()) + " slots\n";
    report += "- Queue (FIFO): " + std::to_string(fifoQueue_.size()) + " pending task(s)\n";
    report += "- Max-Heap Tree: " + std::to_string(maxHeap_.size()) + " pending task(s)\n";
    report += "- Deadline BST: " + std::to_string(deadlineBst_.size()) + " total (" + std::to_string(completed) + " completed)\n";
    report += "- Project Store: " + std::to_string(projectStore_.length()) + " saved snippet(s)\n";
    return report;
  }
};

} // namespace smart_dsa
