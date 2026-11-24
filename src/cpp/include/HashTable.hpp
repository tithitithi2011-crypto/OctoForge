#pragma once

#include "types.hpp"
#include <cmath>
#include <string>
#include <vector>

namespace smart_dsa {

struct HashEntry {
  std::string key;
  int count = 0;
  std::vector<int> lineNumbers;
  HashEntry* next = nullptr;
};

struct HashTableStats {
  int uniqueKeys = 0;
  int totalOccurrences = 0;
  double loadFactor = 0.0;
  int collisions = 0;
};

struct WholeWordReplaceResult {
  std::string updatedLine;
  int replacements = 0;
};

/**
 * Manual Separate-Chaining Hash Table for word frequency indexing and O(1) average lookup.
 */
class WordFrequencyHashTable {
private:
  int bucketCount_ = 16;
  HashEntry** buckets_ = nullptr;
  int uniqueKeyCount_ = 0;
  int totalWordOccurrences_ = 0;

  static void addLineNumberUnique(std::vector<int>& arr, int lineNumber) {
    for (size_t i = 0; i < arr.size(); ++i) {
      if (arr[i] == lineNumber) return;
    }
    arr.push_back(lineNumber);
  }

  static bool isAlphaNumChar(char ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
  }

public:
  explicit WordFrequencyHashTable(int bucketCount = 16)
      : bucketCount_(bucketCount > 0 ? bucketCount : 16) {
    buckets_ = new HashEntry*[bucketCount_];
    for (int i = 0; i < bucketCount_; ++i) {
      buckets_[i] = nullptr;
    }
  }

  ~WordFrequencyHashTable() {
    clear();
    delete[] buckets_;
    buckets_ = nullptr;
  }

  WordFrequencyHashTable(const WordFrequencyHashTable&) = delete;
  WordFrequencyHashTable& operator=(const WordFrequencyHashTable&) = delete;

  int bucketCount() const { return bucketCount_; }

