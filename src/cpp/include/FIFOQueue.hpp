#pragma once

#include "types.hpp"
#include <vector>

namespace smart_dsa {

struct QueueEnqueueResult {
  bool resized = false;
  int oldCapacity = 0;
  int newCapacity = 0;
};

struct QueueDequeueResult {
  bool ok = false;
  TaskItem value{};
  bool underflow = false;
};

/**
 * Manual Circular Buffer FIFO Queue with explicit front, rear, count, and capacity doubling.
 */
class TaskFIFOQueue {
private:
  TaskItem** buffer_ = nullptr;
  int frontIdx_ = 0;
  int rearIdx_ = 0;
  int count_ = 0;
  int capacity_ = 8;

  void allocateInitial(int initialCapacity) {
    capacity_ = initialCapacity > 0 ? initialCapacity : 8;
    buffer_ = new TaskItem*[capacity_];
    for (int i = 0; i < capacity_; ++i) {
      buffer_[i] = nullptr;
    }
    frontIdx_ = 0;
    rearIdx_ = 0;
    count_ = 0;
  }

  void resize(int newCapacity) {
    TaskItem** nextBuffer = new TaskItem*[newCapacity];
    for (int i = 0; i < newCapacity; ++i) {
      nextBuffer[i] = nullptr;
    }
    for (int i = 0; i < count_; ++i) {
      int physicalIdx = (frontIdx_ + i) % capacity_;
      nextBuffer[i] = buffer_[physicalIdx];
    }
    delete[] buffer_;
    buffer_ = nextBuffer;
    frontIdx_ = 0;
    rearIdx_ = count_;
    capacity_ = newCapacity;
  }

public:
  explicit TaskFIFOQueue(int initialCapacity = 8) {
    allocateInitial(initialCapacity);
  }

  ~TaskFIFOQueue() {
    clear(false);
    delete[] buffer_;
    buffer_ = nullptr;
  }

  TaskFIFOQueue(const TaskFIFOQueue&) = delete;
  TaskFIFOQueue& operator=(const TaskFIFOQueue&) = delete;

  int size() const { return count_; }
  int capacity() const { return capacity_; }
  int frontIndex() const { return frontIdx_; }
  int rearIndex() const { return rearIdx_; }
  bool isEmpty() const { return count_ == 0; }

  QueueEnqueueResult enqueue(const TaskItem& task) {
    int oldCap = capacity_;
    bool resized = false;
    if (count_ == capacity_) {
      resize(capacity_ * 2);
      resized = true;
    }

    buffer_[rearIdx_] = new TaskItem(task);
    rearIdx_ = (rearIdx_ + 1) % capacity_;
    ++count_;
    return {resized, oldCap, capacity_};
  }

  QueueDequeueResult dequeue() {
    if (count_ == 0) {
      return {false, TaskItem{}, true};
    }

    TaskItem* itemPtr = buffer_[frontIdx_];
    buffer_[frontIdx_] = nullptr;
    frontIdx_ = (frontIdx_ + 1) % capacity_;
    --count_;

    if (count_ == 0) {
      frontIdx_ = 0;
      rearIdx_ = 0;
    }

    if (itemPtr == nullptr) {
      return {false, TaskItem{}, true};
    }
    TaskItem value = *itemPtr;
    delete itemPtr;
    return {true, value, false};
  }

  const TaskItem* peek() const {
    if (count_ == 0) return nullptr;
    return buffer_[frontIdx_];
  }

  bool removeById(const std::string& taskId) {
    if (count_ == 0) return false;

    std::vector<TaskItem*> kept;
    kept.reserve(count_);
    bool removed = false;

    for (int i = 0; i < count_; ++i) {
      int idx = (frontIdx_ + i) % capacity_;
      TaskItem* item = buffer_[idx];
      if (item != nullptr) {
        if (!removed && item->id == taskId) {
          delete item;
          removed = true;
        } else {
          kept.push_back(item);
        }
      }
    }

    if (!removed) return false;

    for (int i = 0; i < capacity_; ++i) {
      buffer_[i] = (i < static_cast<int>(kept.size())) ? kept[i] : nullptr;
    }
    frontIdx_ = 0;
    count_ = static_cast<int>(kept.size());
    rearIdx_ = count_ % capacity_;
    return true;
  }

  std::vector<TaskItem> toArray() const {
    std::vector<TaskItem> out;
    out.reserve(count_);
    for (int i = 0; i < count_; ++i) {
      int idx = (frontIdx_ + i) % capacity_;
      if (buffer_[idx] != nullptr) {
        out.push_back(*buffer_[idx]);
      }
    }
    return out;
  }

  void clear(bool resetBuffer = true) {
    for (int i = 0; i < capacity_; ++i) {
      delete buffer_[i];
      buffer_[i] = nullptr;
    }
    frontIdx_ = 0;
    rearIdx_ = 0;
    count_ = 0;

    if (resetBuffer) {
      delete[] buffer_;
      allocateInitial(8);
    }
  }
};

} // namespace smart_dsa
