#pragma once

#include "types.hpp"
#include <regex>
#include <string>
#include <vector>

namespace smart_dsa {

struct LanguageDetectionResult {
  std::vector<ProjectLanguage> languages;
  std::vector<std::string> cppSignals;
  std::vector<std::string> cSignals;
  std::vector<std::string> pythonSignals;
  std::vector<std::string> javaSignals;
};

struct ProjectSaveResult {
  bool updated = false;
  bool resized = false;
  int oldCapacity = 0;
  int newCapacity = 0;
};

inline std::string getExtensionForLanguage(ProjectLanguage lang) {
  if (lang == ProjectLanguage::CPP) return "cpp";
  if (lang == ProjectLanguage::C) return "c";
  if (lang == ProjectLanguage::PYTHON) return "py";
  return "java";
}

inline std::string getLanguageDisplayName(ProjectLanguage lang) {
  if (lang == ProjectLanguage::CPP) return "C++";
  if (lang == ProjectLanguage::C) return "C";
  if (lang == ProjectLanguage::PYTHON) return "Python";
  return "Java";
}

inline std::string sanitizeFileSlug(const std::string& title) {
  std::string out;
  bool lastDash = false;
  for (size_t i = 0; i < title.size(); ++i) {
    char ch = title[i];
    if (ch >= 'A' && ch <= 'Z') ch = static_cast<char>(ch + 32);
    bool isAlphaNum = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (isAlphaNum) {
      out.push_back(ch);
      lastDash = false;
    } else if (!lastDash && !out.empty()) {
      out.push_back('-');
      lastDash = true;
    }
  }
  while (!out.empty() && out.back() == '-') {
    out.pop_back();
  }
  return out.empty() ? "project-snippet" : out;
}

inline std::string formatProjectBundle(
    const std::string& title,
    const std::string& code,
    const std::vector<ProjectLanguage>& languages) {
  std::string langList;
  for (size_t i = 0; i < languages.size(); ++i) {
    if (i > 0) langList += ", ";
    langList += getLanguageDisplayName(languages[i]);
  }
  if (langList.empty()) langList = "Plain Text";
  return "/* Project: " + title + "\n * Detected Languages: " + langList + "\n */\n\n" + code;
}

inline void addSignalUnique(std::vector<std::string>& list, const std::string& label) {
  for (size_t i = 0; i < list.size(); ++i) {
    if (list[i] == label) return;
  }
  list.push_back(label);
}

/**
 * Deterministic multi-language syntax analyzer in C++.
 * Evaluates C++, C, Python, and Java patterns independently so combined snippets
 * highlight all matching languages simultaneously.
 */
inline LanguageDetectionResult detectCodeLanguages(const std::string& code) {
  LanguageDetectionResult res;

  bool hasNonSpace = false;
  for (size_t i = 0; i < code.size(); ++i) {
    if (code[i] != ' ' && code[i] != '\t' && code[i] != '\n' && code[i] != '\r') {
      hasNonSpace = true;
      break;
    }
  }
  if (!hasNonSpace) return res;

  // --- C++ Patterns ---
  if (std::regex_search(code, std::regex("#include\\s*<(iostream|vector|algorithm|map|unordered_map|set|queue|stack|bits/stdc\\+\\+\\.h|string)>"))) {
    addSignalUnique(res.cppSignals, "#include <C++ header>");
  }
  if (std::regex_search(code, std::regex("\\bstd::"))) addSignalUnique(res.cppSignals, "std::");
  if (std::regex_search(code, std::regex("\\busing\\s+namespace\\s+std\\s*;"))) addSignalUnique(res.cppSignals, "using namespace std");
  if (std::regex_search(code, std::regex("\\b(cout|cerr)\\s*<<")) || std::regex_search(code, std::regex("\\bcin\\s*>>"))) {
    addSignalUnique(res.cppSignals, "cout / cin");
  }
  if (std::regex_search(code, std::regex("\\b(vector|unordered_map|priority_queue|pair)\\s*<"))) {
    addSignalUnique(res.cppSignals, "STL template <...>");
  }
  if (std::regex_search(code, std::regex("\\bnullptr\\b"))) addSignalUnique(res.cppSignals, "nullptr");
  if (std::regex_search(code, std::regex("\\btemplate\\s*<"))) addSignalUnique(res.cppSignals, "template <...>");

  // --- C Patterns ---
  if (std::regex_search(code, std::regex("#include\\s*<(stdio\\.h|stdlib\\.h|string\\.h|stdbool\\.h|ctype\\.h|math\\.h)>"))) {
    addSignalUnique(res.cSignals, "#include <stdio.h/stdlib.h>");
  }
  if (std::regex_search(code, std::regex("\\b(printf|fprintf|sprintf)\\s*\\("))) addSignalUnique(res.cSignals, "printf(...)");
  if (std::regex_search(code, std::regex("\\b(scanf|fscanf|sscanf)\\s*\\("))) addSignalUnique(res.cSignals, "scanf(...)");
  if (std::regex_search(code, std::regex("\\b(malloc|calloc|realloc|free)\\s*\\("))) addSignalUnique(res.cSignals, "malloc/free(...)");
  if (std::regex_search(code, std::regex("\\btypedef\\s+struct\\b"))) addSignalUnique(res.cSignals, "typedef struct");
  if (std::regex_search(code, std::regex("\\bint\\s+main\\s*\\(\\s*(void)?\\s*\\)")) &&
      !std::regex_search(code, std::regex("\\bstd::|\\bcout\\s*<<|#include\\s*<iostream>"))) {
    addSignalUnique(res.cSignals, "int main()");
  }

  // --- Java Patterns ---
  if (std::regex_search(code, std::regex("\\bpublic\\s+class\\s+[A-Za-z_]\\w*"))) addSignalUnique(res.javaSignals, "public class");
  if (std::regex_search(code, std::regex("\\bpublic\\s+static\\s+void\\s+main\\s*\\(\\s*String"))) addSignalUnique(res.javaSignals, "public static void main");
  if (std::regex_search(code, std::regex("\\bSystem\\.out\\.(println|print|printf)\\s*\\("))) addSignalUnique(res.javaSignals, "System.out.println");
  if (std::regex_search(code, std::regex("\\bimport\\s+java\\."))) addSignalUnique(res.javaSignals, "import java.*");
  if (std::regex_search(code, std::regex("\\bnew\\s+Scanner\\s*\\(\\s*System\\.in\\s*\\)"))) addSignalUnique(res.javaSignals, "Scanner(System.in)");
  if (std::regex_search(code, std::regex("\\b(ArrayList|HashMap|LinkedList|StringBuilder)\\s*<"))) addSignalUnique(res.javaSignals, "Java Collections");
  if (std::regex_search(code, std::regex("@Override\\b"))) addSignalUnique(res.javaSignals, "@Override");

  // --- Python Patterns ---
  if (std::regex_search(code, std::regex("(^|\\n)\\s*def\\s+[A-Za-z_]\\w*\\s*\\([^)]*\\)\\s*:"))) addSignalUnique(res.pythonSignals, "def func():");
  if (std::regex_search(code, std::regex("(^|\\n)\\s*elif\\b.*:"))) addSignalUnique(res.pythonSignals, "elif ...:");
  if (std::regex_search(code, std::regex("(^|\\n)\\s*from\\s+[A-Za-z_][\\w.]*\\s+import\\s+"))) addSignalUnique(res.pythonSignals, "from ... import");
  if (std::regex_search(code, std::regex("(^|\\n)\\s*import\\s+[A-Za-z_]\\w*(\\s+as\\s+[A-Za-z_]\\w*)?(\\s*,\\s*[A-Za-z_]\\w*)*\\s*(\\n|$)"))) {
    addSignalUnique(res.pythonSignals, "import module");
  }
  if (code.find("if __name__ == \"__main__\":") != std::string::npos ||
      code.find("if __name__ == '__main__':") != std::string::npos) {
    addSignalUnique(res.pythonSignals, "__name__ == \"__main__\"");
  }
  if (std::regex_search(code, std::regex("(^|[^\\w.])print\\s*\\([^);]*\\)\\s*(#[^\\n]*)?(\\n|$)"))) {
    addSignalUnique(res.pythonSignals, "print(...)");
  }

  if (!res.cppSignals.empty()) res.languages.push_back(ProjectLanguage::CPP);
  if (!res.cSignals.empty()) res.languages.push_back(ProjectLanguage::C);
  if (!res.pythonSignals.empty()) res.languages.push_back(ProjectLanguage::PYTHON);
  if (!res.javaSignals.empty()) res.languages.push_back(ProjectLanguage::JAVA);

  return res;
}

/**
 * Manual single-pass C++ syntax tokenizer matching Code::Blocks / VS Code Light+ colors.
 */
inline std::vector<SyntaxToken> tokenizeCodeForHighlight(const std::string& code) {
  auto isControlKeyword = [](const std::string& w) {
    return w == "if" || w == "else" || w == "elif" || w == "for" || w == "while" || w == "do" ||
           w == "switch" || w == "case" || w == "default" || w == "break" || w == "continue" ||
           w == "return" || w == "try" || w == "catch" || w == "finally" || w == "throw" ||
           w == "throws" || w == "except" || w == "raise" || w == "with" || w == "as" ||
           w == "yield" || w == "import" || w == "from" || w == "package" || w == "using";
  };

  auto isGeneralKeyword = [](const std::string& w) {
    return w == "public" || w == "private" || w == "protected" || w == "static" || w == "final" ||
           w == "const" || w == "constexpr" || w == "virtual" || w == "override" || w == "class" ||
           w == "struct" || w == "typedef" || w == "enum" || w == "interface" || w == "extends" ||
           w == "implements" || w == "namespace" || w == "template" || w == "typename" || w == "def" ||
           w == "lambda" || w == "new" || w == "delete" || w == "sizeof" || w == "this" ||
           w == "self" || w == "super" || w == "in" || w == "is" || w == "not" || w == "and" ||
           w == "or" || w == "pass" || w == "global" || w == "nonlocal" || w == "nullptr" ||
           w == "null" || w == "NULL" || w == "true" || w == "false" || w == "True" ||
           w == "False" || w == "None" || w == "async" || w == "await";
  };

  auto isTypeToken = [](const std::string& w) {
    return w == "void" || w == "int" || w == "long" || w == "short" || w == "double" ||
           w == "float" || w == "char" || w == "bool" || w == "boolean" || w == "byte" ||
           w == "auto" || w == "unsigned" || w == "signed" || w == "size_t" || w == "String" ||
           w == "string" || w == "Scanner" || w == "System" || w == "out" || w == "std" ||
           w == "cout" || w == "cin" || w == "cerr" || w == "endl" || w == "vector" ||
           w == "map" || w == "unordered_map" || w == "set" || w == "queue" || w == "stack" ||
           w == "priority_queue" || w == "pair" || w == "ArrayList" || w == "HashMap" ||
           w == "LinkedList" || w == "StringBuilder" || w == "Node" || w == "list" ||
           w == "dict" || w == "tuple" || w == "str";
  };

  auto isWordStart = [](char ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch == '_' || ch == '@';
  };
  auto isWordPart = [](char ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_';
  };
  auto isDigit = [](char ch) { return ch >= '0' && ch <= '9'; };
  auto isOperator = [](char ch) {
    const std::string ops = "{}()[]<>+-*/%=!&|^~:;,.?";
    return ops.find(ch) != std::string::npos;
  };

  std::vector<SyntaxToken> tokens;
  size_t n = code.size();
  size_t i = 0;

  while (i < n) {
    char ch = code[i];

    // Line comment //
    if (ch == '/' && i + 1 < n && code[i + 1] == '/') {
      size_t end = i + 2;
      while (end < n && code[end] != '\n') ++end;
      tokens.push_back({SyntaxTokenType::COMMENT, code.substr(i, end - i)});
      i = end;
      continue;
    }

    // Block comment /* */
    if (ch == '/' && i + 1 < n && code[i + 1] == '*') {
      size_t end = i + 2;
      while (end + 1 < n && !(code[end] == '*' && code[end + 1] == '/')) ++end;
      end = (end + 1 < n) ? end + 2 : n;
      tokens.push_back({SyntaxTokenType::COMMENT, code.substr(i, end - i)});
      i = end;
      continue;
    }

    // Preprocessor vs Python # comment
    if (ch == '#') {
      std::string rest = code.substr(i, 16);
      bool isPreproc = std::regex_search(rest, std::regex("^#(include|define|ifdef|ifndef|endif|pragma|if|else|elif)\\b"));
      size_t end = i + 1;
      while (end < n && code[end] != '\n') ++end;
      tokens.push_back({isPreproc ? SyntaxTokenType::PREPROCESSOR : SyntaxTokenType::COMMENT, code.substr(i, end - i)});
      i = end;
      continue;
    }

    // Strings
    if (ch == '"' || ch == '\'') {
      char quote = ch;
      size_t end = i + 1;
      while (end < n) {
        if (code[end] == '\\' && end + 1 < n) {
          end += 2;
          continue;
        }
        if (code[end] == quote || code[end] == '\n') {
          if (code[end] == quote) ++end;
          break;
        }
        ++end;
      }
      tokens.push_back({SyntaxTokenType::STRING, code.substr(i, end - i)});
      i = end;
      continue;
    }

    // Numbers
    if (isDigit(ch)) {
      size_t end = i + 1;
      while (end < n && (isWordPart(code[end]) || code[end] == '.')) ++end;
      tokens.push_back({SyntaxTokenType::NUMBER, code.substr(i, end - i)});
      i = end;
      continue;
    }

    // Identifiers
    if (isWordStart(ch)) {
      size_t end = i + 1;
      while (end < n && isWordPart(code[end])) ++end;
      std::string word = code.substr(i, end - i);

      SyntaxTokenType t = SyntaxTokenType::PLAIN;
      if (!word.empty() && word[0] == '@') {
        t = SyntaxTokenType::PREPROCESSOR;
      } else if (isControlKeyword(word)) {
        t = SyntaxTokenType::CONTROL;
      } else if (isGeneralKeyword(word)) {
        t = SyntaxTokenType::KEYWORD;
      } else if (isTypeToken(word)) {
        t = SyntaxTokenType::TYPE;
      } else {
        size_t look = end;
        while (look < n && code[look] == ' ') ++look;
        if (look < n && code[look] == '(') {
          t = SyntaxTokenType::FUNCTION;
        }
      }
      tokens.push_back({t, word});
      i = end;
      continue;
    }

    // Operators
    if (isOperator(ch)) {
      tokens.push_back({SyntaxTokenType::OPERATOR, std::string(1, ch)});
      ++i;
      continue;
    }

    // Whitespace
    size_t end = i + 1;
    while (end < n && (code[end] == ' ' || code[end] == '\t' || code[end] == '\n' || code[end] == '\r')) {
      ++end;
    }
    tokens.push_back({SyntaxTokenType::PLAIN, code.substr(i, end - i)});
    i = end;
  }

  return tokens;
}

struct ProjectHashEntry {
  std::string key;
  ProjectSnippet* project = nullptr;
  ProjectHashEntry* next = nullptr;
};

/**
 * Manual Dynamic Array + Separate-Chaining Hash Index backing the Project Store.
 */
class ProjectStoreCollection {
private:
  ProjectSnippet** buffer_ = nullptr;
  int count_ = 0;
  int capacity_ = 4;
  static constexpr int BUCKET_COUNT = 16;
  ProjectHashEntry* buckets_[BUCKET_COUNT]{};

