#pragma once

#include "types.hpp"
#include <cstdint>
#include <vector>

namespace smart_dsa {

struct HeapExtractResult {
  bool ok = false;
  TaskItem value{};
  bool underflow = false;
};

inline int64_t computeTaskHeapScore(PriorityLevel priority, int64_t deadlineTimestamp) {
  int64_t tierWeight = 1000000000LL;
  if (priority == PriorityLevel::HIGH) {
    tierWeight = 3000000000LL;
  } else if (priority == PriorityLevel::MEDIUM) {
    tierWeight = 2000000000LL;
  }
  int64_t normalizedTime = deadlineTimestamp / 60000LL;
  int64_t modTime = normalizedTime % 999999999LL;
  if (modTime < 0) modTime += 999999999LL;
  int64_t urgencyBonus = 999999999LL - modTime;
  if (urgencyBonus < 0) urgencyBonus = 0;
  return tierWeight + urgencyBonus;
}

/**
 * Manual Binary Max-Heap Priority Queue (HIGH > MEDIUM > LOW) with bubbleUp and sinkDown.
 */
class TaskMaxHeap {
private:
  TaskItem* heap_ = nullptr;
  int size_ = 0;
  int capacity_ = 8;

  void ensureCapacity() {
    if (size_ < capacity_) return;
    int newCap = capacity_ * 2;
    TaskItem* next = new TaskItem[newCap];
    for (int i = 0; i < size_; ++i) {
      next[i] = heap_[i];
    }
    delete[] heap_;
    heap_ = next;
    capacity_ = newCap;
  }

  static int parentIndex(int i) { return (i - 1) / 2; }
  static int leftIndex(int i) { return 2 * i + 1; }
  static int rightIndex(int i) { return 2 * i + 2; }

  void swapAt(int i, int j) {
    TaskItem tmp = heap_[i];
    heap_[i] = heap_[j];
    heap_[j] = tmp;
  }

  static bool isHigherPriority(const TaskItem& a, const TaskItem& b) {
    if (a.heapScore != b.heapScore) {
      return a.heapScore > b.heapScore;
    }
    return a.createdAt < b.createdAt;
  }

  void bubbleUp(int startIdx) {
    int idx = startIdx;
    while (idx > 0) {
      int pIdx = parentIndex(idx);
      if (isHigherPriority(heap_[idx], heap_[pIdx])) {
        swapAt(idx, pIdx);
        idx = pIdx;
      } else {
        break;
      }
    }
  }

  void sinkDown(int startIdx) {
    int idx = startIdx;
    while (true) {
      int left = leftIndex(idx);
      int right = rightIndex(idx);
      int largest = idx;

      if (left < size_ && isHigherPriority(heap_[left], heap_[largest])) {
        largest = left;
      }
      if (right < size_ && isHigherPriority(heap_[right], heap_[largest])) {
        largest = right;
      }

      if (largest != idx) {
        swapAt(idx, largest);
        idx = largest;
      } else {
        break;
      }
    }
  }

public:
  explicit TaskMaxHeap(int initialCapacity = 8)
      : capacity_(initialCapacity > 0 ? initialCapacity : 8) {
    heap_ = new TaskItem[capacity_];
  }

  ~TaskMaxHeap() {
    delete[] heap_;
    heap_ = nullptr;
  }

  TaskMaxHeap(const TaskMaxHeap&) = delete;
  TaskMaxHeap& operator=(const TaskMaxHeap&) = delete;

  int size() const { return size_; }
  bool isEmpty() const { return size_ == 0; }

  void insert(const TaskItem& task) {
    ensureCapacity();
    heap_[size_] = task;
    ++size_;
    bubbleUp(size_ - 1);
  }

  const TaskItem* peekMax() const {
    return (size_ > 0) ? &heap_[0] : nullptr;
  }

  HeapExtractResult extractMax() {
    if (size_ == 0) {
      return {false, TaskItem{}, true};
    }
    TaskItem maxItem = heap_[0];
    --size_;
    if (size_ > 0) {
      heap_[0] = heap_[size_];
      sinkDown(0);
    }
    return {true, maxItem, false};
  }

  bool removeById(const std::string& taskId) {
    int targetIdx = -1;
    for (int i = 0; i < size_; ++i) {
      if (heap_[i].id == taskId) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx == -1) return false;

    --size_;
    if (targetIdx == size_) {
      return true;
    }
    heap_[targetIdx] = heap_[size_];
    bubbleUp(targetIdx);
    sinkDown(targetIdx);
    return true;
  }

  std::vector<TaskItem> getHeapArray() const {
    std::vector<TaskItem> out;
    out.reserve(size_);
    for (int i = 0; i < size_; ++i) {
      out.push_back(heap_[i]);
    }
    return out;
  }

  std::vector<TaskItem> toPriorityOrderedArray() const {
    TaskMaxHeap tempHeap(capacity_);
    for (int i = 0; i < size_; ++i) {
      tempHeap.insert(heap_[i]);
    }
    std::vector<TaskItem> ordered;
    ordered.reserve(size_);
    while (!tempHeap.isEmpty()) {
      HeapExtractResult res = tempHeap.extractMax();
      if (res.ok) {
        ordered.push_back(res.value);
      }
    }
    return ordered;
  }

  void clear() {
    size_ = 0;
  }
};

} // namespace smart_dsa