  static std::string normalizeKey(const std::string& raw) {
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

  // Polynomial rolling hash (base 31 mod bucketCount)
  int hash(const std::string& key) const {
    int hashVal = 0;
    const int prime = 31;
    for (size_t i = 0; i < key.size(); ++i) {
      hashVal = (hashVal * prime + static_cast<unsigned char>(key[i])) % bucketCount_;
    }
    return hashVal;
  }

  void put(const std::string& rawWord, int lineNumber) {
    std::string key = normalizeKey(rawWord);
    if (key.empty()) return;

    int idx = hash(key);
    HashEntry* curr = buckets_[idx];
    while (curr != nullptr) {
      if (curr->key == key) {
        ++curr->count;
        addLineNumberUnique(curr->lineNumbers, lineNumber);
        ++totalWordOccurrences_;
        return;
      }
      curr = curr->next;
    }

    HashEntry* newEntry = new HashEntry{key, 1, {lineNumber}, buckets_[idx]};
    buckets_[idx] = newEntry;
    ++uniqueKeyCount_;
    ++totalWordOccurrences_;
  }

  HashLookupResult get(const std::string& rawWord) const {
    std::string key = normalizeKey(rawWord);
    if (key.empty()) {
      return {false, "", 0, {}, -1, 0};
    }

    int idx = hash(key);
    HashEntry* curr = buckets_[idx];
    int steps = 0;

    while (curr != nullptr) {
      ++steps;
      if (curr->key == key) {
        return {true, key, curr->count, curr->lineNumbers, idx, steps};
      }
      curr = curr->next;
    }

    return {false, key, 0, {}, idx, steps};
  }

  void clear() {
    for (int i = 0; i < bucketCount_; ++i) {
      HashEntry* curr = buckets_[i];
      while (curr != nullptr) {
        HashEntry* next = curr->next;
        delete curr;
        curr = next;
      }
      buckets_[i] = nullptr;
    }
    uniqueKeyCount_ = 0;
    totalWordOccurrences_ = 0;
  }

  void rebuildFromLines(const std::vector<std::string>& lines) {
    clear();
    for (size_t lineIdx = 0; lineIdx < lines.size(); ++lineIdx) {
      const std::string& line = lines[lineIdx];
      int lineNumber = static_cast<int>(lineIdx) + 1;
      std::string token;

      for (size_t c = 0; c < line.size(); ++c) {
        if (isAlphaNumChar(line[c])) {
          token.push_back(line[c]);
        } else if (!token.empty()) {
          put(token, lineNumber);
          token.clear();
        }
      }
      if (!token.empty()) {
        put(token, lineNumber);
      }
    }
  }

  std::vector<HashBucketSnapshot> getBucketsSnapshot() const {
    std::vector<HashBucketSnapshot> result;
    result.reserve(bucketCount_);
    for (int i = 0; i < bucketCount_; ++i) {
      HashBucketSnapshot snap;
      snap.index = i;
      HashEntry* curr = buckets_[i];
      while (curr != nullptr) {
        snap.chain.push_back({curr->key, curr->count, curr->lineNumbers});
        curr = curr->next;
      }
      result.push_back(snap);
    }
    return result;
  }

  std::vector<WordFrequencyEntry> getTopWords(int limit = 8) const {
    std::vector<WordFrequencyEntry> all;
    for (int i = 0; i < bucketCount_; ++i) {
      HashEntry* curr = buckets_[i];
      while (curr != nullptr) {
        all.push_back({curr->key, curr->count, curr->lineNumbers, i});
        curr = curr->next;
      }
    }

    // Manual insertion sort descending by count, then alphabetical
    for (size_t i = 1; i < all.size(); ++i) {
      WordFrequencyEntry current = all[i];
      int j = static_cast<int>(i) - 1;
      while (j >= 0 &&
             (all[j].count < current.count ||
              (all[j].count == current.count && all[j].word > current.word))) {
        all[j + 1] = all[j];
        --j;
      }
      all[j + 1] = current;
    }

    if (static_cast<int>(all.size()) > limit) {
      all.resize(limit);
    }
    return all;
  }

  HashTableStats getStats() const {
    int collisions = 0;
    for (int i = 0; i < bucketCount_; ++i) {
      int chainLen = 0;
      HashEntry* curr = buckets_[i];
      while (curr != nullptr) {
        ++chainLen;
        curr = curr->next;
      }
      if (chainLen > 1) {
        collisions += chainLen - 1;
      }
    }
    double lf = std::round((static_cast<double>(uniqueKeyCount_) / bucketCount_) * 100.0) / 100.0;
    return {uniqueKeyCount_, totalWordOccurrences_, lf, collisions};
  }
};

inline WholeWordReplaceResult replaceWholeWordInLine(
    const std::string& line,
    const std::string& targetWord,
    const std::string& replacement) {
  std::string lowerTarget;
  for (size_t i = 0; i < targetWord.size(); ++i) {
    char ch = targetWord[i];
    lowerTarget.push_back((ch >= 'A' && ch <= 'Z') ? static_cast<char>(ch + 32) : ch);
  }
  if (lowerTarget.empty()) {
    return {line, 0};
  }

  auto toLowerStr = [](const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); ++i) {
      char ch = s[i];
      out.push_back((ch >= 'A' && ch <= 'Z') ? static_cast<char>(ch + 32) : ch);
    }
    return out;
  };

  auto isAlphaNum = [](char ch) {
    return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
  };

  std::string output;
  std::string token;
  int replacements = 0;

  for (size_t i = 0; i < line.size(); ++i) {
    char ch = line[i];
    if (isAlphaNum(ch)) {
      token.push_back(ch);
    } else {
      if (!token.empty()) {
        if (toLowerStr(token) == lowerTarget) {
          output += replacement;
          ++replacements;
        } else {
          output += token;
        }
        token.clear();
      }
      output.push_back(ch);
    }
  }

  if (!token.empty()) {
    if (toLowerStr(token) == lowerTarget) {
      output += replacement;
      ++replacements;
    } else {
      output += token;
    }
  }

  return {output, replacements};
}

} // namespace smart_dsa