  static int hashKey(const std::string& key) {
    uint64_t hash = 5381;
    for (size_t i = 0; i < key.size(); ++i) {
      hash = (hash * 33ULL + static_cast<unsigned char>(key[i])) % 1000000007ULL;
    }
    return static_cast<int>(hash % BUCKET_COUNT);
  }

  void clearHashIndex() {
    for (int i = 0; i < BUCKET_COUNT; ++i) {
      ProjectHashEntry* curr = buckets_[i];
      while (curr != nullptr) {
        ProjectHashEntry* next = curr->next;
        delete curr;
        curr = next;
      }
      buckets_[i] = nullptr;
    }
  }

  void rebuildHashIndex() {
    clearHashIndex();
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr) {
        int idx = hashKey(buffer_[i]->id);
        buckets_[idx] = new ProjectHashEntry{buffer_[i]->id, buffer_[i], buckets_[idx]};
      }
    }
  }

  void resize(int newCapacity) {
    ProjectSnippet** nextBuffer = new ProjectSnippet*[newCapacity];
    for (int i = 0; i < newCapacity; ++i) {
      nextBuffer[i] = (i < count_) ? buffer_[i] : nullptr;
    }
    delete[] buffer_;
    buffer_ = nextBuffer;
    capacity_ = newCapacity;
  }

  void allocateInitial(int initialCapacity) {
    capacity_ = initialCapacity > 0 ? initialCapacity : 4;
    buffer_ = new ProjectSnippet*[capacity_];
    for (int i = 0; i < capacity_; ++i) {
      buffer_[i] = nullptr;
    }
    count_ = 0;
  }

