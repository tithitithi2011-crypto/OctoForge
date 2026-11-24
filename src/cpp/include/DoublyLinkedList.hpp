#pragma once

#include "types.hpp"
#include <string>
#include <vector>

namespace smart_dsa {

struct LineNode {
  std::string id;
  LineNode* prev = nullptr;
  std::string lineText;
  int lineNumber = 0;
  LineNode* next = nullptr;
};

struct DLLDeleteResult {
  bool ok = false;
  std::string deletedText;
  int nextFocusLine = 0;
};

struct DLLSwapResult {
  bool ok = false;
  int newLineNumber = 0;
};

/**
 * Manual Doubly Linked List managing editor lines with prev/next pointer traversal & swapping.
 */
class DocumentLinkedList {
private:
  LineNode* head_ = nullptr;
  LineNode* tail_ = nullptr;
  int length_ = 0;
  int nextIdCounter_ = 1;

  LineNode* createNode(const std::string& text, int lineNumber) {
    LineNode* node = new LineNode();
    node->id = "node-" + std::to_string(nextIdCounter_++);
    node->lineText = text;
    node->lineNumber = lineNumber;
    return node;
  }

  void renumberFrom(LineNode* startNode, int startNumber) {
    LineNode* curr = startNode;
    int num = startNumber;
    while (curr != nullptr) {
      curr->lineNumber = num++;
      curr = curr->next;
    }
  }

public:
  DocumentLinkedList() = default;

  ~DocumentLinkedList() {
    clear();
  }

  DocumentLinkedList(const DocumentLinkedList&) = delete;
  DocumentLinkedList& operator=(const DocumentLinkedList&) = delete;

  LineNode* head() const { return head_; }
  LineNode* tail() const { return tail_; }
  int length() const { return length_; }
  bool isEmpty() const { return length_ == 0; }

  LineNode* getNodeAt(int lineNumber) const {
    if (lineNumber < 1 || lineNumber > length_) {
      return nullptr;
    }
    if (lineNumber <= length_ / 2) {
      LineNode* curr = head_;
      while (curr != nullptr) {
        if (curr->lineNumber == lineNumber) return curr;
        curr = curr->next;
      }
    } else {
      LineNode* curr = tail_;
      while (curr != nullptr) {
        if (curr->lineNumber == lineNumber) return curr;
        curr = curr->prev;
      }
    }
    return nullptr;
  }

  LineNode* insertAtEnd(const std::string& lineText) {
    LineNode* newNode = createNode(lineText, length_ + 1);
    if (tail_ == nullptr) {
      head_ = newNode;
      tail_ = newNode;
    } else {
      newNode->prev = tail_;
      tail_->next = newNode;
      tail_ = newNode;
    }
    ++length_;
    return newNode;
  }

  LineNode* insertAt(int lineNumber, const std::string& lineText) {
    if (lineNumber <= 1 || head_ == nullptr) {
      LineNode* newNode = createNode(lineText, 1);
      if (head_ == nullptr) {
        head_ = newNode;
        tail_ = newNode;
      } else {
        newNode->next = head_;
        head_->prev = newNode;
        head_ = newNode;
      }
      ++length_;
      renumberFrom(head_, 1);
      return newNode;
    }

    if (lineNumber > length_) {
      return insertAtEnd(lineText);
    }

    LineNode* target = getNodeAt(lineNumber);
    if (target == nullptr) {
      return insertAtEnd(lineText);
    }

    LineNode* newNode = createNode(lineText, lineNumber);
    LineNode* prevNode = target->prev;

    newNode->prev = prevNode;
    newNode->next = target;
    target->prev = newNode;
    if (prevNode != nullptr) {
      prevNode->next = newNode;
    } else {
      head_ = newNode;
    }

    ++length_;
    renumberFrom(newNode, lineNumber);
    return newNode;
  }

  bool updateLine(int lineNumber, const std::string& newText, std::string& outPrevText) {
    LineNode* node = getNodeAt(lineNumber);
    if (node == nullptr) {
      return false;
    }
    outPrevText = node->lineText;
    node->lineText = newText;
    return true;
  }

