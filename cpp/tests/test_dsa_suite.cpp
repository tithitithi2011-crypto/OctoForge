#include "../src/WorkbenchEngine.cpp"

#include <cassert>
#include <iostream>

using namespace smart_dsa;

int main() {
  SmartDSAWorkbenchEngine engine;

  // 1. Doubly Linked List + Undo/Redo Stacks + Hash Table + Trie
  int l1 = engine.insertLine("Doubly Linked List stores editor lines with prev and next pointers.");
  int l2 = engine.insertLine("Undo and Redo Stacks push frames for O(1) history traversal.");
  int l3 = engine.insertLine("Prefix Trie ranks completions using manual DFS.");
  assert(l1 == 1 && l2 == 2 && l3 == 3);
  assert(engine.document().length() == 3);

  assert(engine.moveLineUp(3));
  assert(engine.document().getNodeAt(2)->lineText == "Prefix Trie ranks completions using manual DFS.");
  assert(engine.undo());
  assert(engine.document().getNodeAt(3)->lineText == "Prefix Trie ranks completions using manual DFS.");
  assert(engine.redo());
  assert(engine.document().getNodeAt(2)->lineText == "Prefix Trie ranks completions using manual DFS.");

  // Word lookup & whole-word replace
  HashLookupResult lookup = engine.hashTable().get("trie");
  assert(lookup.found && lookup.count == 1);
  int replaced = engine.replaceWordAcrossDocument("trie", "TrieTree");
  assert(replaced == 1);
  assert(engine.undo()); // revert replace

  // Trie autocomplete suggestions
  std::vector<TrieSuggestion> sugs = engine.trie().getSuggestions("he", 5);
  assert(!sugs.empty());

  // Title editing undo/redo
  assert(engine.updateNoteTitle("University DSA Viva Notes"));
  assert(engine.noteTitle() == "University DSA Viva Notes");
  assert(engine.undo());
  assert(engine.noteTitle() == "Data Structures & Algorithms Workbench Notes");

  // Underflow check on Redo after new edit
  engine.insertLine("Fresh line clears redo stack.");
  assert(engine.redoStack().isEmpty());
  assert(!engine.redo());

  // 2. Task Scheduler: Dynamic Array (4 -> 8 doubling), FIFO Queue, Max-Heap, Deadline BST
  assert(engine.taskArray().capacity() == 4);
  engine.addTask("Low Priority Task", PriorityLevel::LOW, "2026-11-25T18:00", 1795629600000LL, 1);
  engine.addTask("Medium Priority Task", PriorityLevel::MEDIUM, "2026-11-24T12:00", 1795521600000LL, 2);
  engine.addTask("High Priority Urgent", PriorityLevel::HIGH, "2026-11-24T09:00", 1795510800000LL, 3);
  DynamicArrayPushResult r4 = engine.addTask("Another Medium", PriorityLevel::MEDIUM, "2026-11-26T10:00", 1795687200000LL, 4);
  assert(!r4.resized && engine.taskArray().capacity() == 4);

  DynamicArrayPushResult r5 = engine.addTask("Triggers Resize", PriorityLevel::HIGH, "2026-11-24T08:00", 1795507200000LL, 5);
  assert(r5.resized && r5.oldCapacity == 4 && r5.newCapacity == 8);
  assert(engine.taskArray().capacity() == 8);

  // Max-Heap extracts highest priority + earliest deadline first ("Triggers Resize")
  HeapExtractResult maxRes = engine.processMaxHeap();
  assert(maxRes.ok && maxRes.value.title == "Triggers Resize");

  // FIFO Queue dequeues oldest remaining pending task ("Low Priority Task")
  QueueDequeueResult fifoRes = engine.processNextFIFO();
  assert(fifoRes.ok && fifoRes.value.title == "Low Priority Task");

  // Deadline BST in-order traversal (earliest deadline first) & date range pruning
  std::vector<TaskItem> inOrder = engine.deadlineBst().inOrderTraversal();
  assert(inOrder.size() == 5);
  for (size_t i = 1; i < inOrder.size(); ++i) {
    assert(inOrder[i - 1].deadlineTimestamp <= inOrder[i].deadlineTimestamp);
  }
  BSTSearchResult dateHits = engine.deadlineBst().searchByDatePrefix("2026-11-24");
  assert(dateHits.found && dateHits.matches.size() == 3);
  BSTSearchResult prunedHits = engine.deadlineBst().searchByDate("2026-11-24");
  assert(prunedHits.found && prunedHits.matches.size() == 3);

  // Editor Metrics & Trash Withdraw Delete
  auto metrics = engine.computeEditorMetrics();
  assert(metrics.lineCount == 4 && metrics.wordCount > 10);
  assert(engine.deleteLineToTrash(4));
  assert(engine.document().length() == 3 && engine.trashItems().size() == 1);
  assert(engine.withdrawLastDelete());
  assert(engine.document().length() == 4 && engine.trashItems().empty());

  // Clear completed tasks
  assert(engine.clearCompletedTasks() == 2);

  // 3. Project Store: Multi-Language Detection + Syntax Tokenization + Collection
  std::string mixedCode =
      "import java.util.*;\n"
      "public class Demo {\n"
      "    public static void main(String[] args) { System.out.println(\"Hi\"); }\n"
      "}\n"
      "#include <iostream>\n"
      "int main() { std::cout << 42; return 0; }\n";

  LanguageDetectionResult langRes = detectCodeLanguages(mixedCode);
  assert(langRes.languages.size() == 2);
  assert(langRes.languages[0] == ProjectLanguage::CPP);
  assert(langRes.languages[1] == ProjectLanguage::JAVA);

  std::vector<SyntaxToken> tokens = tokenizeCodeForHighlight(mixedCode);
  assert(!tokens.empty());

  ProjectSnippet proj;
  proj.id = "proj-1";
  proj.title = "Java + C++ Combined Demo";
  proj.code = mixedCode;
  proj.languages = langRes.languages;
  ProjectSaveResult saveRes = engine.saveProject(proj);
  assert(!saveRes.updated && engine.projectStore().length() == 1);
  assert(engine.projectStore().findById("proj-1") != nullptr);
  assert(sanitizeFileSlug(proj.title) == "java-c-combined-demo");
  assert(!engine.generateSummaryReportText().empty());

  std::cout << "All 9 C++17 data structures and algorithmic tests passed!" << std::endl;
  return 0;
}
