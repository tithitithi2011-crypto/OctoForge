#pragma once

#include "types.hpp"
#include <string>
#include <vector>

namespace smart_dsa {

struct TrieNode {
  static constexpr int ALPHABET_SIZE = 36; // 'a'-'z' (0..25), '0'-'9' (26..35)
  char ch = '\0';
  TrieNode* children[ALPHABET_SIZE];
  bool isEndOfWord = false;
  int frequency = 0;
  std::string nodeId;

  TrieNode(char c, const std::string& id) : ch(c), nodeId(id) {
    for (int i = 0; i < ALPHABET_SIZE; ++i) {
      children[i] = nullptr;
    }
  }
};

struct TrieStats {
  int totalWords = 0;
  int totalNodes = 0;
};

inline const std::vector<std::string>& getSeedDictionaryWords() {
  static const std::vector<std::string> words = {
      "algorithm", "array", "balance", "binary", "bucket", "capacity",
      "complexity", "data", "deadline", "delete", "dequeue", "doubly",
      "dynamic", "editor", "enqueue", "frequency", "hash", "heap",
      "heapify", "inorder", "insert", "linked", "list", "node",
      "pointer", "prefix", "priority", "queue", "redo", "resize",
      "scheduler", "search", "stack", "structure", "task", "traversal",
      "tree", "trie", "underflow", "undo", "update", "workbench"
  };
  return words;
}

/**
 * Manual Prefix Trie with fixed 36-branch child array ('a'-'z', '0'-'9') and frequency ranking.
 */
class AutocompleteTrie {
private:
  TrieNode* root_ = nullptr;
  int totalWords_ = 0;
  int totalNodes_ = 1;
  int nodeCounter_ = 1;

  TrieNode* createNode(char ch) {
    std::string id = "t-" + std::to_string(nodeCounter_++);
    return new TrieNode(ch, id);
  }

  void destroySubtree(TrieNode* node) {
    if (node == nullptr) return;
    for (int i = 0; i < TrieNode::ALPHABET_SIZE; ++i) {
      destroySubtree(node->children[i]);
    }
    delete node;
  }

  static int charToSlot(char ch) {
    if (ch >= 'a' && ch <= 'z') return ch - 'a';
    if (ch >= '0' && ch <= '9') return 26 + (ch - '0');
    return -1;
  }

  static char slotToChar(int slot) {
    if (slot >= 0 && slot < 26) return static_cast<char>('a' + slot);
    return static_cast<char>('0' + (slot - 26));
  }

  static std::string normalizeWord(const std::string& raw) {
    std::string cleaned;
    cleaned.reserve(raw.size());
    for (size_t i = 0; i < raw.size(); ++i) {
      char ch = raw[i];
      if (ch >= 'A' && ch <= 'Z') {
        cleaned.push_back(static_cast<char>(ch + 32));
      } else if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
        cleaned.push_back(ch);
      }
    }
    return cleaned;
  }

  void collectWordsDFS(TrieNode* node, const std::string& currentPrefix, std::vector<TrieSuggestion>& results) const {
    if (node->isEndOfWord) {
      results.push_back({currentPrefix, node->frequency});
    }
    // Alphabetical order: digits ('0'-'9') vs letters ('a'-'z') or ASCII order
    std::vector<int> activeSlots;
    for (int i = 26; i < 36; ++i) {
      if (node->children[i] != nullptr) activeSlots.push_back(i);
    }
    for (int i = 0; i < 26; ++i) {
      if (node->children[i] != nullptr) activeSlots.push_back(i);
    }
    for (size_t i = 0; i < activeSlots.size(); ++i) {
      int slot = activeSlots[i];
      collectWordsDFS(node->children[slot], currentPrefix + slotToChar(slot), results);
    }
  }

  void inspectDFS(
      TrieNode* node,
      const std::string& currPrefix,
      int depth,
      int maxNodes,
      std::vector<TrieNodeInspection>& result) const {
    if (static_cast<int>(result.size()) >= maxNodes) return;

    std::vector<std::string> childKeys;
    for (int i = 26; i < 36; ++i) {
      if (node->children[i] != nullptr) {
        childKeys.push_back(std::string(1, slotToChar(i)));
      }
    }
    for (int i = 0; i < 26; ++i) {
      if (node->children[i] != nullptr) {
        childKeys.push_back(std::string(1, slotToChar(i)));
      }
    }

    TrieNodeInspection insp;
    insp.nodeId = node->nodeId;
    insp.ch = (node->ch == '\0') ? "ROOT" : std::string(1, node->ch);
    insp.prefix = currPrefix.empty() ? "ε" : currPrefix;
    insp.isEndOfWord = node->isEndOfWord;
    insp.frequency = node->frequency;
    insp.childKeys = childKeys;
    insp.depth = depth;
    result.push_back(insp);

    for (size_t i = 0; i < childKeys.size(); ++i) {
      int slot = charToSlot(childKeys[i][0]);
      if (slot >= 0 && node->children[slot] != nullptr) {
        inspectDFS(node->children[slot], currPrefix + childKeys[i], depth + 1, maxNodes, result);
      }
    }
  }

public:
  AutocompleteTrie() {
    root_ = createNode('\0');
  }

