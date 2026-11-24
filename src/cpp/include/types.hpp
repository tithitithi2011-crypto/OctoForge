#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace smart_dsa {

enum class PriorityLevel {
  HIGH,
  MEDIUM,
  LOW
};

enum class TaskStatus {
  PENDING,
  COMPLETED
};

enum class EditorOperationType {
  INSERT_LINE,
  UPDATE_LINE,
  DELETE_LINE,
  REPLACE_WORD,
  UPDATE_TITLE,
  MOVE_LINE
};

enum class ProjectLanguage {
  CPP,
  C,
  PYTHON,
  JAVA
};

enum class SyntaxTokenType {
  COMMENT,
  PREPROCESSOR,
  STRING,
  NUMBER,
  CONTROL,
  KEYWORD,
  TYPE,
  FUNCTION,
  OPERATOR,
  PLAIN
};

enum class AlertSeverity {
  NOMINAL,
  RESIZE,
  UNDERFLOW,
  NOT_FOUND,
  INVALID
};

struct TaskItem {
  std::string id;
  std::string title;
  PriorityLevel priority = PriorityLevel::MEDIUM;
  std::string deadline; // YYYY-MM-DDTHH:mm
  int64_t deadlineTimestamp = 0;
  TaskStatus status = TaskStatus::PENDING;
  int64_t createdAt = 0;
  int64_t heapScore = 0;
};

struct EditorCommand {
  std::string id;
  EditorOperationType type = EditorOperationType::INSERT_LINE;
  int lineNumber = 0;
  int targetLineNumber = 0;
  bool hasTargetLineNumber = false;
  std::string prevText;
  std::string nextText;
  std::string prevTitle;
  std::string nextTitle;
  std::vector<std::string> prevSnapshot;
  std::vector<std::string> nextSnapshot;
  std::string description;
  std::string timestamp;
};

struct DLLNodeSnapshot {
  std::string id;
  int lineNumber = 0;
  std::string lineText;
  int prevLineNumber = -1; // -1 denotes null
  int nextLineNumber = -1; // -1 denotes null
};

struct TrieSuggestion {
  std::string word;
  int frequency = 0;
};

struct TrieNodeInspection {
  std::string nodeId;
  std::string ch;
  std::string prefix;
  bool isEndOfWord = false;
  int frequency = 0;
  std::vector<std::string> childKeys;
  int depth = 0;
};

struct HashLookupResult {
  bool found = false;
  std::string key;
  int count = 0;
  std::vector<int> lineNumbers;
  int bucketIndex = -1;
  int probeSteps = 0;
};

struct HashBucketChainItem {
  std::string key;
  int count = 0;
  std::vector<int> lineNumbers;
};

struct HashBucketSnapshot {
  int index = 0;
  std::vector<HashBucketChainItem> chain;
};

struct WordFrequencyEntry {
  std::string word;
  int count = 0;
  std::vector<int> lineNumbers;
  int bucketIndex = 0;
};

struct BSTSearchResult {
  bool found = false;
  std::vector<TaskItem> matches;
  int comparisons = 0;
  std::vector<std::string> visitedIds;
};

struct BSTVisualNode {
  std::string id;
  TaskItem task;
  int x = 0;
  int y = 0;
  std::string leftId;
  std::string rightId;
};

struct SyntaxToken {
  SyntaxTokenType type = SyntaxTokenType::PLAIN;
  std::string value;
};

struct ProjectSnippet {
  std::string id;
  std::string title;
  std::string code;
  std::vector<ProjectLanguage> languages;
  bool isManualOverride = false;
  std::string createdAt;
  std::string updatedAt;
};

} // namespace smart_dsa