  DLLDeleteResult deleteLine(int lineNumber) {
    if (length_ == 0) {
      return {false, "", 0};
    }
    LineNode* target = getNodeAt(lineNumber);
    if (target == nullptr) {
      return {false, "", 1};
    }

    std::string deletedText = target->lineText;
    LineNode* prevNode = target->prev;
    LineNode* nextNode = target->next;

    if (prevNode != nullptr) {
      prevNode->next = nextNode;
    } else {
      head_ = nextNode;
    }

    if (nextNode != nullptr) {
      nextNode->prev = prevNode;
    } else {
      tail_ = prevNode;
    }

    delete target;
    --length_;

    if (nextNode != nullptr) {
      renumberFrom(nextNode, lineNumber);
    }

    int nextFocus = (length_ == 0) ? 0 : (lineNumber > length_ ? length_ : lineNumber);
    return {true, deletedText, nextFocus};
  }

  LineNode* movePrev(int currentLineNumber) const {
    LineNode* curr = getNodeAt(currentLineNumber);
    return (curr != nullptr) ? curr->prev : nullptr;
  }

  LineNode* moveNext(int currentLineNumber) const {
    LineNode* curr = getNodeAt(currentLineNumber);
    return (curr != nullptr) ? curr->next : nullptr;
  }

  DLLSwapResult swapWithPrev(int lineNumber) {
    LineNode* node = getNodeAt(lineNumber);
    if (node == nullptr || node->prev == nullptr) {
      return {false, lineNumber};
    }

    LineNode* prevNode = node->prev;
    LineNode* beforePrev = prevNode->prev;
    LineNode* afterNode = node->next;

    if (beforePrev != nullptr) {
      beforePrev->next = node;
    } else {
      head_ = node;
    }

    if (afterNode != nullptr) {
      afterNode->prev = prevNode;
    } else {
      tail_ = prevNode;
    }

    node->prev = beforePrev;
    node->next = prevNode;
    prevNode->prev = node;
    prevNode->next = afterNode;

    renumberFrom(node, lineNumber - 1);
    return {true, node->lineNumber};
  }

  DLLSwapResult swapWithNext(int lineNumber) {
    LineNode* node = getNodeAt(lineNumber);
    if (node == nullptr || node->next == nullptr) {
      return {false, lineNumber};
    }
    DLLSwapResult res = swapWithPrev(node->next->lineNumber);
    return {res.ok, node->lineNumber};
  }

  void replaceLinesFromArray(const std::vector<std::string>& lines) {
    clear();
    for (size_t i = 0; i < lines.size(); ++i) {
      insertAtEnd(lines[i]);
    }
  }

  void clear() {
    LineNode* curr = head_;
    while (curr != nullptr) {
      LineNode* next = curr->next;
      delete curr;
      curr = next;
    }
    head_ = nullptr;
    tail_ = nullptr;
    length_ = 0;
  }

  std::vector<std::string> toTextArray() const {
    std::vector<std::string> out;
    out.reserve(length_);
    LineNode* curr = head_;
    while (curr != nullptr) {
      out.push_back(curr->lineText);
      curr = curr->next;
    }
    return out;
  }

  std::vector<DLLNodeSnapshot> getSnapshot() const {
    std::vector<DLLNodeSnapshot> out;
    out.reserve(length_);
    LineNode* curr = head_;
    while (curr != nullptr) {
      DLLNodeSnapshot snap;
      snap.id = curr->id;
      snap.lineNumber = curr->lineNumber;
      snap.lineText = curr->lineText;
      snap.prevLineNumber = (curr->prev != nullptr) ? curr->prev->lineNumber : -1;
      snap.nextLineNumber = (curr->next != nullptr) ? curr->next->lineNumber : -1;
      out.push_back(snap);
      curr = curr->next;
    }
    return out;
  }
};

} // namespace smart_dsa