  ~AutocompleteTrie() {
    destroySubtree(root_);
    root_ = nullptr;
  }

  AutocompleteTrie(const AutocompleteTrie&) = delete;
  AutocompleteTrie& operator=(const AutocompleteTrie&) = delete;

  bool insert(const std::string& rawWord, int weight = 1) {
    std::string word = normalizeWord(rawWord);
    if (word.empty()) return false;

    TrieNode* curr = root_;
    for (size_t i = 0; i < word.size(); ++i) {
      int slot = charToSlot(word[i]);
      if (slot < 0) continue;
      if (curr->children[slot] == nullptr) {
        curr->children[slot] = createNode(word[i]);
        ++totalNodes_;
      }
      curr = curr->children[slot];
    }

    if (!curr->isEndOfWord) {
      curr->isEndOfWord = true;
      ++totalWords_;
    }
    curr->frequency += weight;
    return true;
  }

  bool search(const std::string& rawWord) const {
    std::string word = normalizeWord(rawWord);
    if (word.empty()) return false;
    TrieNode* curr = root_;
    for (size_t i = 0; i < word.size(); ++i) {
      int slot = charToSlot(word[i]);
      if (slot < 0 || curr->children[slot] == nullptr) return false;
      curr = curr->children[slot];
    }
    return curr->isEndOfWord;
  }

  TrieNode* startsWith(const std::string& rawPrefix) const {
    std::string prefix = normalizeWord(rawPrefix);
    if (prefix.empty()) return nullptr;
    TrieNode* curr = root_;
    for (size_t i = 0; i < prefix.size(); ++i) {
      int slot = charToSlot(prefix[i]);
      if (slot < 0 || curr->children[slot] == nullptr) return nullptr;
      curr = curr->children[slot];
    }
    return curr;
  }

  std::vector<TrieSuggestion> getSuggestions(const std::string& rawPrefix, int limit = 6) const {
    std::string prefix = normalizeWord(rawPrefix);
    if (prefix.empty()) return {};

    TrieNode* prefixNode = startsWith(prefix);
    if (prefixNode == nullptr) return {};

    std::vector<TrieSuggestion> collected;
    collectWordsDFS(prefixNode, prefix, collected);

    // Manual insertion sort: highest frequency first, then alphabetical
    for (size_t i = 1; i < collected.size(); ++i) {
      TrieSuggestion current = collected[i];
      int j = static_cast<int>(i) - 1;
      while (j >= 0 &&
             (collected[j].frequency < current.frequency ||
              (collected[j].frequency == current.frequency && collected[j].word > current.word))) {
        collected[j + 1] = collected[j];
        --j;
      }
      collected[j + 1] = current;
    }

    if (static_cast<int>(collected.size()) > limit) {
      collected.resize(limit);
    }
    return collected;
  }

  void clear() {
    destroySubtree(root_);
    nodeCounter_ = 1;
    root_ = createNode('\0');
    totalWords_ = 0;
    totalNodes_ = 1;
  }

  void rebuildFromLines(const std::vector<std::string>& lines, bool includeSeedWords = true) {
    clear();
    if (includeSeedWords) {
      const auto& seeds = getSeedDictionaryWords();
      for (size_t i = 0; i < seeds.size(); ++i) {
        insert(seeds[i], 1);
      }
    }
    for (size_t l = 0; l < lines.size(); ++l) {
      const std::string& line = lines[l];
      std::string token;
      for (size_t c = 0; c < line.size(); ++c) {
        char ch = line[c];
        bool isAlphaNum =
            (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
        if (isAlphaNum) {
          token.push_back(ch);
        } else if (!token.empty()) {
          insert(token, 2);
          token.clear();
        }
      }
      if (!token.empty()) {
        insert(token, 2);
      }
    }
  }

  TrieStats getStats() const {
    return {totalWords_, totalNodes_};
  }

  std::vector<TrieNodeInspection> inspectPrefixBranch(const std::string& rawPrefix, int maxNodes = 40) const {
    std::string prefix = normalizeWord(rawPrefix);
    TrieNode* startNode = !prefix.empty() ? startsWith(prefix) : root_;
    if (startNode == nullptr) return {};

    std::vector<TrieNodeInspection> result;
    inspectDFS(startNode, prefix, 0, maxNodes, result);
    return result;
  }
};

} // namespace smart_dsa