public:
  explicit ProjectStoreCollection(int initialCapacity = 4) {
    for (int i = 0; i < BUCKET_COUNT; ++i) buckets_[i] = nullptr;
    allocateInitial(initialCapacity);
  }

  ~ProjectStoreCollection() {
    clear(false);
    delete[] buffer_;
    buffer_ = nullptr;
  }

  ProjectStoreCollection(const ProjectStoreCollection&) = delete;
  ProjectStoreCollection& operator=(const ProjectStoreCollection&) = delete;

  int length() const { return count_; }
  int capacity() const { return capacity_; }

  const ProjectSnippet* findById(const std::string& id) const {
    int idx = hashKey(id);
    ProjectHashEntry* curr = buckets_[idx];
    while (curr != nullptr) {
      if (curr->key == id) return curr->project;
      curr = curr->next;
    }
    return nullptr;
  }

  ProjectSaveResult pushOrUpdate(const ProjectSnippet& project) {
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr && buffer_[i]->id == project.id) {
        *buffer_[i] = project;
        rebuildHashIndex();
        return {true, false, capacity_, capacity_};
      }
    }

    int oldCap = capacity_;
    bool resized = false;
    if (count_ == capacity_) {
      resize(capacity_ * 2);
      resized = true;
    }

    for (int i = count_; i > 0; --i) {
      buffer_[i] = buffer_[i - 1];
    }
    buffer_[0] = new ProjectSnippet(project);
    ++count_;
    rebuildHashIndex();
    return {false, resized, oldCap, capacity_};
  }

  bool removeById(const std::string& id, ProjectSnippet& outRemoved) {
    int foundIdx = -1;
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr && buffer_[i]->id == id) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx == -1) return false;

    outRemoved = *buffer_[foundIdx];
    delete buffer_[foundIdx];
    for (int i = foundIdx; i < count_ - 1; ++i) {
      buffer_[i] = buffer_[i + 1];
    }
    --count_;
    buffer_[count_] = nullptr;
    rebuildHashIndex();
    return true;
  }

  std::vector<ProjectSnippet> filterByLanguage(ProjectLanguage lang) const {
    std::vector<ProjectSnippet> out;
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] == nullptr) continue;
      for (size_t j = 0; j < buffer_[i]->languages.size(); ++j) {
        if (buffer_[i]->languages[j] == lang) {
          out.push_back(*buffer_[i]);
          break;
        }
      }
    }
    return out;
  }

  std::vector<ProjectSnippet> toArray() const {
    std::vector<ProjectSnippet> out;
    out.reserve(count_);
    for (int i = 0; i < count_; ++i) {
      if (buffer_[i] != nullptr) out.push_back(*buffer_[i]);
    }
    return out;
  }

  void clear(bool resetBuffer = true) {
    clearHashIndex();
    for (int i = 0; i < count_; ++i) {
      delete buffer_[i];
      buffer_[i] = nullptr;
    }
    count_ = 0;
    if (resetBuffer) {
      delete[] buffer_;
      allocateInitial(4);
    }
  }
};

} // namespace smart_dsa
