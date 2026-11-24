#pragma once

#include "types.hpp"
#include <vector>

namespace smart_dsa {

template <typename T>
struct StackNode {
  T value;
  StackNode<T>* below = nullptr;
};

template <typename T>
struct StackPopResult {
  bool ok = false;
  T value{};
  bool underflow = false;
};

/**
 * Manual Linked-Node Stack (LIFO) with explicit underflow handling.
 */
template <typename T>
class ManualStack {
private:
  StackNode<T>* topNode_ = nullptr;
  int count_ = 0;

public:
  ManualStack() = default;

  ~ManualStack() {
    clear();
  }

  ManualStack(const ManualStack&) = delete;
  ManualStack& operator=(const ManualStack&) = delete;

  int push(const T& item) {
    StackNode<T>* node = new StackNode<T>{item, topNode_};
    topNode_ = node;
    ++count_;
    return count_;
  }

  StackPopResult<T> pop() {
    if (topNode_ == nullptr) {
      return {false, T{}, true};
    }
    StackNode<T>* victim = topNode_;
    T popped = victim->value;
    topNode_ = victim->below;
    delete victim;
    --count_;
    return {true, popped, false};
  }

  const T* peek() const {
    return (topNode_ != nullptr) ? &(topNode_->value) : nullptr;
  }

  bool isEmpty() const { return count_ == 0; }
  int size() const { return count_; }

  void clear() {
    StackNode<T>* curr = topNode_;
    while (curr != nullptr) {
      StackNode<T>* next = curr->below;
      delete curr;
      curr = next;
    }
    topNode_ = nullptr;
    count_ = 0;
  }

  std::vector<T> getFrames() const {
    std::vector<T> frames;
    frames.reserve(count_);
    StackNode<T>* curr = topNode_;
    while (curr != nullptr) {
      frames.push_back(curr->value);
      curr = curr->below;
    }
    return frames;
  }
};

using UndoStack = ManualStack<EditorCommand>;
using RedoStack = ManualStack<EditorCommand>;

} // namespace smart_dsa
